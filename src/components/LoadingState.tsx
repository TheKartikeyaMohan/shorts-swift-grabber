
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

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
      <div className="w-full max-w-md">
        <Progress value={progress} className="h-1 bg-muted/20" />
        <p className="text-sm text-muted-foreground mt-2 text-center">Processing your video...</p>
      </div>
    </div>
  );
};

export default LoadingState;
