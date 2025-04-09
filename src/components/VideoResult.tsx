
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

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
    { label: "HD Video", quality: "720p", format: "mp4" },
    { label: "SD Video", quality: "360p", format: "mp4" },
    { label: "Audio Only", quality: "128kbps", format: "mp3" },
  ];

  const handleDownload = (quality: string, format: string) => {
    setDownloading(`${format}-${quality}`);
    
    // Simulate download success after 2 seconds
    setTimeout(() => {
      toast.success(`Your ${format === 'mp3' ? 'audio' : 'video'} is ready!`, {
        description: `Download started automatically.`,
      });
      setDownloading(null);
      
      // Simulate opening a download link
      const dummyDownloadUrl = `/download?format=${format}&quality=${quality}&t=${Date.now()}`;
      window.open(dummyDownloadUrl, "_blank");
    }, 2000);
  };

  return (
    <Card className="w-full overflow-hidden shadow-md rounded-xl">
      <div className="aspect-video relative overflow-hidden bg-black">
        <img 
          src={thumbnail} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-1 py-0.5 text-xs rounded">
            {duration}
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-4">
        <h3 className="font-bold text-xl line-clamp-2">{title}</h3>
        {author && <p className="text-sm text-muted-foreground">{author}</p>}
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {downloadOptions.map((option) => (
              <Button
                key={option.quality}
                variant={selectedFormat === option.quality ? "default" : "outline"}
                className={`h-14 ${selectedFormat === option.quality ? "bg-youtube hover:bg-youtube/90" : "border border-youtube/30 text-youtube hover:bg-youtube/10"}`}
                onClick={() => setSelectedFormat(option.quality)}
                size="lg"
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
            className="w-full bg-youtube hover:bg-youtube/90 h-14 rounded-full text-lg font-medium"
            disabled={!!downloading}
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            {downloading ? "Starting Download..." : "Download Now"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default VideoResult;
