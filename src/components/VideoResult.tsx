
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration?: string;
  author?: string;
}

interface VideoResultProps {
  videoInfo: VideoInfo;
}

const VideoResult = ({ videoInfo }: VideoResultProps) => {
  const { title, thumbnail, duration, author } = videoInfo;
  const [selectedFormat, setSelectedFormat] = useState<string>("720p");
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadOptions = [
    { label: "HD", quality: "720p", format: "mp4" },
    { label: "SD", quality: "360p", format: "mp4" },
    { label: "Audio", quality: "128kbps", format: "mp3" },
  ];

  const handleDownload = (quality: string, format: string) => {
    setDownloading(`${format}-${quality}`);
    
    // Simulate download success after 2 seconds
    setTimeout(() => {
      toast.success(`Download started`);
      setDownloading(null);
      
      // Simulate opening a download link
      const dummyDownloadUrl = `/download?format=${format}&quality=${quality}&t=${Date.now()}`;
      window.open(dummyDownloadUrl, "_blank");
    }, 2000);
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
            {downloading ? "Preparing..." : "Download"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoResult;
