
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

      // Direct download if we already have the URL
      if (downloadUrl) {
        try {
          // Try fetching the download URL first to check if it's accessible
          const checkResponse = await fetch(downloadUrl, { method: 'HEAD' }).catch(() => null);
          
          if (checkResponse && checkResponse.ok) {
            // URL is accessible, start download
            startDownload(downloadUrl, title, format || selectedFormat);
            toast.success("Download started!");
            setDownloading(false);
            return;
          } else {
            console.log("Download URL not accessible, will try to regenerate", downloadUrl);
            // Continue to regenerate if URL is not accessible
          }
        } catch (error) {
          console.error("Error checking download URL:", error);
          // Continue to regenerate
        }
      }
      
      // If we reach here, we need to regenerate the download URL
      // Increment retry count for analytics
      setRetryCount(prev => prev + 1);
      
      // Call our edge function
      const { data, error } = await supabase.functions.invoke('download-youtube-shorts', {
        body: { 
          url: storedUrl, 
          format: selectedFormat,
          quality: quality || (selectedFormat === 'mp3' ? 'high' : '720p')
        }
      });
      
      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Download failed");
      }
      
      if (!data || !data.downloadUrl) {
        throw new Error("No download URL provided");
      }
      
      // Start the download
      startDownload(data.downloadUrl, title, data.format || selectedFormat);
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
    // Create a hidden link and click it to start the download
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || 'youtube_video'}.${format}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Open URL in new tab as fallback if download attribute isn't supported
    // or for certain URL types that browsers handle differently
    if (url.includes('youtube.com') || url.includes('rapidapi.com')) {
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
