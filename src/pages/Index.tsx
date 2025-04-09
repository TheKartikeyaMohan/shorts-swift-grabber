
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import VideoResult from "@/components/VideoResult";
import LoadingState from "@/components/LoadingState";
import AdBanner from "@/components/AdBanner";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);

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
          title: "Amazing YouTube Shorts Video - Top trending video #shorts",
          thumbnail: "https://picsum.photos/seed/shorts/640/360", // Random placeholder image
          duration: "0:58",
          author: "Popular Creator",
        };
        
        setVideoInfo(mockVideoInfo);
        setIsLoading(false);
        
        // Success toast
        toast.success("Video found successfully!", {
          description: "Choose your download format below.",
        });
      }, 3000);
      
      // Real API call would look like this:
      // const response = await fetch('/api/fetch', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ url }),
      // });
      // const data = await response.json();
      // if (data.error) {
      //   throw new Error(data.error);
      // }
      // setVideoInfo(data);
      // setIsLoading(false);
      
    } catch (error) {
      console.error("Error fetching video:", error);
      setIsLoading(false);
      toast.error("Error processing video", {
        description: "Please check the URL and try again.",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-center" />
      <Header toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
      
      <main className="flex-1 max-w-xl mx-auto w-full px-4 pb-20">
        <div className="py-8 text-center">
          <h1 className="text-3xl font-bold mb-2">YouTube Shorts Downloader</h1>
          <p className="text-muted-foreground text-lg">
            Save videos in high quality - fast & free!
          </p>
        </div>
        
        <AdBanner position="top" />
        
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        
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
            <div className="text-center py-8">
              <Button 
                variant="link" 
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center mx-auto mb-2 text-muted-foreground"
              >
                How it works <ChevronDown className={`ml-1 transition-transform ${showInstructions ? 'rotate-180' : ''}`} size={16} />
              </Button>
              
              {showInstructions && (
                <div className="bg-muted/30 p-6 rounded-xl text-left mt-4 space-y-4">
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Copy the link of any YouTube Shorts video</li>
                    <li>Click the "Paste" button or paste URL in the box</li>
                    <li>Click the "Download Now" button</li>
                    <li>Select your preferred quality</li>
                    <li>Download starts automatically!</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
        
        {!videoInfo && !isLoading && (
          <div className="mt-8 rounded-lg bg-muted/20 p-6">
            <h2 className="text-xl font-bold mb-3">About YouTubeShorts.in</h2>
            <p className="text-muted-foreground">
              A simple tool to download YouTube Shorts videos without watermarks. 
              Works with all devices - no apps or registration needed!
            </p>
          </div>
        )}
      </main>
      
      <Footer />
      <AdBanner position="bottom" />
    </div>
  );
};

export default Index;
