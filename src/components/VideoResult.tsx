
import { Download, Check } from "lucide-react";
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
    { label: "MP4 - 720p (HD)", quality: "720p", format: "mp4" },
    { label: "MP4 - 360p (SD)", quality: "360p", format: "mp4" },
    { label: "MP3 - Audio Only", quality: "128kbps", format: "mp3" },
  ];

  const handleDownload = (quality: string, format: string) => {
    setDownloading(`${format}-${quality}`);
    
    // Simulate download success after 2 seconds
    setTimeout(() => {
      toast.success(`Your ${format.toUpperCase()} file is ready!`, {
        description: `${title} has been downloaded successfully.`,
      });
      setDownloading(null);
      
      // Simulate opening a download link
      const dummyDownloadUrl = `/download?format=${format}&quality=${quality}&t=${Date.now()}`;
      window.open(dummyDownloadUrl, "_blank");
    }, 2000);
  };

  return (
    <Card className="w-full overflow-hidden shadow-md rounded-xl">
      <div className="aspect-video relative overflow-hidden">
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
      
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-lg line-clamp-2">{title}</h3>
        {author && <p className="text-sm text-muted-foreground">{author}</p>}
        
        <div className="space-y-3 pt-2">
          <div className="bg-muted/40 p-3 rounded-lg">
            <p className="font-medium text-sm mb-2">Select Format:</p>
            <div className="grid grid-cols-3 gap-2">
              {downloadOptions.map((option) => (
                <Button
                  key={option.label}
                  variant={selectedFormat === option.quality ? "default" : "outline"}
                  className={selectedFormat === option.quality ? "bg-youtube hover:bg-youtube/90" : "border-youtube/30 text-youtube hover:bg-youtube/10"}
                  size="sm"
                  onClick={() => setSelectedFormat(option.quality)}
                >
                  {option.format.toUpperCase()}
                  <span className="text-xs ml-1">{option.quality}</span>
                </Button>
              ))}
            </div>
          </div>
          
          <Button
            onClick={() => {
              const option = downloadOptions.find(opt => opt.quality === selectedFormat);
              if (option) {
                handleDownload(option.quality, option.format);
              }
            }}
            className="w-full bg-youtube hover:bg-youtube/90 h-12 rounded-full"
            disabled={!!downloading}
          >
            {downloading ? (
              <>
                <Check className="w-5 h-5 mr-2 animate-pulse" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download {selectedFormat}
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground mt-2">
            No registration or software needed. 100% free.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default VideoResult;
