
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration?: string;
  author?: string;
  formats?: Array<{
    quality: string;
    format: string;
    label: string;
  }>;
  downloadUrl?: string;
  directUrl?: string; 
  quality?: string;
  format?: string;
}

interface VideoResultProps {
  videoInfo: VideoInfo;
  selectedFormat: string;
}

const VideoResult = ({ videoInfo, selectedFormat }: VideoResultProps) => {
  const { title, thumbnail, duration, author, downloadUrl, directUrl, quality, format } = videoInfo;
  const [downloading, setDownloading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isTestingUrl, setIsTestingUrl] = useState<boolean>(false);
  const [isDirectDownload, setIsDirectDownload] = useState<boolean | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);

  // Check if the URL is a direct download when component mounts or URLs change
  useEffect(() => {
    const testDownloadUrl = async () => {
      const linkToTest = directUrl || downloadUrl;
      if (!linkToTest) return;
      
      // Skip testing if it's a YouTube URL
      if (linkToTest.includes('youtube.com') || linkToTest.includes('youtu.be')) {
        setIsDirectDownload(false);
        return;
      }
      
      setIsTestingUrl(true);
      
      try {
        console.log("Testing if URL is a direct media file:", linkToTest);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(linkToTest, { 
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response && response.ok) {
          const contentTypeHeader = response.headers.get('content-type');
          console.log("Content-Type:", contentTypeHeader);
          setContentType(contentTypeHeader);
          
          // Detect if it's a media file based on content type
          const isMedia = contentTypeHeader && (
            contentTypeHeader.includes('video/') || 
            contentTypeHeader.includes('audio/') || 
            contentTypeHeader.includes('application/octet-stream') ||
            contentTypeHeader.includes('video/mp4') ||
            contentTypeHeader.includes('audio/mpeg') ||
            contentTypeHeader.includes('audio/mp3')
          );
          
          // Also check if the URL has a media file extension
          const hasMediaExtension = linkToTest.match(/\.(mp4|webm|mp3|m4a|ogg|wav)(\?|$)/i);
          
          setIsDirectDownload(isMedia || !!hasMediaExtension);
          console.log("Is direct media file:", isMedia || !!hasMediaExtension);
          console.log("Media extension detected:", !!hasMediaExtension);
        } else {
          console.log("URL is not accessible or returns an error");
          setIsDirectDownload(false);
        }
      } catch (error) {
        console.log("Error testing URL:", error);
        // If HEAD request fails, we'll try a GET request during download
        setIsDirectDownload(true);
      } finally {
        setIsTestingUrl(false);
      }
    };
    
    testDownloadUrl();
  }, [directUrl, downloadUrl]);

  const handleDownload = async () => {
    setDownloading(true);
    
    try {
      const storedUrl = localStorage.getItem("lastYoutubeUrl");
      
      if (!storedUrl) {
        toast.error("Missing video URL. Please search again.");
        setDownloading(false);
        return;
      }
      
      toast.info(`Starting ${selectedFormat === "mp3" ? "audio" : "video"} download...`);

      // Get the best download link
      let downloadLink = directUrl || downloadUrl;
      
      // If we have a download link, try to use it
      if (downloadLink) {
        console.log("Download link available:", downloadLink);
        
        // Check if it's a YouTube URL (which won't work for direct downloads)
        if (downloadLink.includes('youtube.com') || downloadLink.includes('youtu.be')) {
          console.log("YouTube URL detected - need to get a direct download link instead");
          
          // YouTube URLs can't be downloaded directly, so we need to regenerate a proper download link
          await fetchDirectDownloadLink(storedUrl, true);
          return;
        }
        
        // Use blob download method for all files
        await downloadWithBlob(downloadLink);
      } else {
        // No download link available, need to fetch one
        console.log("No download link available, fetching from API");
        await fetchDirectDownloadLink(storedUrl, true);
      }
      
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error instanceof Error ? error.message : "Download failed");
      
      // Fallback - open YouTube URL directly if all else fails
      if (retryCount > 1) {
        const storedUrl = localStorage.getItem("lastYoutubeUrl");
        if (storedUrl) {
          toast.info("Opening original YouTube video as fallback...");
          window.open(storedUrl, "_blank");
        }
      }
    } finally {
      setDownloading(false);
    }
  };

  const downloadWithBlob = async (url: string) => {
    console.log("Starting blob download for:", url);
    const toastId = toast.loading("Preparing download...");
    
    try {
      // Add random query parameter to bypass cache
      const urlWithCache = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      
      console.log("Fetching URL with no-cache:", urlWithCache);
      
      // Fetch with explicit headers to help with CORS and content type detection
      const response = await fetch(urlWithCache, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'video/*, audio/*, application/octet-stream',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Array.from(response.headers.entries()));
      
      if (!response.ok) {
        toast.dismiss(toastId);
        console.error(`Error fetching file: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to download: ${response.statusText}`);
      }
      
      // Get content type to determine file extension
      const contentType = response.headers.get('content-type') || '';
      console.log("Content-Type of download:", contentType);
      
      // Check for redirects or non-media content types
      const finalUrl = response.url;
      console.log("Final URL after redirects:", finalUrl);
      
      if (finalUrl.includes('youtube.com') || finalUrl.includes('youtu.be')) {
        toast.dismiss(toastId);
        toast.error("URL redirected to YouTube. Cannot download directly.");
        throw new Error("Redirected to YouTube");
      }
      
      const isMediaContentType = contentType.includes('video/') || 
                               contentType.includes('audio/') || 
                               contentType.includes('application/octet-stream');
                               
      if (!isMediaContentType) {
        console.warn("Non-media content type detected:", contentType);
        // We'll still try to download, but log the warning
      }
      
      // Determine file extension based on content type or format
      let fileExtension = format || selectedFormat || 'mp4';
      if (contentType.includes('audio/mp3') || contentType.includes('audio/mpeg')) {
        fileExtension = 'mp3';
      } else if (contentType.includes('video/mp4')) {
        fileExtension = 'mp4';
      } else if (contentType.includes('video/webm')) {
        fileExtension = 'webm';
      } else if (contentType.includes('audio/m4a')) {
        fileExtension = 'm4a';
      }
      
      // Convert response to blob
      console.log("Starting blob conversion...");
      const blob = await response.blob();
      console.log("Blob created, size:", blob.size, "bytes, type:", blob.type);
      
      // Check if blob is empty or too small
      if (blob.size < 1000) {
        toast.dismiss(toastId);
        console.error("Downloaded file is too small:", blob.size, "bytes");
        throw new Error("Downloaded file is too small or empty");
      }
      
      // Create a blob URL 
      const blobUrl = URL.createObjectURL(blob);
      console.log("Blob URL created:", blobUrl);
      
      // Create download element
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${title || 'youtube_video'}.${fileExtension}`;
      a.style.display = 'none';
      document.body.appendChild(a);
      
      console.log("Initiating download click...");
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        console.log("Cleanup completed");
      }, 100);
      
      toast.dismiss(toastId);
      toast.success("Download started!");
      
      console.log("Download initiated successfully using blob method");
      
    } catch (blobError) {
      toast.dismiss(toastId);
      console.error("Error with blob download:", blobError);
      throw blobError;
    }
  };

  const fetchDirectDownloadLink = async (youtubeUrl: string, forceNewLink: boolean = false) => {
    console.log("Regenerating direct download link for:", youtubeUrl);
    setRetryCount(prev => prev + 1);
    
    // Show loading toast
    const toastId = toast.loading("Fetching direct download link...");
    
    try {
      // Call our edge function with explicit request for direct link
      const { data, error } = await supabase.functions.invoke('download-youtube-shorts', {
        body: { 
          url: youtubeUrl, 
          format: selectedFormat,
          quality: quality || (selectedFormat === 'mp3' ? 'high' : '720p'),
          getDirectLink: true
        }
      });
      
      console.log("Edge function response for direct link:", data);
      
      if (error) {
        console.error("Edge function error:", error);
        toast.dismiss(toastId);
        toast.error(error.message || "Download failed");
        return;
      }
      
      if (!data) {
        toast.dismiss(toastId);
        toast.error("No data returned from server");
        return;
      }
      
      // Get direct download link from response
      const downloadLink = data.directUrl || data.downloadUrl;
      
      if (!downloadLink) {
        toast.dismiss(toastId);
        toast.error("No download link provided");
        return;
      }
      
      console.log("Received download link from API:", downloadLink);
      
      // Validate if it's a YouTube link
      if (downloadLink.includes('youtube.com') || downloadLink.includes('youtu.be')) {
        toast.dismiss(toastId);
        toast.error("Received a YouTube link instead of a direct download link");
        throw new Error("Received YouTube link instead of direct download");
      }
      
      // Try to download with the new link
      toast.dismiss(toastId);
      await downloadWithBlob(downloadLink);
      
    } catch (error) {
      console.error("Error fetching direct download link:", error);
      toast.dismiss(toastId);
      
      if (retryCount < 2 && !forceNewLink) {
        toast.info("Retrying with new provider...");
        setTimeout(() => fetchDirectDownloadLink(youtubeUrl, true), 1000);
      } else {
        toast.error("Failed to get direct download link");
        throw error;
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto yt-card overflow-hidden bg-white">
      <div className="aspect-video relative overflow-hidden bg-black">
        <img 
          src={thumbnail} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-1.5 py-0.5 text-xs rounded">
            {duration}
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center bg-green-100/90 text-green-800 px-2 py-0.5 text-xs rounded">
          <ShieldCheck className="h-3 w-3 mr-1" />
          <span>Verified</span>
        </div>
        {quality && (
          <div className="absolute top-2 right-2 bg-blue-100/90 text-blue-800 px-2 py-0.5 text-xs rounded">
            {quality}
          </div>
        )}
      </div>
      
      <div className="p-5 space-y-4">
        <h3 className="font-medium text-lg line-clamp-2">{title}</h3>
        {author && <p className="text-xs text-gray-500">{author}</p>}
        
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-700">
              <span>Format:</span>
              <span className="font-medium text-black">
                {format ? (format === 'mp3' ? 'Audio (MP3)' : `Video (${format.toUpperCase()})`) : 
                 (selectedFormat === 'mp3' ? 'Audio (MP3)' : 'Video (MP4)')}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white h-11 font-medium text-sm rounded-full tracking-wide transition-colors"
              disabled={downloading || isTestingUrl}
            >
              {downloading || isTestingUrl ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isTestingUrl ? "Checking..." : "Preparing..."}
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Download className="mr-2 h-4 w-4" />
                  Download {format ? (format === 'mp3' ? 'Audio' : 'Video') : (selectedFormat === 'mp3' ? 'Audio' : 'Video')}
                </span>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-gray-300 text-gray-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => {
                    const storedUrl = localStorage.getItem("lastYoutubeUrl");
                    if (storedUrl) window.open(storedUrl, "_blank");
                  }}
                >
                  Open in YouTube
                </DropdownMenuItem>
                {(directUrl || downloadUrl) && (
                  <DropdownMenuItem
                    onClick={() => {
                      const link = directUrl || downloadUrl;
                      if (link) window.open(link, "_blank");
                    }}
                  >
                    Debug: Open Media URL
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {isDirectDownload === false && (
            <div className="text-xs text-amber-600 text-center pt-1">
              Direct download not available. Video may open in browser instead.
            </div>
          )}
          
          {contentType && (
            <div className="text-xs text-gray-500 text-center">
              <span className="font-medium">Debug:</span> {contentType}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoResult;
