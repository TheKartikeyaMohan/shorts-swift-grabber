
import { useState } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import VideoResult from "@/components/VideoResult";
import LoadingState from "@/components/LoadingState";
import AdBanner from "@/components/AdBanner";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);

  const handleSearch = async (url: string) => {
    setIsLoading(true);
    setVideoInfo(null);
    
    try {
      // Simulate API call with setTimeout
      // In production, this would be a real fetch to your backend
      setTimeout(() => {
        // Mock data for demonstration
        const mockVideoInfo = {
          title: "YouTube Shorts Video #shorts",
          thumbnail: "https://picsum.photos/seed/shorts/640/360", // Random placeholder image
          duration: "0:58",
          author: "Creator",
        };
        
        setVideoInfo(mockVideoInfo);
        setIsLoading(false);
        
        // Success toast
        toast.success("Video found");
      }, 3000);
    } catch (error) {
      console.error("Error fetching video:", error);
      setIsLoading(false);
      toast.error("Error processing video");
    }
  };

  return (
    <div className="min-h-screen flex flex-col yt-gradient">
      <Toaster position="top-center" />
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pb-10">
        <div className="py-10 text-center">
          <h1 className="text-2xl font-bold mb-2 text-slate-800">YouTube Shorts Downloader</h1>
          <p className="text-sm text-slate-500">
            Download any YouTube Shorts video in high quality - <span className="bg-gradient-to-r from-red-50 to-red-100 px-1.5 py-0.5 rounded-sm font-medium">100% Free</span>
          </p>
        </div>
        
        <AdBanner position="top" />
        
        <div className="mt-8">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
        
        <div className="my-8">
          {isLoading ? (
            <LoadingState />
          ) : videoInfo ? (
            <>
              <AdBanner position="middle" />
              <div className="mt-6">
                <VideoResult videoInfo={videoInfo} />
              </div>
            </>
          ) : (
            <div className="text-center py-12 yt-card bg-white/60 backdrop-blur-sm mx-auto max-w-xl p-8 rounded-xl">
              <p className="text-sm text-slate-500">
                Paste a YouTube URL above and click Download
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
