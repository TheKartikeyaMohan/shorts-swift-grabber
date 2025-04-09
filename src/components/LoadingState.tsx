
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

const LoadingState = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(30);
    }, 300);
    
    const timer2 = setTimeout(() => {
      setProgress(65);
    }, 1000);
    
    const timer3 = setTimeout(() => {
      setProgress(85);
    }, 1600);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-5">
      <div className="w-full max-w-md google-card p-6 bg-white">
        <Progress value={progress} className="h-1 bg-slate-100" />
        <p className="text-sm text-slate-500 mt-4 text-center">
          Analyzing your video...
        </p>
      </div>
    </div>
  );
};

export default LoadingState;
