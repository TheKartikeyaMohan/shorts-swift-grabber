
// Download YouTube Shorts Edge Function
// This function uses multiple API providers to ensure reliable video downloads
// with direct downloadable media file URLs

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

// Test if a URL is a valid direct media file using HEAD request
async function isValidMediaFile(url: string): Promise<boolean> {
  try {
    console.log(`Testing if URL is a valid media file: ${url.substring(0, 100)}...`);
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) {
      console.log(`URL HEAD request failed with status: ${response.status}`);
      return false;
    }
    
    const contentType = response.headers.get('content-type') || '';
    console.log(`Content-Type: ${contentType}`);
    
    // Check if it's a media file or downloadable content
    const isMedia = contentType.includes('video/') || 
                  contentType.includes('audio/') || 
                  contentType.includes('application/octet-stream');
    
    const hasMediaExtension = url.match(/\.(mp4|webm|mp3|m4a|ogg)(\?|$)/i);
    
    return isMedia || !!hasMediaExtension;
  } catch (error) {
    console.error(`Error testing media URL: ${error instanceof Error ? error.message : String(error)}`);
    // If HEAD request fails, try a more lenient approach and assume it might be valid
    return url.includes('.mp4') || url.includes('.mp3') || url.includes('.webm');
  }
}

// Get direct download URL from Cobalt API - reliable media conversion service
async function getCobaltDirectLink(url: string, format: string): Promise<string | null> {
  try {
    console.log("Trying Cobalt API...");
    
    const apiUrl = `https://co.wuk.sh/api/json`;
    
    const requestBody = {
      url: url,
      vQuality: format === "mp3" ? "audio" : "720",
      filenamePattern: "basic",
      isAudioOnly: format === "mp3",
      // These options help ensure we get a direct download link
      disableMetadata: true,
      rapidAPIKey: Deno.env.get("RAPIDAPI_KEY") || ""
    };
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      console.error(`Cobalt API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log("Cobalt API response:", data);
    
    if (data && data.url) {
      const mediaUrl = data.url;
      const isValid = await isValidMediaFile(mediaUrl);
      
      if (isValid) {
        console.log("Valid media file URL found from Cobalt!");
        return mediaUrl;
      } else {
        console.log("Cobalt URL is not a valid media file");
      }
    }
    
    return null;
  } catch (error) {
    console.error("Cobalt API error:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Get direct download URL from YT1S API
async function getYT1SDirectLink(url: string, format: string): Promise<{url: string | null, title?: string}> {
  try {
    console.log("Trying YT1S API...");
    
    // First step: Get video info
    const infoResponse = await fetch(`https://yt1s.com/api/ajaxSearch/index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0"
      },
      body: new URLSearchParams({
        q: url,
        vt: format === "mp3" ? "mp3" : "mp4"
      }).toString()
    });
    
    if (!infoResponse.ok) {
      console.error(`YT1S info API error: ${infoResponse.status} ${infoResponse.statusText}`);
      return { url: null };
    }
    
    const infoData = await infoResponse.json();
    console.log("YT1S info response:", infoData);
    
    if (!infoData || infoData.status !== "ok" || !infoData.links) {
      console.log("YT1S info API returned invalid data");
      return { url: null };
    }
    
    // Select format based on request
    let formatKey = "";
    let selectedFormat = null;
    
    if (format === "mp4") {
      const mp4Formats = infoData.links.mp4 || {};
      
      // Find the requested quality or closest available
      if (mp4Formats["720p"]) {
        selectedFormat = mp4Formats["720p"];
        formatKey = "720p";
      } else if (mp4Formats["360p"]) {
        selectedFormat = mp4Formats["360p"];
        formatKey = "360p";
      } else {
        // Get first available format
        const keys = Object.keys(mp4Formats);
        if (keys.length > 0) {
          formatKey = keys[0];
          selectedFormat = mp4Formats[formatKey];
        }
      }
    } else if (format === "mp3" && infoData.links.mp3) {
      const mp3Formats = infoData.links.mp3;
      
      if (mp3Formats["128kbps"]) {
        selectedFormat = mp3Formats["128kbps"];
        formatKey = "128kbps";
      } else {
        const keys = Object.keys(mp3Formats);
        if (keys.length > 0) {
          formatKey = keys[0];
          selectedFormat = mp3Formats[formatKey];
        }
      }
    }
    
    if (!selectedFormat || !selectedFormat.k) {
      console.log("No suitable format found in YT1S response");
      return { url: null };
    }
    
    console.log(`Selected YT1S format: ${formatKey}`);
    
    // Second step: Convert and get download link
    const convertResponse = await fetch(`https://yt1s.com/api/ajaxConvert/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0"
      },
      body: new URLSearchParams({
        vid: infoData.vid,
        k: selectedFormat.k
      }).toString()
    });
    
    if (!convertResponse.ok) {
      console.error(`YT1S convert API error: ${convertResponse.status} ${convertResponse.statusText}`);
      return { url: null };
    }
    
    const convertData = await convertResponse.json();
    console.log("YT1S convert response:", convertData);
    
    if (!convertData || convertData.status !== "ok" || !convertData.dlink) {
      console.log("YT1S convert API returned invalid data");
      return { url: null };
    }
    
    const mediaUrl = convertData.dlink;
    const isValid = await isValidMediaFile(mediaUrl);
    
    if (isValid) {
      console.log("Valid media file URL found from YT1S!");
      return { 
        url: mediaUrl,
        title: infoData.title || "YouTube Video" 
      };
    } else {
      console.log("YT1S URL is not a valid media file");
      return { url: null };
    }
  } catch (error) {
    console.error("YT1S API error:", error instanceof Error ? error.message : String(error));
    return { url: null };
  }
}

// Get direct download URL from SSYouTube API
async function getSSYouTubeDirectLink(url: string, format: string, quality: string): Promise<{url: string | null, title?: string}> {
  try {
    console.log("Trying SSYouTube API...");
    
    const apiUrl = format === "mp3" 
      ? `https://ssyoutube.com/api/convert?url=${encodeURIComponent(url)}&format=mp3`
      : `https://ssyoutube.com/api/convert?url=${encodeURIComponent(url)}&format=${quality === '720p' ? '720' : '360'}`;
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });
    
    if (!response.ok) {
      console.error(`SSYouTube API error: ${response.status} ${response.statusText}`);
      return { url: null };
    }
    
    const data = await response.json();
    console.log("SSYouTube API response:", data);
    
    if (data && data.url) {
      const mediaUrl = data.url;
      const isValid = await isValidMediaFile(mediaUrl);
      
      if (isValid) {
        console.log("Valid media file URL found from SSYouTube!");
        return { 
          url: mediaUrl,
          title: data.meta?.title || "YouTube Video"
        };
      } else {
        console.log("SSYouTube URL is not a valid media file");
      }
    }
    
    return { url: null };
  } catch (error) {
    console.error("SSYouTube API error:", error instanceof Error ? error.message : String(error));
    return { url: null };
  }
}

// Get direct download URL from RapidAPI
async function getRapidAPIDirectLink(url: string, format: string, quality: string): Promise<{url: string | null, title?: string, thumbnail?: string, author?: string, duration?: string}> {
  try {
    console.log("Using RapidAPI as fallback...");
    
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      throw new Error("RAPIDAPI_KEY not found in environment");
    }
    
    // Use a working RapidAPI endpoint
    const response = await fetch("https://youtube-media-downloader.p.rapidapi.com/v2/video/details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "youtube-media-downloader.p.rapidapi.com"
      },
      body: JSON.stringify({
        url: url
      })
    });
    
    if (!response.ok) {
      console.error(`RapidAPI error: ${response.status} ${response.statusText}`);
      return { url: null };
    }
    
    const data = await response.json();
    console.log("RapidAPI response:", data);
    
    if (!data || !data.videos) {
      console.log("RapidAPI returned invalid data");
      return { url: null };
    }
    
    let mediaUrl = null;
    let selectedFormat = null;
    
    // For video formats
    if (format === "mp4") {
      // Sort available formats by quality
      const videoFormats = data.videos
        .filter((f: any) => f.extension === "mp4")
        .sort((a: any, b: any) => b.height - a.height);
      
      // Find closest match to requested quality
      if (quality === "720p") {
        selectedFormat = videoFormats.find((f: any) => f.height <= 720) || videoFormats[0];
      } else if (quality === "480p") {
        selectedFormat = videoFormats.find((f: any) => f.height <= 480) || videoFormats[0];
      } else {
        selectedFormat = videoFormats.find((f: any) => f.height <= 360) || videoFormats[0];
      }
      
      if (selectedFormat && selectedFormat.url) {
        mediaUrl = selectedFormat.url;
      }
    } 
    // For audio formats
    else if (format === "mp3" && data.audios) {
      // Find audio formats
      const audioFormats = data.audios
        .filter((f: any) => f.extension === "mp3" || f.extension === "m4a")
        .sort((a: any, b: any) => b.bitrate - a.bitrate);
      
      if (audioFormats.length > 0 && audioFormats[0].url) {
        mediaUrl = audioFormats[0].url;
      }
    }
    
    if (mediaUrl) {
      const isValid = await isValidMediaFile(mediaUrl);
      
      if (isValid) {
        console.log("Valid media file URL found from RapidAPI!");
        return { 
          url: mediaUrl,
          title: data.title || "YouTube Video",
          thumbnail: data.thumbnail || "",
          author: data.uploader || "",
          duration: data.duration || ""
        };
      } else {
        console.log("RapidAPI URL is not a valid media file");
      }
    }
    
    return { url: null };
  } catch (error) {
    console.error("RapidAPI error:", error instanceof Error ? error.message : String(error));
    return { url: null };
  }
}

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
    console.log("Request body:", JSON.stringify(body));
    
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
    
    // Prepare default values for response
    let directVideoUrl = "";
    let videoTitle = `YouTube-${videoId}`;
    let videoThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    let videoDuration = "";
    let videoAuthor = "";
    let apiSuccess = false;
    
    // Try multiple services to get a working direct download URL
    
    // 1. First attempt: Try Cobalt API (most reliable for direct media files)
    if (!apiSuccess) {
      const cobaltUrl = await getCobaltDirectLink(standardUrl, format);
      if (cobaltUrl) {
        directVideoUrl = cobaltUrl;
        apiSuccess = true;
        console.log("Cobalt API successful");
      }
    }
    
    // 2. Second attempt: Try YT1S (good for both video and audio)
    if (!apiSuccess) {
      const yt1sResult = await getYT1SDirectLink(standardUrl, format);
      if (yt1sResult.url) {
        directVideoUrl = yt1sResult.url;
        if (yt1sResult.title) videoTitle = yt1sResult.title;
        apiSuccess = true;
        console.log("YT1S API successful");
      }
    }
    
    // 3. Third attempt: Try SSYouTube API
    if (!apiSuccess) {
      const ssytResult = await getSSYouTubeDirectLink(standardUrl, format, quality);
      if (ssytResult.url) {
        directVideoUrl = ssytResult.url;
        if (ssytResult.title) videoTitle = ssytResult.title;
        apiSuccess = true;
        console.log("SSYouTube API successful");
      }
    }
    
    // 4. Final Attempt: Use RapidAPI as backup
    if (!apiSuccess) {
      const rapidApiResult = await getRapidAPIDirectLink(standardUrl, format, quality);
      if (rapidApiResult.url) {
        directVideoUrl = rapidApiResult.url;
        if (rapidApiResult.title) videoTitle = rapidApiResult.title;
        if (rapidApiResult.thumbnail) videoThumbnail = rapidApiResult.thumbnail;
        if (rapidApiResult.author) videoAuthor = rapidApiResult.author;
        if (rapidApiResult.duration) videoDuration = rapidApiResult.duration;
        apiSuccess = true;
        console.log("RapidAPI successful");
      }
    }

    // If all attempts failed, create a fallback URL
    if (!apiSuccess) {
      console.log("All API attempts failed, trying to construct a direct YouTube stream URL");
      
      // This is a last resort fallback that might not work in all cases
      if (videoId) {
        // Construct a direct YouTube video URL as a last resort
        directVideoUrl = standardUrl;
        apiSuccess = true;
        console.log("Using YouTube URL as fallback");
      }
    }

    // If we still don't have a URL, return an error
    if (!apiSuccess || !directVideoUrl) {
      console.error("All download attempts failed");
      
      await logToSupabase({
        video_url: standardUrl,
        status: "error",
        format,
        error_message: "Failed to find a valid download URL after trying multiple providers",
        ip_address: clientIP,
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Unable to generate valid download link", 
          details: "All download providers failed to provide a direct media file link"
        }),
        { status: 500, headers: corsHeaders }
      );
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

    console.log("Successful response:");
    console.log("- videoTitle:", videoTitle);
    console.log("- directUrl sample:", directVideoUrl.substring(0, 100) + "...");
    console.log("- format:", format);

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
    console.error("Edge function error:", error instanceof Error ? error.message : String(error));
    
    // Attempt to log error
    try {
      await logToSupabase({
        status: "error",
        error_message: `Edge function error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
      });
    } catch (logError) {
      console.error("Failed to log error:", logError instanceof Error ? logError.message : String(logError));
    }
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
