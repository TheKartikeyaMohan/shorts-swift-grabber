
// Download YouTube Shorts Edge Function
// This function uses working API providers to handle video downloads
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

// Test if a URL is a valid direct media file
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
    
    return isMedia;
  } catch (error) {
    console.error(`Error testing media URL: ${error.message}`);
    return false; // Assume it's not valid if we can't test it
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
    
    // Let's try multiple services to get a working direct download URL
    let directVideoUrl = "";
    let videoTitle = "";
    let videoThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    let videoDuration = "";
    let videoAuthor = "";
    let apiSuccess = false;
    
    // 1. First attempt: Try Y2Mate API
    try {
      console.log("Trying Y2Mate API...");
      
      // First step: Get video info
      const y2mateInfoResponse = await fetch(`https://yt1s.com/api/ajaxSearch/index`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0"
        },
        body: new URLSearchParams({
          q: standardUrl,
          vt: format === "mp3" ? "mp3" : "mp4"
        }).toString()
      });
      
      if (y2mateInfoResponse.ok) {
        const y2mateInfo = await y2mateInfoResponse.json();
        console.log("Y2Mate info response:", y2mateInfo);
        
        if (y2mateInfo && y2mateInfo.status === "ok" && y2mateInfo.links) {
          videoTitle = y2mateInfo.title || "YouTube Video";
          videoDuration = y2mateInfo.t || "";
          
          // Select format based on request
          let selectedFormat = null;
          let formatKey = "";
          
          if (format === "mp4") {
            const mp4Formats = y2mateInfo.links.mp4 || {};
            
            // Find the requested quality or closest available
            if (quality === "720p" && mp4Formats["720p"]) {
              selectedFormat = mp4Formats["720p"];
              formatKey = "720p";
            } else if (quality === "480p" && mp4Formats["480p"]) {
              selectedFormat = mp4Formats["480p"];
              formatKey = "480p";
            } else if (mp4Formats["360p"]) {
              selectedFormat = mp4Formats["360p"];
              formatKey = "360p";
            } else {
              // Get first available format
              const availableQualities = Object.keys(mp4Formats);
              if (availableQualities.length > 0) {
                formatKey = availableQualities[0];
                selectedFormat = mp4Formats[formatKey];
              }
            }
          } else if (format === "mp3" && y2mateInfo.links.mp3) {
            const mp3Formats = y2mateInfo.links.mp3;
            
            // Usually mp3 has 128kbps option
            if (mp3Formats["128kbps"]) {
              selectedFormat = mp3Formats["128kbps"];
              formatKey = "128kbps";
            } else {
              // Get first available audio format
              const availableQualities = Object.keys(mp3Formats);
              if (availableQualities.length > 0) {
                formatKey = availableQualities[0];
                selectedFormat = mp3Formats[formatKey];
              }
            }
          }
          
          // If we found a suitable format, get the download link
          if (selectedFormat && selectedFormat.k) {
            console.log(`Selected Y2Mate format: ${formatKey}, size: ${selectedFormat.size}`);
            
            // Second step: Convert and get download link
            const y2mateConvertResponse = await fetch(`https://yt1s.com/api/ajaxConvert/convert`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0"
              },
              body: new URLSearchParams({
                vid: y2mateInfo.vid,
                k: selectedFormat.k
              }).toString()
            });
            
            if (y2mateConvertResponse.ok) {
              const y2mateConvert = await y2mateConvertResponse.json();
              console.log("Y2Mate convert response:", y2mateConvert);
              
              if (y2mateConvert && y2mateConvert.status === "ok" && y2mateConvert.dlink) {
                directVideoUrl = y2mateConvert.dlink;
                
                // Test if this is a valid media file
                const isMediaFile = await isValidMediaFile(directVideoUrl);
                if (isMediaFile) {
                  console.log("Valid media file URL found from Y2Mate!");
                  apiSuccess = true;
                } else {
                  console.log("Y2Mate URL is not a valid media file, will try another API");
                  directVideoUrl = "";
                }
              }
            }
          }
        }
      }
    } catch (y2mateError) {
      console.error("Y2Mate API error:", y2mateError);
      // Continue to next API
    }
    
    // 2. Second attempt: Try SSYouTube API if Y2Mate failed
    if (!apiSuccess) {
      try {
        console.log("Trying SSYouTube API...");
        
        const ssytUrl = format === "mp3" 
          ? `https://ssyoutube.com/api/convert?url=${encodeURIComponent(standardUrl)}&format=mp3`
          : `https://ssyoutube.com/api/convert?url=${encodeURIComponent(standardUrl)}&format=${quality === '720p' ? '720' : '360'}p`;
          
        const ssytResponse = await fetch(ssytUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });
        
        if (ssytResponse.ok) {
          const ssytData = await ssytResponse.json();
          console.log("SSYouTube API response:", ssytData);
          
          if (ssytData && ssytData.url) {
            directVideoUrl = ssytData.url;
            videoTitle = ssytData.meta?.title || "YouTube Video";
            
            // Test if this is a valid media file
            const isMediaFile = await isValidMediaFile(directVideoUrl);
            if (isMediaFile) {
              console.log("Valid media file URL found from SSYouTube!");
              apiSuccess = true;
            } else {
              console.log("SSYouTube URL is not a valid media file, will try another API");
              directVideoUrl = "";
            }
          }
        }
      } catch (ssytError) {
        console.error("SSYouTube API error:", ssytError);
        // Continue to next API
      }
    }
    
    // 3. Third attempt: Try another download service
    if (!apiSuccess) {
      try {
        console.log("Trying SaveFrom.net API...");
        
        const sfnetUrl = `https://sfrom.net/api/convert?url=${encodeURIComponent(standardUrl)}&format=${format}`;
        
        const sfnetResponse = await fetch(sfnetUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });
        
        if (sfnetResponse.ok) {
          const sfnetData = await sfnetResponse.json();
          console.log("SaveFrom API response:", sfnetData);
          
          if (sfnetData && sfnetData.url) {
            directVideoUrl = sfnetData.url;
            videoTitle = sfnetData.title || "YouTube Video";
            
            // Test if this is a valid media file
            const isMediaFile = await isValidMediaFile(directVideoUrl);
            if (isMediaFile) {
              console.log("Valid media file URL found from SaveFrom!");
              apiSuccess = true;
            } else {
              console.log("SaveFrom URL is not a valid media file, will try another API");
              directVideoUrl = "";
            }
          }
        }
      } catch (sfnetError) {
        console.error("SaveFrom API error:", sfnetError);
        // Continue to next API
      }
    }
    
    // 4. Final Attempt: Use RapidAPI as backup
    if (!apiSuccess) {
      try {
        console.log("Using RapidAPI as fallback...");
        
        // Get RapidAPI key from environment
        const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
        if (!rapidApiKey) {
          throw new Error("RAPIDAPI_KEY not found in environment");
        }
        
        // Use a working RapidAPI endpoint
        const rapidApiResponse = await fetch("https://youtube-media-downloader.p.rapidapi.com/v2/video/details", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": rapidApiKey,
            "X-RapidAPI-Host": "youtube-media-downloader.p.rapidapi.com"
          },
          body: JSON.stringify({
            url: standardUrl
          })
        });
        
        if (rapidApiResponse.ok) {
          const rapidApiData = await rapidApiResponse.json();
          console.log("RapidAPI Response:", rapidApiData);
          
          if (rapidApiData && rapidApiData.videos) {
            videoTitle = rapidApiData.title || "YouTube Video";
            videoThumbnail = rapidApiData.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            videoDuration = rapidApiData.duration || "";
            videoAuthor = rapidApiData.uploader || "";
            
            // For video formats
            if (format === "mp4") {
              // Sort available formats by quality
              const videoFormats = rapidApiData.videos
                .filter((f: any) => f.extension === "mp4")
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
                
                // Test if this is a valid media file
                const isMediaFile = await isValidMediaFile(directVideoUrl);
                if (isMediaFile) {
                  console.log(`Valid media file URL found from RapidAPI: ${selectedFormat.height}p`);
                  apiSuccess = true;
                } else {
                  console.log("RapidAPI URL is not a valid media file");
                  directVideoUrl = "";
                }
              }
            } 
            // For audio formats
            else if (format === "mp3" && rapidApiData.audios) {
              // Find audio formats
              const audioFormats = rapidApiData.audios
                .filter((f: any) => f.extension === "mp3" || f.extension === "m4a")
                .sort((a: any, b: any) => b.bitrate - a.bitrate);
              
              if (audioFormats.length > 0 && audioFormats[0].url) {
                directVideoUrl = audioFormats[0].url;
                
                // Test if this is a valid media file
                const isMediaFile = await isValidMediaFile(directVideoUrl);
                if (isMediaFile) {
                  console.log(`Valid audio file URL found from RapidAPI: ${audioFormats[0].bitrate}kbps`);
                  apiSuccess = true;
                } else {
                  console.log("RapidAPI audio URL is not a valid media file");
                  directVideoUrl = "";
                }
              }
            }
          }
        }
      } catch (rapidApiError) {
        console.error("RapidAPI error:", rapidApiError);
        // This was our last attempt
      }
    }

    // If all attempts failed, return an error
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
