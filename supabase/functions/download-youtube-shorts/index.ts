
// Download YouTube Shorts Edge Function
// This function uses the RapidAPI YouTube Video and Shorts Downloader API
// to get direct downloadable media file URLs

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

// Function to test if a URL is a valid direct media file
async function isValidMediaFile(url: string): Promise<boolean> {
  try {
    console.log(`Testing if URL is a valid media file: ${url.substring(0, 100)}...`);
    
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Set a timeout of 5 seconds
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal
    });
    
    clearTimeout(timeoutId);
    
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
    // If HEAD request fails, we'll try a more lenient approach - check if URL looks like a media file
    return url.includes('.mp4') || url.includes('.mp3') || url.includes('.webm');
  }
}

// Function to get direct download URL from RapidAPI YouTube Video and Shorts Downloader
async function getRapidAPIVideoDownloader(url: string, format: string): Promise<{url: string | null, title?: string, thumbnail?: string}> {
  try {
    console.log("Using RapidAPI YouTube Video and Shorts Downloader...");
    
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      throw new Error("RAPIDAPI_KEY not found in environment");
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error("Could not extract video ID from URL");
    }
    
    console.log(`Extracted video ID: ${videoId}`);
    
    // Use the correct RapidAPI endpoint format with proper host and key
    const apiUrl = `https://youtube-video-and-shorts-downloader.p.rapidapi.com/download.php?id=${videoId}`;
    
    console.log(`Calling RapidAPI endpoint: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "youtube-video-and-shorts-downloader.p.rapidapi.com"
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`RapidAPI error: ${response.status} ${response.statusText} - ${errorText}`);
      return { url: null };
    }
    
    const data = await response.json();
    console.log("RapidAPI response:", JSON.stringify(data).substring(0, 200) + "...");
    
    if (!data || !data.formats) {
      console.error("Invalid response format from RapidAPI");
      return { url: null };
    }
    
    // Find appropriate format based on user request
    let downloadUrl = null;
    let selectedResolution = null;
    
    // For MP4 video format
    if (format === "mp4") {
      // Find all MP4 formats
      const mp4Formats = data.formats.filter((f: any) => 
        f.ext === "mp4" && f.url && f.filesize && f.resolution
      );
      
      // Sort by resolution (higher first)
      mp4Formats.sort((a: any, b: any) => {
        const getResValue = (res: string) => {
          const match = res.match(/(\d+)p/);
          return match ? parseInt(match[1]) : 0;
        };
        return getResValue(b.resolution) - getResValue(a.resolution);
      });
      
      console.log(`Found ${mp4Formats.length} mp4 formats`);
      
      // Select appropriate quality based on request
      if (mp4Formats.length > 0) {
        // By default, get highest resolution (first in sorted array)
        let selectedFormat = mp4Formats[0];
        
        // If specific quality requested, try to match it
        if (mp4Formats.length > 1) {
          for (const format of mp4Formats) {
            if (format.resolution.includes("720p")) {
              selectedFormat = format;
              selectedResolution = "720p";
              break;
            } else if (format.resolution.includes("480p") && !selectedResolution) {
              selectedFormat = format;
              selectedResolution = "480p";
            } else if (format.resolution.includes("360p") && !selectedResolution) {
              selectedFormat = format;
              selectedResolution = "360p";
            }
          }
        }
        
        downloadUrl = selectedFormat.url;
        selectedResolution = selectedFormat.resolution;
        
        console.log(`Selected video format: ${selectedResolution}, URL: ${downloadUrl?.substring(0, 50)}...`);
      }
    } 
    // For MP3 audio format
    else if (format === "mp3") {
      // Find audio formats
      const audioFormats = data.formats.filter((f: any) => 
        (f.ext === "mp3" || f.ext === "m4a") && f.url && f.filesize
      );
      
      if (audioFormats.length > 0) {
        // Sort by filesize (higher quality first)
        audioFormats.sort((a: any, b: any) => b.filesize - a.filesize);
        downloadUrl = audioFormats[0].url;
        selectedResolution = "audio";
        console.log(`Selected audio format, URL: ${downloadUrl?.substring(0, 50)}...`);
      }
    }
    
    // Verify the download URL is valid
    if (downloadUrl) {
      const isValid = await isValidMediaFile(downloadUrl);
      if (isValid) {
        console.log("URL confirmed as valid media file!");
        return { 
          url: downloadUrl,
          title: data.title || `YouTube-${videoId}`,
          thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        };
      } else {
        console.log("URL is not a valid media file");
      }
    }
    
    return { url: null };
  } catch (error) {
    console.error("RapidAPI error:", error instanceof Error ? error.message : String(error));
    return { url: null };
  }
}

// Alternative function to try Y2Mate API if RapidAPI fails
async function getY2MateDownloadUrl(url: string, format: string): Promise<{url: string | null, title?: string}> {
  try {
    console.log("Trying Y2Mate API as fallback...");
    
    // Step 1: Get video information from Y2Mate
    const infoResponse = await fetch("https://www.y2mate.com/mates/analyzeV2/ajax", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://www.y2mate.com",
        "Referer": "https://www.y2mate.com/"
      },
      body: new URLSearchParams({
        k_query: url,
        k_page: "home",
        hl: "en"
      }).toString()
    });
    
    if (!infoResponse.ok) {
      console.error(`Y2Mate info error: ${infoResponse.status} ${infoResponse.statusText}`);
      return { url: null };
    }
    
    const infoData = await infoResponse.json();
    console.log("Y2Mate info response:", JSON.stringify(infoData).substring(0, 200) + "...");
    
    if (!infoData || !infoData.vid || !infoData.links) {
      console.log("Y2Mate API returned invalid data");
      return { url: null };
    }
    
    // Step 2: Find appropriate link and request conversion
    let mediaUrl = null;
    let ftype = format === "mp3" ? "mp3" : "mp4";
    let targetQuality = "720p";
    let mediaKey = "";
    
    if (format === "mp4") {
      // Find mp4 formats and sort by quality
      const videoLinks = infoData.links.mp4 || {};
      const qualities = Object.keys(videoLinks);
      
      if (qualities.length > 0) {
        // Try to find 720p, otherwise use highest available
        if (videoLinks["720p"] && videoLinks["720p"].k) {
          mediaKey = videoLinks["720p"].k;
          targetQuality = "720p";
        } else if (videoLinks["480p"] && videoLinks["480p"].k) {
          mediaKey = videoLinks["480p"].k;
          targetQuality = "480p";
        } else if (videoLinks["360p"] && videoLinks["360p"].k) {
          mediaKey = videoLinks["360p"].k;
          targetQuality = "360p";
        } else {
          // Use the first available quality
          const firstQuality = qualities[0];
          mediaKey = videoLinks[firstQuality].k;
          targetQuality = firstQuality;
        }
      }
    } else {
      // Find mp3 formats
      const audioLinks = infoData.links.mp3 || {};
      const qualities = Object.keys(audioLinks);
      
      if (qualities.length > 0) {
        mediaKey = audioLinks[qualities[0]].k;
        targetQuality = qualities[0];
      }
    }
    
    if (!mediaKey) {
      console.log("No suitable format found in Y2Mate response");
      return { url: null };
    }
    
    // Step 3: Request the conversion and download URL
    const convertResponse = await fetch("https://www.y2mate.com/mates/convertV2/index", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://www.y2mate.com",
        "Referer": "https://www.y2mate.com/"
      },
      body: new URLSearchParams({
        vid: infoData.vid,
        k: mediaKey,
        ftype: ftype,
        fquality: targetQuality,
        token: "",
        hl: "en"
      }).toString()
    });
    
    if (!convertResponse.ok) {
      console.error(`Y2Mate convert error: ${convertResponse.status} ${convertResponse.statusText}`);
      return { url: null };
    }
    
    const convertData = await convertResponse.json();
    console.log("Y2Mate convert response:", JSON.stringify(convertData).substring(0, 200) + "...");
    
    if (convertData && convertData.dlink) {
      mediaUrl = convertData.dlink;
      
      // Verify the URL is valid
      const isValid = await isValidMediaFile(mediaUrl);
      if (isValid) {
        console.log("Valid media file URL found from Y2Mate!");
        return { 
          url: mediaUrl,
          title: infoData.title || "YouTube Video"
        };
      } else {
        console.log("Y2Mate URL is not a valid media file");
      }
    }
    
    return { url: null };
  } catch (error) {
    console.error("Y2Mate API error:", error instanceof Error ? error.message : String(error));
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
    
    // Prepare default values for response
    let directVideoUrl = "";
    let videoTitle = `YouTube-${videoId}`;
    let videoThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    let videoDuration = "";
    let videoAuthor = "";
    let apiSuccess = false;
    
    // Try RapidAPI YouTube Video and Shorts Downloader first
    const rapidApiResult = await getRapidAPIVideoDownloader(standardUrl, format);
    if (rapidApiResult.url) {
      directVideoUrl = rapidApiResult.url;
      if (rapidApiResult.title) videoTitle = rapidApiResult.title;
      if (rapidApiResult.thumbnail) videoThumbnail = rapidApiResult.thumbnail;
      apiSuccess = true;
      console.log("RapidAPI successful");
    } else {
      console.log("RapidAPI failed, trying Y2Mate...");
      
      // Try Y2Mate as fallback
      const y2mateResult = await getY2MateDownloadUrl(standardUrl, format);
      if (y2mateResult.url) {
        directVideoUrl = y2mateResult.url;
        if (y2mateResult.title) videoTitle = y2mateResult.title;
        apiSuccess = true;
        console.log("Y2Mate successful");
      } else {
        console.log("Y2Mate failed");
      }
    }

    // If all attempts failed, return error
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
