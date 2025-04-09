
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

serve(async (req: Request) => {
  console.log("Function invoked:", new Date().toISOString());
  console.log("Checking environment variables:");
  console.log("SUPABASE_URL:", Deno.env.get("SUPABASE_URL") ? "Set" : "Not set");
  console.log("SUPABASE_ANON_KEY:", Deno.env.get("SUPABASE_ANON_KEY") ? "Set" : "Not set");
  console.log("RAPIDAPI_KEY:", Deno.env.get("RAPIDAPI_KEY") ? "Set" : "Not set");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Get RapidAPI key
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    console.log("RAPIDAPI_KEY availability:", RAPIDAPI_KEY ? "Present" : "Missing");
    
    if (!RAPIDAPI_KEY) {
      throw new Error("RAPIDAPI_KEY is not set in environment variables");
    }

    // Parse request body
    const reqBody = await req.text();
    console.log("Request body:", reqBody);
    
    let url;
    try {
      const json = JSON.parse(reqBody);
      url = json.url;
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      throw new Error("Invalid request format: " + parseError.message);
    }
    
    console.log("Processing URL:", url);
    
    // Validate URL format
    if (!url || !isValidYoutubeUrl(url)) {
      throw new Error("Invalid YouTube URL");
    }

    // Get client IP for logging
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    console.log("Client IP:", clientIp);

    // Log headers for debugging
    console.log("Request headers:");
    for (const [key, value] of req.headers.entries()) {
      console.log(`${key}: ${value}`);
    }

    // Call the NEW RapidAPI YouTube downloader
    console.log("Fetching video data from RapidAPI");
    console.log("RapidAPI URL: https://youtube-video-and-shorts-downloader.p.rapidapi.com/download");
    
    // Prepare the correct endpoint and parameters
    const downloadUrl = new URL("https://youtube-video-and-shorts-downloader.p.rapidapi.com/download");
    downloadUrl.searchParams.append("id", url);

    const apiResponse = await fetch(downloadUrl.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-host": "youtube-video-and-shorts-downloader.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY
      }
    });

    console.log("API response status:", apiResponse.status);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("API error response:", errorText);
      throw new Error(`API error: ${apiResponse.status} - ${errorText}`);
    }

    const data = await apiResponse.json();
    console.log("API data received:", JSON.stringify(data).substring(0, 200) + "...");

    // Check if we have valid data
    if (!data || !data.status || data.status !== "ok" || !data.results) {
      console.error("Invalid API response format:", JSON.stringify(data));
      throw new Error("Download link not found in API response");
    }

    // Extract the appropriate video format - prefer high quality MP4 if available
    let downloadFormat = null;
    
    // First try to find 720P MP4 video
    downloadFormat = data.results.find(result => 
      result.mime === "video/mp4" && result.quality === "720P60"
    );
    
    // If not found, try 480P
    if (!downloadFormat) {
      downloadFormat = data.results.find(result => 
        result.mime === "video/mp4" && result.quality === "480P"
      );
    }
    
    // If still not found, try 360P
    if (!downloadFormat) {
      downloadFormat = data.results.find(result => 
        result.mime === "video/mp4" && result.quality === "360P"
      );
    }
    
    // If no video format found, use audio format
    if (!downloadFormat) {
      downloadFormat = data.results.find(result => 
        result.mime.includes("audio") && result.has_audio
      );
    }
    
    // If still no format found, just use the first result
    if (!downloadFormat && data.results.length > 0) {
      downloadFormat = data.results[0];
    }
    
    if (!downloadFormat || !downloadFormat.url) {
      throw new Error("No suitable download format found");
    }

    // Video data to return
    const videoData = {
      downloadUrl: downloadFormat.url,
      title: data.title || "YouTube Video",
      thumbnail: data.thumbnail || "",
      duration: data.duration || "",
      author: data.author || "",
      quality: downloadFormat.quality || "",
      format: downloadFormat.mime.split('/')[1] || ""
    };

    // Log successful download to Supabase
    const { error: dbError } = await supabase.from("downloads").insert({
      video_url: url,
      download_url: videoData.downloadUrl,
      status: "success",
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
    
    // If we have the URL from the request, log the error
    try {
      const reqBody = await req.text();
      const { url } = JSON.parse(reqBody);
      if (url) {
        // Log error to Supabase
        const { error: dbError } = await supabase.from("downloads").insert({
          video_url: url,
          status: "error",
          error_message: error.message,
          ip_address: req.headers.get("x-forwarded-for") || "unknown"
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
