
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import VideoResult from "@/components/VideoResult";
import LoadingState from "@/components/LoadingState";
import AdBanner from "@/components/AdBanner";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";
import { toast } from "sonner";

const Index = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);

  // Check for user's preferred color scheme on initial load
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

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
    <div className="min-h-screen flex flex-col google-gradient">
      <Toaster position="top-center" />
      <Header toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
      
      <main className="flex-1 max-w-xl mx-auto w-full px-4 pb-10">
        <div className="py-8 text-center">
          <h1 className="text-2xl font-medium mb-1 text-slate-800">YouTube Shorts Downloader</h1>
          <p className="text-sm text-slate-500">
            Download any YouTube video in high quality
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
            <div className="text-center py-10 google-card bg-white/60 backdrop-blur-sm mx-auto max-w-md p-8">
              <p className="text-sm text-slate-500">
                Paste a YouTube URL above and click Download
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
