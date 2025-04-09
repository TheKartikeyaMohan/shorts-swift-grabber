
import { Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

const LoadingState = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(66);
    }, 500);
    
    const timer2 = setTimeout(() => {
      setProgress(87);
    }, 1500);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="relative">
        <Circle className="w-12 h-12 text-muted animate-pulse" />
        <Circle className="w-12 h-12 text-youtube absolute top-0 left-0 animate-spin-slow opacity-75" strokeWidth={1} />
      </div>
      <p className="text-muted-foreground animate-pulse">Processing your Shorts video...</p>
      <div className="w-full max-w-md mt-2">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1 text-right">{progress}%</p>
      </div>
    </div>
  );
};

export default LoadingState;
