
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface RetryBackendConnectionProps {
  onRetrySuccess: () => void;
}

const RetryBackendConnection = ({ onRetrySuccess }: RetryBackendConnectionProps) => {
  const [isChecking, setIsChecking] = useState(false);

  const checkBackendConnection = async () => {
    setIsChecking(true);
    try {
      toast.info("Checking backend connection...");
      
      const response = await fetch("/api/health", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error("Backend server is still not available");
      }
      
      toast.success("Backend server is now connected!");
      onRetrySuccess();
    } catch (error) {
      console.error("Backend connection check failed:", error);
      toast.error("Backend server is still not available. Please ensure it's running.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={checkBackendConnection}
      disabled={isChecking}
      className="flex items-center text-xs"
    >
      <RefreshCw className={`h-3 w-3 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} />
      {isChecking ? "Checking..." : "Retry Connection"}
    </Button>
  );
};

export default RetryBackendConnection;
