
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck } from "lucide-react";

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
      <div className="w-full max-w-xl yt-card p-6 bg-white">
        <Progress value={progress} className="h-1 bg-gray-100" />
        <div className="flex items-center justify-center mt-4">
          <ShieldCheck className="h-4 w-4 text-green-500 mr-2 animate-pulse" />
          <p className="text-sm text-gray-600">
            Securely analyzing your video...
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
