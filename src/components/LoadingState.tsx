
import { Youtube } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

const LoadingState = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(35);
    }, 400);
    
    const timer2 = setTimeout(() => {
      setProgress(65);
    }, 1100);
    
    const timer3 = setTimeout(() => {
      setProgress(85);
    }, 1800);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center animate-pulse">
          <Youtube className="w-12 h-12 text-youtube" />
        </div>
        <div className="absolute inset-0 border-4 border-t-youtube border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
      
      <div className="text-center space-y-4 w-full max-w-md">
        <p className="text-lg font-medium">Finding your video...</p>
        <Progress value={progress} className="h-3 rounded-full" />
        <p className="text-sm text-muted-foreground">{progress < 80 ? "Analyzing video source..." : "Almost ready..."}</p>
      </div>
    </div>
  );
};

export default LoadingState;
