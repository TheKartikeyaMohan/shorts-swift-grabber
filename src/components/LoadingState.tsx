
import { Circle } from "lucide-react";

const LoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="relative">
        <Circle className="w-12 h-12 text-muted animate-pulse" />
        <Circle className="w-12 h-12 text-youtube absolute top-0 left-0 animate-spin-slow opacity-75" strokeWidth={1} />
      </div>
      <p className="text-muted-foreground animate-pulse">Processing your video...</p>
    </div>
  );
};

export default LoadingState;
