
// Download YouTube Shorts Edge Function
// This function uses a YouTube downloader API to handle video downloads
// and returns the download URL to the client

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface RequestBody {
  url: string;
  format: string;
  quality?: string;
  getDirectLink?: boolean;
}

// Set up CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Create Supabase client for logging operations
const createSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase environment variables are not set");
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

// Log download operations to Supabase
const logToSupabase = async (data: any) => {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    
    const { error } = await supabase
      .from("downloads")
      .insert([data]);
      
    if (error) {
      console.error("Error logging to Supabase:", error);
    }
  } catch (error) {
    console.error("Failed to log to Supabase:", error);
  }
};

// Validate YouTube URL
const isValidYouTubeUrl = (url: string): boolean => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(shorts\/|watch\?v=)|youtu\.be\/).+/i;
  return youtubeRegex.test(url.trim());
};

// Standardize YouTube URL format
const standardizeYouTubeUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
};

// Extract video ID from YouTube URL
const extractVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Main function to handle requests
serve(async (req) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Ensure this is a POST request
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { url, format, getDirectLink } = body;
    let { quality } = body;
    
    // Input validation
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!format || !["mp4", "mp3"].includes(format)) {
      return new Response(
        JSON.stringify({ error: "Valid format (mp4 or mp3) is required" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate YouTube URL
    if (!isValidYouTubeUrl(url)) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Standardize URL and log client IP
    const standardUrl = standardizeYouTubeUrl(url.trim());
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    const videoId = extractVideoId(standardUrl);
    
    // Set default quality if not provided
    if (!quality) {
      quality = format === "mp4" ? "720p" : "high";
    }
    
    console.log(`Processing ${format} download for: ${standardUrl}, quality: ${quality}, getDirectLink: ${getDirectLink}`);
    
    // Get RapidAPI key from environment
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      console.error("RAPIDAPI_KEY not found in environment");
      
      await logToSupabase({
        video_url: standardUrl,
        status: "error",
        format,
        error_message: "RAPIDAPI_KEY not set",
        ip_address: clientIP,
      });
      
      return new Response(
        JSON.stringify({ error: "API configuration error: RAPIDAPI_KEY not set" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Use Y2Mate API for more reliable direct download links
    const apiUrl = "https://y2mate-api.onrender.com/api/convert";
    console.log(`Calling Y2Mate API with video ID: ${videoId}`);
    
    try {
      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: standardUrl,
          quality: quality === "720p" ? "720" : quality === "480p" ? "480" : "360",
          format: format === "mp3" ? "mp3" : "mp4"
        }),
      });

      // Handle API errors
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`Y2Mate API error (${apiResponse.status}): ${errorText}`);
        
        // Fallback to RapidAPI
        console.log("Falling back to RapidAPI...");
        return await useRapidAPIFallback(rapidApiKey, standardUrl, format, quality || "", clientIP, corsHeaders);
      }

      // Parse API response
      const data = await apiResponse.json();
      console.log("Y2Mate API Response:", data);
      
      if (!data || !data.url) {
        console.error("Invalid Y2Mate API response:", data);
        
        // Fallback to RapidAPI if no download URL
        console.log("No direct URL in Y2Mate response, falling back to RapidAPI...");
        return await useRapidAPIFallback(rapidApiKey, standardUrl, format, quality || "", clientIP, corsHeaders);
      }

      // Y2Mate API returns direct download URLs
      const directUrl = data.url;
      
      // Test if the URL is actually accessible
      try {
        const testResponse = await fetch(directUrl, { 
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!testResponse.ok) {
          console.error(`Direct URL test failed: ${testResponse.status}`);
          // Fallback to RapidAPI if URL test fails
          return await useRapidAPIFallback(rapidApiKey, standardUrl, format, quality || "", clientIP, corsHeaders);
        }
        
        console.log("Direct URL test successful!");
      } catch (testError) {
        console.error("Error testing direct URL:", testError);
        // Continue anyway as some servers might block HEAD requests
      }

      // Prepare success response with download URLs
      const result = {
        title: data.title || "YouTube Video",
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: data.duration || "",
        author: data.channel || "",
        downloadUrl: directUrl,
        directUrl: directUrl, // Same as downloadUrl since it's already direct
        quality: quality || "",
        format,
        isAudio: format === "mp3",
      };

      console.log("Successful response with URLs:");
      console.log("- directUrl sample:", directUrl.substring(0, 50) + "...");

      // Log successful download to Supabase
      await logToSupabase({
        video_url: standardUrl,
        download_url: directUrl.substring(0, 100) + "...", // Only log part of URL for privacy
        status: "success",
        format,
        quality: quality || "",
        ip_address: clientIP,
      });

      // Return successful response with the URLs
      return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
    } catch (apiError) {
      console.error("Y2Mate API request error:", apiError);
      
      // Fallback to RapidAPI
      console.log("Error with Y2Mate API, falling back to RapidAPI...");
      return await useRapidAPIFallback(rapidApiKey, standardUrl, format, quality || "", clientIP, corsHeaders);
    }
  } catch (error) {
    console.error("Edge function error:", error);
    
    // Attempt to log error
    try {
      await logToSupabase({
        status: "error",
        error_message: `Edge function error: ${error.message || "Unknown error"}`,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// Function to use RapidAPI as fallback
async function useRapidAPIFallback(apiKey: string, url: string, format: string, quality: string, clientIP: string, corsHeaders: any) {
  const queryUrl = `https://youtube-video-and-shorts-downloader.p.rapidapi.com/api/convert`;
  console.log(`Calling RapidAPI with URL: ${url}`);
  
  try {
    const apiResponse = await fetch(queryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "youtube-video-and-shorts-downloader.p.rapidapi.com",
      },
      body: JSON.stringify({
        url: url,
        quality: quality === "720p" ? "720" : quality === "480p" ? "480" : "360",
        format: format
      })
    });

    // Handle API errors
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`RapidAPI error (${apiResponse.status}): ${errorText}`);
      
      await logToSupabase({
        video_url: url,
        status: "error",
        format,
        error_message: `API error: ${apiResponse.status} - ${errorText}`,
        ip_address: clientIP,
      });
      
      return new Response(
        JSON.stringify({ error: `API error: ${apiResponse.status} - ${errorText}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse API response
    const data = await apiResponse.json();
    console.log("RapidAPI Response:", data);
    
    if (!data || !data.url) {
      console.error("Invalid RapidAPI response:", data);
      
      await logToSupabase({
        video_url: url,
        status: "error",
        format,
        error_message: "Invalid API response format",
        ip_address: clientIP,
      });
      
      return new Response(
        JSON.stringify({ error: "Invalid API response" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Extract direct download URL
    const directUrl = data.url;
    const videoId = extractVideoId(url);
    
    // Prepare success response
    const result = {
      title: data.title || "YouTube Video",
      thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: data.duration || "",
      author: data.channel || "",
      downloadUrl: directUrl,
      directUrl: directUrl,
      quality: quality,
      format,
      isAudio: format === "mp3",
    };

    console.log("Successful response with RapidAPI URLs:");
    console.log("- directUrl sample:", directUrl.substring(0, 50) + "...");

    // Log successful download to Supabase
    await logToSupabase({
      video_url: url,
      download_url: directUrl.substring(0, 100) + "...",
      status: "success",
      format,
      quality,
      ip_address: clientIP,
    });

    // Return successful response with the URLs
    return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("RapidAPI request error:", error);
      
    await logToSupabase({
      video_url: url,
      status: "error",
      format,
      error_message: `RapidAPI error: ${error.message || "Unknown error"}`,
      ip_address: clientIP,
    });
    
    return new Response(
      JSON.stringify({ error: "API request failed", details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
