
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
    url.includes("youtu.be/")
  );
};

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
    const { url } = await req.json();
    
    // Validate URL format
    if (!url || !isValidYoutubeUrl(url)) {
      throw new Error("Invalid YouTube Shorts URL");
    }

    // Get client IP for logging
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    // Call the RapidAPI YouTube downloader
    console.log("Fetching video data for:", url);
    const apiResponse = await fetch("https://youtube-video-download-v2.p.rapidapi.com/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "youtube-video-download-v2.p.rapidapi.com",
      },
      body: JSON.stringify({ videoUrl: url }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error("API error:", errorData);
      throw new Error(`API error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();

    // Check if we have valid data
    if (!data || !data.video || !data.video.url) {
      throw new Error("Download link not found in API response");
    }

    // Video data to return
    const videoData = {
      downloadUrl: data.video.url,
      title: data.video.title || "YouTube Video",
      thumbnail: data.video.thumbnail || "",
      duration: data.video.duration || "",
      author: data.video.author || ""
    };

    // Log successful download to Supabase
    await supabase.from("downloads").insert({
      video_url: url,
      download_url: videoData.downloadUrl,
      status: "success",
      ip_address: clientIp
    });

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
      const { url } = await req.json();
      if (url) {
        // Log error to Supabase
        await supabase.from("downloads").insert({
          video_url: url,
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
