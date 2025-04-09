
import { useState } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import VideoResult from "@/components/VideoResult";
import LoadingState from "@/components/LoadingState";
import AdBanner from "@/components/AdBanner";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ShieldCheck, IndianRupee } from "lucide-react";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const isMobile = useIsMobile();

  const handleSearch = async (url: string) => {
    setIsLoading(true);
    setVideoInfo(null);
    
    try {
      toast.info("Searching for video...");
      
      // Make a request to our backend API
      const response = await fetch("/api/video-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        let errorMessage = "Failed to fetch video info";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setVideoInfo(data);
      toast.success("Video found!");
    } catch (error) {
      console.error("Error fetching video:", error);
      toast.error(error instanceof Error ? error.message : "Error processing video");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col yt-gradient">
      <Toaster position="top-center" />
      <Header />
      
      <main className={`flex-1 max-w-4xl mx-auto w-full px-4 pb-10 ${isMobile ? 'pt-6' : ''}`}>
        <div className={`${isMobile ? 'py-10' : 'py-10'} text-center`}>
          <h1 className="text-2xl font-bold mb-3 text-slate-800">YouTube Shorts Downloader</h1>
          <p className="text-sm text-slate-500 px-2">
            Download any YouTube Shorts video in high quality - <span className="bg-gradient-to-r from-red-50 to-red-100 px-1.5 py-0.5 rounded-sm font-medium">100% Free</span>
          </p>
          <div className="flex items-center justify-center mt-5">
            <ShieldCheck className="h-3.5 w-3.5 text-green-600 mr-1.5" />
            <span className="text-xs text-slate-600">Trusted by millions of users</span>
            <span className="mx-3 text-slate-300">•</span>
            <IndianRupee className="h-3 w-3 text-orange-500 mr-1" />
            <span className="text-xs text-slate-600">Made in India</span>
          </div>
        </div>
        
        <AdBanner position="top" />
        
        <div className={`${isMobile ? 'mt-10' : 'mt-8'}`}>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
        
        <div className={`${isMobile ? 'my-10' : 'my-8'}`}>
          {isLoading ? (
            <LoadingState />
          ) : videoInfo ? (
            <>
              <AdBanner position="middle" />
              <div className={`${isMobile ? 'mt-8' : 'mt-6'}`}>
                <VideoResult videoInfo={videoInfo} />
              </div>
            </>
          ) : (
            <div className={`text-center ${isMobile ? 'py-14' : 'py-12'} yt-card bg-white/60 backdrop-blur-sm mx-auto max-w-xl p-8 rounded-xl`}>
              <div className="flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm font-medium text-slate-700">Secure & Trusted Service</span>
              </div>
              <p className="text-sm text-slate-500">
                Paste a YouTube Shorts URL above and click Download
              </p>
              <p className="text-xs mt-4 text-slate-400">
                No registration required · <span className="font-medium text-red-500">Free</span> · No watermarks
              </p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
      <AdBanner position="bottom" />
    </div>
  );
};

export default Index;
