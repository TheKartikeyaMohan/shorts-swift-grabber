// Download YouTube Shorts Edge Function
// This function uses RapidAPI to handle YouTube video downloads
// and returns the download URL to the client

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface RequestBody {
  url: string;
  format: string;
  quality?: string;
  getDirectLink?: boolean;
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

// Helper to find the best direct download URL from formats
const findBestDownloadUrl = (formats: any, requestedFormat: string, requestedQuality: string): string | null => {
  console.log(`Looking for best download URL for format: ${requestedFormat}, quality: ${requestedQuality}`);
  
  let bestUrl: string | null = null;
  
  if (requestedFormat === "mp3") {
    // For audio, look in audio formats
    if (formats.audio && formats.audio.length > 0) {
      console.log(`Found ${formats.audio.length} audio formats`);
      
      // Try to find mp3 format first
      const mp3Format = formats.audio.find((f: any) => 
        f.extension === "mp3" || f.mimeType?.includes("audio/mp3"));
        
      if (mp3Format && mp3Format.url) {
        console.log(`Found MP3 format with URL: ${mp3Format.url.substring(0, 100)}...`);
        bestUrl = mp3Format.url;
      } else {
        // Otherwise take the first audio format
        console.log(`No MP3 found, using first audio format: ${formats.audio[0].url.substring(0, 100)}...`);
        bestUrl = formats.audio[0].url;
      }
    }
  } else {
    // For video, look in video formats
    if (formats.video && formats.video.length > 0) {
      console.log(`Found ${formats.video.length} video formats`);
      
      // Log all available formats for debugging
      formats.video.forEach((f: any, i: number) => {
        console.log(`Format ${i}: Quality: ${f.quality}, Height: ${f.height}, Extension: ${f.extension}, HasURL: ${!!f.url}`);
      });
      
      // First try to find the exact requested quality
      let matchedFormat: any;
      
      if (requestedQuality === "720p") {
        matchedFormat = formats.video.find((f: any) => 
          (f.quality?.includes("720") || f.height === 720) && f.url);
      } else if (requestedQuality === "480p") {
        matchedFormat = formats.video.find((f: any) => 
          (f.quality?.includes("480") || f.height === 480) && f.url);
      } else if (requestedQuality === "360p") {
        matchedFormat = formats.video.find((f: any) => 
          (f.quality?.includes("360") || f.height === 360) && f.url);
      }
      
      if (matchedFormat && matchedFormat.url) {
        console.log(`Found exact quality match (${requestedQuality}): ${matchedFormat.url.substring(0, 100)}...`);
        bestUrl = matchedFormat.url;
      } else {
        // If exact quality not found, get the best available
        // Filter to only formats with URLs
        const availableFormats = formats.video.filter((f: any) => f.url);
        
        if (availableFormats.length > 0) {
          // Sort by height (quality) descending
          availableFormats.sort((a: any, b: any) => {
            // If height is available, use it
            if (a.height && b.height) {
              return b.height - a.height;
            }
            // Otherwise try to parse from quality string
            const aMatch = a.quality?.match(/(\d+)p/);
            const bMatch = b.quality?.match(/(\d+)p/);
            
            if (aMatch && bMatch) {
              return parseInt(bMatch[1]) - parseInt(aMatch[1]);
            }
            
            // Default to the first one
            return 0;
          });
          
          console.log(`No exact match found, using best available: ${availableFormats[0].quality}, URL: ${availableFormats[0].url.substring(0, 100)}...`);
          bestUrl = availableFormats[0].url;
        }
      }
    }
  }
  
  if (!bestUrl) {
    // Last resort - look for a direct download URL in the response root
    if (formats.url) {
      console.log(`No format-specific URL found, using root URL: ${formats.url.substring(0, 100)}...`);
      bestUrl = formats.url;
    }
  }
  
  return bestUrl;
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

    // Make request to RapidAPI using GET with the url as a query parameter
    const queryUrl = `https://youtube-video-and-shorts-downloader.p.rapidapi.com/download?id=${encodeURIComponent(standardUrl)}`;
    console.log(`Calling RapidAPI with: ${queryUrl}`);
    
    try {
      const apiResponse = await fetch(queryUrl, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": "youtube-video-and-shorts-downloader.p.rapidapi.com",
        },
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
      console.log("API Response structure:", Object.keys(data));
      
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

      console.log("Received format types:", Object.keys(data.formats));
      
      // Process formats based on requested format type
      let downloadUrl = "";
      let directUrl = "";
      let selectedQuality = "";
      const isAudio = format === "mp3";
      
      // Find the traditional download URL (might not be direct)
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
            
          if (mp3Format && mp3Format.url) {
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
            
          if (hdFormat && hdFormat.url) {
            downloadUrl = hdFormat.url;
            selectedQuality = "720p";
          }
        } 
        
        // If no URL yet and looking for 480p 
        if (!downloadUrl && (quality === "480p" || quality === "720p")) {
          const sdFormat = videoFormats.find((f: any) => 
            f.quality?.includes("480") || f.height === 480);
            
          if (sdFormat && sdFormat.url) {
            downloadUrl = sdFormat.url;
            selectedQuality = "480p";
          }
        }
        
        // If still no URL, fall back to 360p or any available format
        if (!downloadUrl) {
          const lowFormat = videoFormats.find((f: any) => 
            f.quality?.includes("360") || f.height === 360);
            
          if (lowFormat && lowFormat.url) {
            downloadUrl = lowFormat.url;
            selectedQuality = "360p";
          } else if (videoFormats.length > 0 && videoFormats[0].url) {
            // Last resort: use the first available video format
            downloadUrl = videoFormats[0].url;
            selectedQuality = videoFormats[0].quality || "unknown";
          }
        }
      }

      // Check for direct download URL
      // This is the key addition that tries to find direct download links for files
      directUrl = findBestDownloadUrl(data.formats, format, quality) || "";
      
      // If we're specifically requesting a direct download link and couldn't find one,
      // try to use alternate endpoints or fallbacks from the API response
      if (getDirectLink && !directUrl) {
        // Look for a "url" field at the top level of the response
        if (data.url) {
          console.log(`Using top-level URL as direct URL: ${data.url.substring(0, 100)}...`);
          directUrl = data.url;
        }
        
        // Check if there are download links in other structures
        if (data.download_links && Array.isArray(data.download_links)) {
          console.log(`Found ${data.download_links.length} download links`);
          
          // Find a suitable download link based on format
          const matchingLink = data.download_links.find((link: any) => {
            if (isAudio) {
              return link.type === "audio" || link.format === "mp3";
            } else {
              return link.type === "video" || link.format === "mp4";
            }
          });
          
          if (matchingLink && matchingLink.url) {
            console.log(`Found matching download link: ${matchingLink.url.substring(0, 100)}...`);
            directUrl = matchingLink.url;
          } else if (data.download_links.length > 0 && data.download_links[0].url) {
            console.log(`Using first download link: ${data.download_links[0].url.substring(0, 100)}...`);
            directUrl = data.download_links[0].url;
          }
        }
      }

      // Verify we have at least one URL
      if (!downloadUrl && !directUrl) {
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

      // Prepare success response with download URLs
      const result = {
        title: data.title || "YouTube Video",
        thumbnail: data.thumbnail || "",
        duration: data.duration || "",
        author: data.author || "",
        downloadUrl: downloadUrl || directUrl, // Fallback to directUrl if downloadUrl is empty
        directUrl: directUrl, // Explicitly provide the direct URL separately
        quality: selectedQuality,
        format,
        isAudio,
      };

      console.log("Successful response with URLs:");
      console.log("- downloadUrl length:", (downloadUrl || "").length);
      console.log("- directUrl length:", (directUrl || "").length);
      
      // For debugging only - don't log full URLs in production
      if (downloadUrl) console.log("- downloadUrl sample:", downloadUrl.substring(0, 50) + "...");
      if (directUrl) console.log("- directUrl sample:", directUrl.substring(0, 50) + "...");

      // Log successful download to Supabase
      await logToSupabase({
        video_url: standardUrl,
        download_url: (directUrl || downloadUrl).substring(0, 100) + "...", // Only log part of URL for privacy
        status: "success",
        format,
        quality: selectedQuality,
        ip_address: clientIP,
      });

      // Return successful response with the URLs
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
