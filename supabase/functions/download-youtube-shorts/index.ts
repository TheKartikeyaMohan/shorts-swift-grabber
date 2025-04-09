
// Download YouTube Shorts Edge Function
// This function uses multiple API providers to handle video downloads
// and ensures direct downloadable media file URLs

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

    // Try multiple APIs to get direct download links
    let directVideoUrl = "";
    let videoTitle = "";
    let videoThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    let videoDuration = "";
    let videoAuthor = "";
    let apiSuccess = false;
    
    // 1. First attempt: Try Cobalt API (generally works well for direct downloads)
    try {
      console.log("Trying Cobalt API...");
      const cobaltResponse = await fetch(`https://co.wuk.sh/api/json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: standardUrl,
          vQuality: quality === "720p" ? "720" : quality === "480p" ? "480" : "360",
          filenamePattern: "basic",
          isAudioOnly: format === "mp3",
          disableMetadata: true
        })
      });
      
      if (cobaltResponse.ok) {
        const cobaltData = await cobaltResponse.json();
        console.log("Cobalt API Response:", cobaltData);
        
        if (cobaltData.status === "success" && cobaltData.url) {
          directVideoUrl = cobaltData.url;
          videoTitle = cobaltData.meta?.title || "YouTube Video";
          videoDuration = cobaltData.meta?.duration || "";
          videoAuthor = cobaltData.meta?.uploader || "";
          apiSuccess = true;
          console.log("Direct download URL obtained from Cobalt API:", directVideoUrl);
        }
      }
    } catch (cobaltError) {
      console.error("Cobalt API error:", cobaltError);
      // Continue to next API
    }
    
    // 2. Second attempt: If Cobalt fails, try RapidAPI
    if (!apiSuccess) {
      try {
        console.log("Trying RapidAPI service...");
        const rapidApiResponse = await fetch("https://youtube-video-download-info.p.rapidapi.com/dl", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": rapidApiKey,
            "X-RapidAPI-Host": "youtube-video-download-info.p.rapidapi.com"
          },
          body: JSON.stringify({
            url: standardUrl
          })
        });
        
        if (rapidApiResponse.ok) {
          const rapidApiData = await rapidApiResponse.json();
          console.log("RapidAPI Response:", rapidApiData);
          
          if (rapidApiData && rapidApiData.formats) {
            // For video formats
            if (format === "mp4") {
              // Sort available formats by quality (resolution)
              const videoFormats = rapidApiData.formats
                .filter((f: any) => f.ext === "mp4" && f.height)
                .sort((a: any, b: any) => b.height - a.height);
              
              // Find closest match to requested quality
              let selectedFormat;
              if (quality === "720p") {
                selectedFormat = videoFormats.find((f: any) => f.height <= 720) || videoFormats[0];
              } else if (quality === "480p") {
                selectedFormat = videoFormats.find((f: any) => f.height <= 480) || videoFormats[0];
              } else {
                selectedFormat = videoFormats.find((f: any) => f.height <= 360) || videoFormats[0];
              }
              
              if (selectedFormat && selectedFormat.url) {
                directVideoUrl = selectedFormat.url;
                apiSuccess = true;
                console.log(`Selected video format: ${selectedFormat.height}p, URL: ${directVideoUrl.substring(0, 50)}...`);
              }
            } 
            // For audio formats
            else if (format === "mp3") {
              // Find audio formats
              const audioFormats = rapidApiData.formats
                .filter((f: any) => f.acodec !== "none" && !f.height)
                .sort((a: any, b: any) => b.abr - a.abr);
              
              if (audioFormats.length > 0 && audioFormats[0].url) {
                directVideoUrl = audioFormats[0].url;
                apiSuccess = true;
                console.log(`Selected audio format with bitrate: ${audioFormats[0].abr}kbps, URL: ${directVideoUrl.substring(0, 50)}...`);
              }
            }
            
            // Get video metadata
            videoTitle = rapidApiData.title || "YouTube Video";
            videoThumbnail = rapidApiData.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            videoDuration = rapidApiData.duration_string || "";
            videoAuthor = rapidApiData.uploader || "";
          }
        }
      } catch (rapidApiError) {
        console.error("RapidAPI error:", rapidApiError);
        // Continue to next API
      }
    }
    
    // 3. Third attempt: If both fail, try YT1S service
    if (!apiSuccess) {
      try {
        console.log("Trying YT1S service...");
        const yt1sFormData = new FormData();
        yt1sFormData.append("q", standardUrl);
        yt1sFormData.append("vt", format === "mp3" ? "mp3" : "mp4");
        
        const yt1sResponse = await fetch("https://yt1s.com/api/ajaxSearch", {
          method: "POST",
          body: yt1sFormData
        });
        
        if (yt1sResponse.ok) {
          const yt1sData = await yt1sResponse.json();
          console.log("YT1S initial response:", yt1sData);
          
          if (yt1sData && yt1sData.links) {
            // For video formats (mp4)
            if (format === "mp4") {
              const mp4Options = yt1sData.links.mp4;
              let selectedKey = "";
              
              // Select quality based on user preference
              if (quality === "720p" && mp4Options["720p"]) {
                selectedKey = "720p";
              } else if (quality === "480p" && mp4Options["480p"]) {
                selectedKey = "480p";
              } else if (mp4Options["360p"]) {
                selectedKey = "360p";
              } else {
                // Get first available quality
                selectedKey = Object.keys(mp4Options)[0];
              }
              
              if (selectedKey && mp4Options[selectedKey].k) {
                const convertFormData = new FormData();
                convertFormData.append("vid", yt1sData.vid);
                convertFormData.append("k", mp4Options[selectedKey].k);
                
                const convertResponse = await fetch("https://yt1s.com/api/ajaxConvert", {
                  method: "POST",
                  body: convertFormData
                });
                
                if (convertResponse.ok) {
                  const convertData = await convertResponse.json();
                  console.log("YT1S convert response:", convertData);
                  
                  if (convertData && convertData.dlink) {
                    directVideoUrl = convertData.dlink;
                    apiSuccess = true;
                    console.log(`YT1S direct link obtained: ${directVideoUrl.substring(0, 50)}...`);
                  }
                }
              }
            } 
            // For audio formats (mp3)
            else if (format === "mp3" && yt1sData.links.mp3["128kbps"]) {
              const convertFormData = new FormData();
              convertFormData.append("vid", yt1sData.vid);
              convertFormData.append("k", yt1sData.links.mp3["128kbps"].k);
              
              const convertResponse = await fetch("https://yt1s.com/api/ajaxConvert", {
                method: "POST",
                body: convertFormData
              });
              
              if (convertResponse.ok) {
                const convertData = await convertResponse.json();
                console.log("YT1S convert response:", convertData);
                
                if (convertData && convertData.dlink) {
                  directVideoUrl = convertData.dlink;
                  apiSuccess = true;
                  console.log(`YT1S direct link obtained: ${directVideoUrl.substring(0, 50)}...`);
                }
              }
            }
            
            // Get video metadata
            videoTitle = yt1sData.title || "YouTube Video";
            videoDuration = yt1sData.t || "";
          }
        }
      } catch (yt1sError) {
        console.error("YT1S API error:", yt1sError);
        // Continue to final fallback
      }
    }

    // If we failed to get a direct download URL, use fallback RapidAPI
    if (!apiSuccess) {
      console.log("All direct download attempts failed, using fallback RapidAPI...");
      return await useRapidAPIFallback(rapidApiKey, standardUrl, format, quality || "", clientIP, corsHeaders);
    }
    
    // Test if the URL is actually accessible with a HEAD request
    try {
      console.log(`Testing direct URL with HEAD request: ${directVideoUrl.substring(0, 50)}...`);
      const testResponse = await fetch(directVideoUrl, { 
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (!testResponse.ok) {
        console.error(`Direct URL test failed: ${testResponse.status}`);
        return await useRapidAPIFallback(rapidApiKey, standardUrl, format, quality || "", clientIP, corsHeaders);
      }
      
      // Get Content-Type to verify it's a media file
      const contentType = testResponse.headers.get('content-type') || '';
      console.log(`Content-Type for direct URL: ${contentType}`);
      
      const isMediaFile = contentType.includes('video/') || 
                           contentType.includes('audio/') || 
                           contentType.includes('application/octet-stream');
      
      if (!isMediaFile) {
        console.log("URL doesn't appear to be a direct media file, falling back to RapidAPI");
        return await useRapidAPIFallback(rapidApiKey, standardUrl, format, quality || "", clientIP, corsHeaders);
      }
      
      console.log("Direct URL test successful!");
    } catch (testError) {
      console.error("Error testing direct URL:", testError);
      // Continue anyway, some servers might block HEAD requests but allow GET
    }

    // Prepare success response with download URLs
    const result = {
      title: videoTitle,
      thumbnail: videoThumbnail,
      duration: videoDuration,
      author: videoAuthor,
      downloadUrl: directVideoUrl,
      directUrl: directVideoUrl, // Same as downloadUrl since it's already direct
      quality: quality || "",
      format,
      isAudio: format === "mp3",
    };

    console.log("Successful response with direct URLs:");
    console.log("- directUrl sample:", directVideoUrl.substring(0, 50) + "...");

    // Log successful download to Supabase
    await logToSupabase({
      video_url: standardUrl,
      download_url: directVideoUrl.substring(0, 100) + "...", // Only log part of URL for privacy
      status: "success",
      format,
      quality: quality || "",
      ip_address: clientIP,
    });

    // Return successful response with the URLs
    return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
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
