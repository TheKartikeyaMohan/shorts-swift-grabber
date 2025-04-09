
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
}

interface VideoResultProps {
  videoInfo: VideoInfo;
}

const VideoResult = ({ videoInfo }: VideoResultProps) => {
  const { title, thumbnail, duration, author } = videoInfo;

  const downloadOptions = [
    { label: "MP4 - 720p", quality: "720p", format: "mp4" },
    { label: "MP4 - 360p", quality: "360p", format: "mp4" },
    { label: "MP3 - Audio", quality: "128kbps", format: "mp3" },
  ];

  const handleDownload = (quality: string, format: string) => {
    // In a real app, this would initiate the actual download
    // For demo purposes, we'll show a toast message
    console.log(`Downloading ${format} in ${quality}`);
    
    // Simulate download by opening a new tab (in a real app, this would be an API call)
    window.open(`#download-${format}-${quality}`, "_blank");
  };

  return (
    <Card className="w-full overflow-hidden shadow-md">
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={thumbnail} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-1 py-0.5 text-xs rounded">
          {duration}
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <h3 className="font-bold line-clamp-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{author}</p>
        
        <div className="space-y-2 pt-2">
          <p className="font-medium text-sm">Download:</p>
          <div className="grid grid-cols-1 gap-2">
            {downloadOptions.map((option) => (
              <Button
                key={option.label}
                onClick={() => handleDownload(option.quality, option.format)}
                variant={option.format === "mp3" ? "outline" : "default"}
                className={option.format === "mp3" ? "border-youtube/50 text-youtube dark:text-youtube" : "bg-youtube hover:bg-youtube-hover"}
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VideoResult;
