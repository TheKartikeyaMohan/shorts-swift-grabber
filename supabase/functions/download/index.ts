
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function extractVideoId(url: string): string | null {
  // Match YouTube Shorts URLs
  const regex = /(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

serve(async (req: Request) => {
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
      throw new Error("RAPIDAPI_KEY is not set");
    }

    // Parse request body
    const { videoUrl, format } = await req.json();
    
    // Validate format
    if (!format || !["mp3", "mp4"].includes(format)) {
      throw new Error("Invalid format. Must be mp3 or mp4");
    }
    
    // Extract video ID
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error("Could not extract YouTube video ID from URL");
    }

    // Get client IP for logging
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    
    // Build the RapidAPI endpoint
    const apiUrl = `https://youtube-video-and-shorts-downloader.p.rapidapi.com/download.php?id=${videoId}`;
    
    console.log(`Calling RapidAPI endpoint: ${apiUrl}`);
    
    // Call the RapidAPI endpoint
    const rapidApiResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "youtube-video-and-shorts-downloader.p.rapidapi.com"
      }
    });

    if (!rapidApiResponse.ok) {
      const errorData = await rapidApiResponse.text();
      console.error("RapidAPI error:", errorData);
      throw new Error(`RapidAPI request failed with status: ${rapidApiResponse.status}`);
    }

    const data = await rapidApiResponse.json();
    
    // Extract download link from the response based on format
    let downloadUrl;
    let selectedFormat;
    
    if (format === "mp3") {
      // Find audio formats
      const audioFormats = data.formats.filter((f: any) => 
        (f.ext === "mp3" || f.ext === "m4a") && f.url
      );
      
      if (audioFormats.length > 0) {
        // Sort by filesize (higher quality first) if available
        if (audioFormats[0].filesize) {
          audioFormats.sort((a: any, b: any) => 
            (b.filesize || 0) - (a.filesize || 0)
          );
        }
        selectedFormat = audioFormats[0];
        downloadUrl = selectedFormat.url;
      }
    } else {
      // Find video formats (MP4)
      const videoFormats = data.formats.filter((f: any) => 
        f.ext === "mp4" && f.url && f.resolution
      );
      
      if (videoFormats.length > 0) {
        // Sort by resolution
        videoFormats.sort((a: any, b: any) => {
          const getResValue = (res: string) => {
            const match = res.match(/(\d+)p/);
            return match ? parseInt(match[1]) : 0;
          };
          return getResValue(b.resolution) - getResValue(a.resolution);
        });
        
        // Get highest resolution
        selectedFormat = videoFormats[0];
        downloadUrl = selectedFormat.url;
      }
    }

    if (!downloadUrl) {
      throw new Error("No download link found in the API response");
    }
    
    // Log successful download to Supabase
    await supabase.from("downloads").insert({
      video_url: videoUrl,
      download_url: downloadUrl,
      format: format,
      status: "success",
      ip_address: clientIp
    });

    console.log(`Download successful: ${format} for video ID ${videoId}`);
    
    // Return successful response with download URL
    return new Response(
      JSON.stringify({ 
        downloadUrl: downloadUrl,
        format: format,
        quality: format === "mp4" ? (selectedFormat?.resolution || "720p") : "high",
        title: data.title || `YouTube-${videoId}`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing request:", error.message);
    
    // Try to log error to Supabase if we have the URL
    try {
      const { videoUrl, format } = await req.json();
      if (videoUrl) {
        await supabase.from("downloads").insert({
          video_url: videoUrl,
          format: format || "unknown",
          status: "error",
          error_message: error.message,
          ip_address: req.headers.get("x-forwarded-for") || "unknown"
        });
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
