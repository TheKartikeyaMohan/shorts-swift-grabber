
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, Download } from "lucide-react";

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
}

interface VideoResultProps {
  videoInfo: VideoInfo;
}

const VideoResult = ({ videoInfo }: VideoResultProps) => {
  const { title, thumbnail, duration, author } = videoInfo;
  const [selectedFormat, setSelectedFormat] = useState<string>("720p");
  const [downloading, setDownloading] = useState<string | null>(null);

  // Use formats from backend or fallback to default options
  const downloadOptions = videoInfo.formats || [
    { label: "HD", quality: "720p", format: "mp4" },
    { label: "SD", quality: "360p", format: "mp4" },
    { label: "Audio", quality: "128kbps", format: "mp3" },
  ];

  const handleDownload = async (quality: string, format: string) => {
    setDownloading(`${format}-${quality}`);
    
    try {
      const storedUrl = localStorage.getItem("lastYoutubeUrl");
      
      if (!storedUrl) {
        toast.error("Missing video URL. Please search again.");
        setDownloading(null);
        return;
      }
      
      toast.info("Preparing your download...");
      
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: storedUrl,
          format,
          quality,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Download error:", errorData);
        throw new Error(errorData.error || "Download failed");
      }
      
      const data = await response.json();
      
      // Create a hidden link and click it to start the download
      if (data.downloadUrl) {
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = `${title || 'youtube_video'}.${format}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Download started");
      } else {
        throw new Error("No download URL provided");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloading(null);
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
      </div>
      
      <div className="p-5 space-y-4">
        <h3 className="font-medium text-lg line-clamp-2">{title}</h3>
        {author && <p className="text-xs text-gray-500">{author}</p>}
        
        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            {downloadOptions.map((option) => (
              <Button
                key={option.quality}
                variant="outline"
                className={`flex-1 h-10 rounded-full ${
                  selectedFormat === option.quality 
                    ? "border-red-500 bg-red-50 text-red-700" 
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setSelectedFormat(option.quality)}
              >
                {selectedFormat === option.quality && (
                  <Check className="mr-1 h-3 w-3" />
                )}
                {option.label}
              </Button>
            ))}
          </div>
          
          <Button
            onClick={() => {
              const option = downloadOptions.find(opt => opt.quality === selectedFormat);
              if (option) {
                handleDownload(option.quality, option.format);
              }
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white h-11 font-medium text-sm rounded-full tracking-wide transition-colors"
            disabled={!!downloading}
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
                Download
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoResult;
