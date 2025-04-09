
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
          const contentType = response.headers.get('content-type');
          console.log("Content-Type:", contentType);
          
          // Check if it's a media file based on content type
          const isMedia = contentType && (
            contentType.includes('video/') || 
            contentType.includes('audio/') || 
            contentType.includes('application/octet-stream') ||
            // Additional common media MIME types
            contentType.includes('video/mp4') ||
            contentType.includes('audio/mpeg') ||
            contentType.includes('audio/mp3')
          );
          
          setIsDirectDownload(isMedia);
        } else {
          console.log("URL is not accessible or not a direct media file");
          setIsDirectDownload(false);
        }
      } catch (error) {
        console.log("Error testing URL:", error);
        // Some servers block HEAD requests but might allow GET
        // Let's try to download it directly anyway
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
          await fetchDirectDownloadLink(storedUrl);
          return;
        }
        
        // Implement the blob download method as suggested
        try {
          console.log("Fetching media file as blob for direct download");
          
          // Show a progress toast that we're preparing the download
          const toastId = toast.loading("Preparing download...");
          
          // Fetch the file as a blob
          const fileResponse = await fetch(downloadLink, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          
          if (!fileResponse.ok) {
            toast.dismiss(toastId);
            console.error(`Error fetching file: ${fileResponse.status}`);
            toast.error("Could not download file. Trying alternative method...");
            await fetchDirectDownloadLink(storedUrl);
            return;
          }
          
          // Get content type to determine file extension
          const contentType = fileResponse.headers.get('content-type') || '';
          console.log("Content-Type of download:", contentType);
          
          // Determine file extension based on content type or format
          let fileExtension = format || selectedFormat || 'mp4';
          if (contentType.includes('audio/mp3') || contentType.includes('audio/mpeg')) {
            fileExtension = 'mp3';
          } else if (contentType.includes('video/mp4')) {
            fileExtension = 'mp4';
          } else if (contentType.includes('video/webm')) {
            fileExtension = 'webm';
          }
          
          // Convert response to blob
          const blob = await fileResponse.blob();
          
          // Create a blob URL 
          const blobUrl = URL.createObjectURL(blob);
          
          // Create download element
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = `${title || 'youtube_video'}.${fileExtension}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Clean up the blob URL
          URL.revokeObjectURL(blobUrl);
          
          toast.dismiss(toastId);
          toast.success("Download started!");
          
          console.log("Download initiated successfully using blob method");
          
        } catch (blobError) {
          console.error("Error with blob download:", blobError);
          
          // Fallback to the old method
          console.log("Falling back to legacy download method");
          toast.info("Trying alternative download method...");
          
          // Create a direct link
          const link = document.createElement("a");
          link.href = downloadLink;
          link.download = `${title || 'youtube_video'}.${format || selectedFormat}`;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast.success("Download started!");
        }
      } else {
        // No download link available, need to fetch one
        console.log("No download link available, fetching from API");
        await fetchDirectDownloadLink(storedUrl);
      }
      
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

  const fetchDirectDownloadLink = async (youtubeUrl: string) => {
    console.log("Regenerating direct download link for:", youtubeUrl);
    setRetryCount(prev => prev + 1);
    
    // Show loading toast
    const toastId = toast.loading("Fetching direct download link...");
    
    try {
      // Call our edge function
      const { data, error } = await supabase.functions.invoke('download-youtube-shorts', {
        body: { 
          url: youtubeUrl, 
          format: selectedFormat,
          quality: quality || (selectedFormat === 'mp3' ? 'high' : '720p'),
          getDirectLink: true  // Request direct download link
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
      
      const downloadLink = data.directUrl || data.downloadUrl;
      
      if (!downloadLink) {
        toast.dismiss(toastId);
        toast.error("No download link provided");
        return;
      }
      
      console.log("Received download link from API:", downloadLink);
      
      // Implement blob download for the fresh link
      try {
        // Fetch the file as a blob
        const fileResponse = await fetch(downloadLink, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!fileResponse.ok) {
          console.error(`Error fetching file: ${fileResponse.status}`);
          toast.dismiss(toastId);
          toast.error("Could not download file directly");
          
          // Try opening it in a new tab as last resort
          window.open(downloadLink, "_blank");
          return;
        }
        
        // Get content type to determine file extension
        const contentType = fileResponse.headers.get('content-type') || '';
        console.log("Content-Type of download:", contentType);
        
        // Determine file extension based on content type or format
        let fileExtension = data.format || selectedFormat || 'mp4';
        if (contentType.includes('audio/mp3') || contentType.includes('audio/mpeg')) {
          fileExtension = 'mp3';
        } else if (contentType.includes('video/mp4')) {
          fileExtension = 'mp4';
        } else if (contentType.includes('video/webm')) {
          fileExtension = 'webm';
        }
        
        // Convert response to blob
        const blob = await fileResponse.blob();
        
        // Create a blob URL
        const blobUrl = URL.createObjectURL(blob);
        
        // Create download element
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${data.title || title || 'youtube_video'}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the blob URL
        URL.revokeObjectURL(blobUrl);
        
        toast.dismiss(toastId);
        toast.success("Download started!");
        
      } catch (blobError) {
        console.error("Error with blob download:", blobError);
        toast.dismiss(toastId);
        
        // Fallback to direct link
        try {
          // Create a direct link
          const link = document.createElement("a");
          link.href = downloadLink;
          link.download = `${data.title || title || 'youtube_video'}.${data.format || selectedFormat}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast.success("Download started!");
        } catch (directError) {
          console.error("Error with direct link:", directError);
          toast.error("Download failed. Opening link in new tab instead.");
          window.open(downloadLink, "_blank");
        }
      }
    } catch (error) {
      console.error("Error fetching direct download link:", error);
      toast.dismiss(toastId);
      toast.error("Failed to get direct download link");
      
      // Open original YouTube URL as last resort
      window.open(youtubeUrl, "_blank");
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {isDirectDownload === false && (
            <div className="text-xs text-amber-600 text-center pt-1">
              Direct download not available. Video may open in browser instead.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoResult;
