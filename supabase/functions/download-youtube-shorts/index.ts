
// Download YouTube Shorts Edge Function
// This function uses RapidAPI to handle YouTube video downloads
// and returns the download URL to the client

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface RequestBody {
  url: string;
  format: string;
  quality?: string;
}

interface VideoFormats {
  [key: string]: {
    url: string;
    quality: string;
  }[];
}

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
  // Regex for various YouTube URL formats including shorts and regular videos
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(shorts\/|watch\?v=)|youtu\.be\/).+/i;
  return youtubeRegex.test(url.trim());
};

// Standardize YouTube URL format
const standardizeYouTubeUrl = (url: string): string => {
  // Ensure it has proper protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
};

// Helper to extract video ID from YouTube URL
const extractVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Main function to handle requests
serve(async (req) => {
  // Set up CORS headers for cross-origin requests
  const corsHeaders = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  });

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
    const { url, format } = body;
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
    
    console.log(`Processing ${format} download for: ${standardUrl}, quality: ${quality}`);
    
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

    // Make request to RapidAPI - UPDATED ENDPOINT
    const apiUrl = "https://youtube-video-and-shorts-downloader.p.rapidapi.com/links";
    
    try {
      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": "youtube-video-and-shorts-downloader.p.rapidapi.com",
        },
        body: JSON.stringify({ url: standardUrl }),
      });

      // Handle API errors
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`RapidAPI error (${apiResponse.status}): ${errorText}`);
        
        await logToSupabase({
          video_url: standardUrl,
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
      console.log("API Response:", JSON.stringify(data, null, 2));
      
      if (!data || !data.formats) {
        console.error("Invalid API response:", data);
        
        await logToSupabase({
          video_url: standardUrl,
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

      console.log("Received formats:", Object.keys(data.formats));
      
      // Process formats based on requested format type
      let downloadUrl = "";
      let selectedQuality = "";
      const isAudio = format === "mp3";
      
      if (isAudio) {
        // Handle audio format (mp3)
        if (data.formats.audio && data.formats.audio.length > 0) {
          // Find highest quality audio
          const audioFormats = data.formats.audio;
          downloadUrl = audioFormats[0].url; // Default to first one
          selectedQuality = "high";
          
          // Try to find mp3 format if available
          const mp3Format = audioFormats.find((f: any) => 
            f.extension === "mp3" || f.mimeType?.includes("audio/mp3"));
            
          if (mp3Format) {
            downloadUrl = mp3Format.url;
          }
        }
      } else {
        // Handle video format (mp4)
        const videoFormats = data.formats.video || [];
        
        // Try to find format matching requested quality
        if (quality === "720p") {
          // Look for 720p first
          const hdFormat = videoFormats.find((f: any) => 
            f.quality?.includes("720") || f.height === 720);
            
          if (hdFormat) {
            downloadUrl = hdFormat.url;
            selectedQuality = "720p";
          }
        } 
        
        // If no URL yet and looking for 480p 
        if (!downloadUrl && (quality === "480p" || quality === "720p")) {
          const sdFormat = videoFormats.find((f: any) => 
            f.quality?.includes("480") || f.height === 480);
            
          if (sdFormat) {
            downloadUrl = sdFormat.url;
            selectedQuality = "480p";
          }
        }
        
        // If still no URL, fall back to 360p or any available format
        if (!downloadUrl) {
          const lowFormat = videoFormats.find((f: any) => 
            f.quality?.includes("360") || f.height === 360);
            
          if (lowFormat) {
            downloadUrl = lowFormat.url;
            selectedQuality = "360p";
          } else if (videoFormats.length > 0) {
            // Last resort: use the first available video format
            downloadUrl = videoFormats[0].url;
            selectedQuality = videoFormats[0].quality || "unknown";
          }
        }
      }

      // Verify we have a download URL
      if (!downloadUrl) {
        console.error(`No ${format} URL found in formats:`, data.formats);
        
        await logToSupabase({
          video_url: standardUrl,
          status: "error",
          format,
          error_message: `No ${format} URL found in available formats`,
          ip_address: clientIP,
        });
        
        return new Response(
          JSON.stringify({ error: `No ${format} URL found in available formats` }),
          { status: 404, headers: corsHeaders }
        );
      }

      // Prepare success response with REAL download URL from RapidAPI
      const result = {
        title: data.title || "YouTube Video",
        thumbnail: data.thumbnail || "",
        duration: data.duration || "",
        author: data.author || "",
        downloadUrl, // This is the real download URL from RapidAPI
        quality: selectedQuality,
        format,
        isAudio,
      };

      // Log successful download to Supabase
      await logToSupabase({
        video_url: standardUrl,
        download_url: downloadUrl,
        status: "success",
        format,
        quality: selectedQuality,
        ip_address: clientIP,
      });

      // Return successful response with the real download URL
      return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
    } catch (apiError) {
      console.error("API request error:", apiError);
      
      // Log API error
      await logToSupabase({
        video_url: standardUrl,
        status: "error",
        format,
        error_message: `API request error: ${apiError.message || "Unknown error"}`,
        ip_address: clientIP,
      });
      
      return new Response(
        JSON.stringify({ error: "API request failed", details: apiError.message }),
        { status: 500, headers: corsHeaders }
      );
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
