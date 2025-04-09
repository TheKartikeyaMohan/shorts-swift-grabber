import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set CORS headers for the preflight request
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://yqkiwxlxmxrxyxekspht.supabase.co";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxa2l3eGx4bXhyeHl4ZWtzcGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTI1MjMsImV4cCI6MjA1OTc2ODUyM30.CaPAj_p6zsR6afXL2keNy9E2vN9o7uvhS-f0MFx-9Xc";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const isValidYoutubeUrl = (url: string): boolean => {
  return (
    url.includes("youtube.com/shorts/") || 
    url.includes("youtu.be/") ||
    url.includes("youtube.com/watch")
  );
};

// Helper function to determine if a format is audio only
function isAudioFormat(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

// Helper function to extract resolution from quality string
function getResolutionValue(quality: string): number {
  if (quality.includes('1080')) return 1080;
  if (quality.includes('720')) return 720;
  if (quality.includes('480')) return 480;
  if (quality.includes('360')) return 360;
  if (quality.includes('240')) return 240;
  if (quality.includes('144')) return 144;
  return 0;
}

// Helper function to select the best format based on user preference
function selectBestFormat(results: any[], requestFormat: string): any {
  if (!results || results.length === 0) {
    return null;
  }

  if (requestFormat === "mp3") {
    // Looking for best audio quality
    const audioFormats = results.filter(result => isAudioFormat(result.mime));
    if (audioFormats.length === 0) return results[0];
    
    // Prefer MP3 if available, otherwise take any audio format
    const mp3Format = audioFormats.find(format => format.mime.includes('mp3'));
    return mp3Format || audioFormats[0];
  } else {
    // Looking for video with preferred resolution for MP4
    // First filter by mime type to get the right container format
    const videoFormats = results.filter(result => 
      result.mime.includes('mp4') && !isAudioFormat(result.mime)
    );
    
    if (videoFormats.length === 0) {
      // Fallback to any format if no MP4 available
      return results.find(result => !isAudioFormat(result.mime)) || results[0];
    }

    // Sort by resolution, prefer: 720p > 480p > 360p
    const sortedFormats = videoFormats.sort((a, b) => {
      const resA = getResolutionValue(a.quality);
      const resB = getResolutionValue(b.quality);
      
      // Prefer exactly 720p
      if (resA === 720 && resB !== 720) return -1;
      if (resB === 720 && resA !== 720) return 1;
      
      // Otherwise, get as close to 720p as possible without going over
      if (resA <= 720 && resB > 720) return -1;
      if (resB <= 720 && resA > 720) return 1;
      
      // Both are either under or over 720p, choose the higher one
      return resB - resA;
    });

    return sortedFormats[0];
  }
}

serve(async (req: Request) => {
  console.log("Function invoked:", new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Get RapidAPI key
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    
    if (!RAPIDAPI_KEY) {
      throw new Error("RAPIDAPI_KEY is not set in environment variables");
    }

    // Parse request body
    const reqBody = await req.json();
    const url = reqBody.url;
    const requestedFormat = reqBody.format || "mp4";
    
    // Validate URL format
    if (!url || !isValidYoutubeUrl(url)) {
      throw new Error("Invalid YouTube URL");
    }

    // Get client IP for logging
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    // Call the RapidAPI YouTube downloader
    console.log(`Fetching video data from RapidAPI for format: ${requestedFormat}`);
    
    // API endpoint for YouTube video and shorts downloader
    const apiUrl = "https://youtube-video-and-shorts-downloader.p.rapidapi.com/download";
    
    // Construct proper query parameters
    const downloadUrl = new URL(apiUrl);
    downloadUrl.searchParams.append("id", url);

    // Make the API request
    const apiResponse = await fetch(downloadUrl.toString(), {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "youtube-video-and-shorts-downloader.p.rapidapi.com"
      }
    });

    console.log("API response status:", apiResponse.status);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("API error response:", errorText);
      throw new Error(`API error: ${apiResponse.status} - ${errorText}`);
    }

    const data = await apiResponse.json();

    // Check if we have valid data in the expected format
    if (!data || !data.status || data.status !== "ok" || !data.results || !data.results.length) {
      console.error("Invalid API response format:", JSON.stringify(data));
      throw new Error("Download link not found in API response");
    }

    // Select the best format based on user preference
    const downloadFormat = selectBestFormat(data.results, requestedFormat);
    
    if (!downloadFormat || !downloadFormat.url) {
      throw new Error("No suitable download format found");
    }

    // Prepare video data to return
    const videoData = {
      downloadUrl: downloadFormat.url,
      title: data.title || "YouTube Video",
      thumbnail: data.thumbnail || "",
      duration: data.duration || "",
      author: data.author || "",
      quality: downloadFormat.quality || "",
      format: downloadFormat.mime.split('/')[1] || "",
      isAudio: isAudioFormat(downloadFormat.mime)
    };

    // Log successful download to Supabase
    const { error: dbError } = await supabase.from("downloads").insert({
      video_url: url,
      download_url: videoData.downloadUrl,
      status: "success",
      format: requestedFormat,
      ip_address: clientIp
    });

    if (dbError) {
      console.error("Error logging to database:", dbError);
    }

    console.log("Download successful:", videoData.title);
    
    // Return successful response with video data
    return new Response(
      JSON.stringify(videoData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing request:", error.message);
    
    // Try to log error to Supabase
    try {
      const reqJson = await req.json().catch(() => ({}));
      const url = reqJson.url;
      
      if (url) {
        // Log error to Supabase
        const { error: dbError } = await supabase.from("downloads").insert({
          video_url: url,
          status: "error",
          error_message: error.message,
          ip_address: req.headers.get("x-forwarded-for") || "unknown",
          format: reqJson.format || "unknown"
        });
        
        if (dbError) {
          console.error("Error logging to database:", dbError);
        }
      }
    } catch (logError) {
      console.error("Error logging to Supabase:", logError);
    }

    // Return error response
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to process video" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
