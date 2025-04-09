
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  quality?: string;
  format?: string;
}

interface VideoResultProps {
  videoInfo: VideoInfo;
  selectedFormat: string;
}

const VideoResult = ({ videoInfo, selectedFormat }: VideoResultProps) => {
  const { title, thumbnail, duration, author, downloadUrl, quality, format } = videoInfo;
  const [downloading, setDownloading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const formatOptions = {
    mp4: { label: "Video", format: "mp4", quality: quality || "720p" },
    mp3: { label: "Audio", format: "mp3", quality: "128kbps" }
  };

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

      // Check if we already have a valid download URL
      if (downloadUrl) {
        console.log("Download URL available:", downloadUrl);
        
        // Skip HEAD check for YouTube URLs which may block HEAD requests
        if (downloadUrl.includes('youtube.com') || downloadUrl.includes('youtu.be')) {
          console.log("YouTube URL detected - skipping HEAD check");
          startDownload(downloadUrl, title, format || selectedFormat);
          toast.success("Download started!");
          setDownloading(false);
          return;
        }
        
        try {
          console.log("Attempting to validate download URL:", downloadUrl);
          
          // Try fetching the download URL first to check if it's accessible
          // Use a timeout to prevent hanging on slow responses
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const checkResponse = await fetch(downloadUrl, { 
            method: 'HEAD',
            signal: controller.signal
          }).catch(err => {
            console.log("HEAD check failed:", err.message);
            return null;
          });
          
          clearTimeout(timeoutId);
          
          if (checkResponse && checkResponse.ok) {
            // URL is accessible, start download
            console.log("URL validation passed, starting download");
            startDownload(downloadUrl, title, format || selectedFormat);
            toast.success("Download started!");
            setDownloading(false);
            return;
          } else {
            console.log("Download URL not accessible, will regenerate", downloadUrl);
            // Continue to regenerate if URL is not accessible
          }
        } catch (error) {
          console.error("Error checking download URL:", error);
          // Continue to regenerate
        }
      }
      
      // If we reach here, we need to regenerate the download URL
      console.log("No valid download URL available, requesting from Edge Function");
      
      // Increment retry count for analytics
      setRetryCount(prev => prev + 1);
      
      // Call our edge function
      console.log("Calling edge function with parameters:", { 
        url: storedUrl, 
        format: selectedFormat,
        quality: quality || (selectedFormat === 'mp3' ? 'high' : '720p')
      });
      
      const { data, error } = await supabase.functions.invoke('download-youtube-shorts', {
        body: { 
          url: storedUrl, 
          format: selectedFormat,
          quality: quality || (selectedFormat === 'mp3' ? 'high' : '720p')
        }
      });
      
      console.log("Edge function complete response:", data);
      
      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Download failed");
      }
      
      if (!data) {
        console.error("Empty response from edge function");
        throw new Error("No data returned from server");
      }
      
      if (!data.downloadUrl) {
        console.error("Missing downloadUrl in response:", data);
        throw new Error("No download URL provided");
      }
      
      console.log("Received download URL from API:", data.downloadUrl);
      
      // Start the download with the URL from RapidAPI
      startDownload(data.downloadUrl, title || data.title, data.format || selectedFormat);
      toast.success("Download started!");
      
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error instanceof Error ? error.message : "Download failed");
      
      // Fallback - open YouTube URL directly if all else fails
      const storedUrl = localStorage.getItem("lastYoutubeUrl");
      if (storedUrl && retryCount > 1) {
        toast.info("Opening original YouTube video as fallback...");
        window.open(storedUrl, "_blank");
      }
    } finally {
      setDownloading(false);
    }
  };

  const startDownload = (url: string, title: string, format: string) => {
    // Log the actual URL being used for download
    console.log("Starting download with URL:", url);
    
    // For YouTube or other streaming URLs that require browser handling
    if (url.includes('youtube.com') || url.includes('youtu.be') || 
        url.includes('googlevideo.com') || url.includes('stream')) {
      console.log("Streaming URL detected - opening in new tab");
      window.open(url, "_blank");
      return;
    }
    
    // For direct file downloads, try to use download attribute
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title || 'youtube_video'}.${format}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // As a fallback, also open in new tab in case download attribute isn't supported
      setTimeout(() => {
        window.open(url, "_blank");
      }, 1000);
    } catch (error) {
      console.error("Error creating download link:", error);
      // Last resort fallback
      window.open(url, "_blank");
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
          
          <Button
            onClick={handleDownload}
            className="w-full bg-red-600 hover:bg-red-700 text-white h-11 font-medium text-sm rounded-full tracking-wide transition-colors"
            disabled={downloading}
          >
            {downloading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Preparing...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <Download className="mr-2 h-4 w-4" />
                Download {format ? (format === 'mp3' ? 'Audio' : 'Video') : (selectedFormat === 'mp3' ? 'Audio' : 'Video')}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoResult;
