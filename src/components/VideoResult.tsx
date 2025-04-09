
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
    <div className="w-full max-w-md mx-auto border border-muted/20 rounded-md overflow-hidden bg-background">
      <div className="aspect-video relative overflow-hidden bg-black">
        <img 
          src={thumbnail} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white px-1 py-0.5 text-xs rounded">
            {duration}
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-4">
        <h3 className="font-medium text-lg line-clamp-2">{title}</h3>
        {author && <p className="text-xs text-muted-foreground">{author}</p>}
        
        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            {downloadOptions.map((option) => (
              <Button
                key={option.quality}
                variant={selectedFormat === option.quality ? "default" : "outline"}
                className={`flex-1 h-10 ${selectedFormat === option.quality ? "bg-black hover:bg-black/90 text-white" : "border-muted/30 hover:bg-muted/10"}`}
                onClick={() => setSelectedFormat(option.quality)}
              >
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
            className="w-full bg-black hover:bg-black/90 text-white h-10 font-medium text-sm uppercase tracking-wider"
            disabled={!!downloading}
          >
            {downloading ? "Starting..." : "Download"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoResult;
