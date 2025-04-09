
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
          title: "Amazing YouTube Shorts Video - Top trending video that everyone is watching right now #shorts",
          thumbnail: "https://picsum.photos/seed/shorts/640/360", // Random placeholder image
          duration: "0:58",
          author: "Popular Creator",
        };
        
        setVideoInfo(mockVideoInfo);
        setIsLoading(false);
        
        // Success toast
        toast.success("Video found!", {
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
        <div className="py-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Download YouTube Shorts</h1>
          <p className="text-muted-foreground">
            Download your favorite YouTube Shorts videos in MP4 or MP3 format for free!
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
              <p className="text-muted-foreground">
                Paste a YouTube Shorts URL and click Download
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold">How to Download YouTube Shorts</h2>
          <ol className="list-decimal pl-6 space-y-2 text-sm">
            <li>Copy the URL of the YouTube Shorts video you want to download</li>
            <li>Paste the URL in the search box above</li>
            <li>Click on the "Download" button</li>
            <li>Select your preferred format (MP4 or MP3)</li>
            <li>Enjoy your downloaded video!</li>
          </ol>
          
          <h2 className="text-xl font-bold mt-6">About YouTubeShorts.in</h2>
          <p className="text-sm text-muted-foreground">
            YouTubeShorts.in is a free online tool that allows you to download YouTube Shorts videos
            without watermark in various formats. Our service is fast, reliable, and doesn't require any registration.
            We support high-quality downloads, including 720p, 360p, and MP3 audio formats.
          </p>
        </div>
      </main>
      
      <Footer />
      <AdBanner position="bottom" />
    </div>
  );
};

export default Index;
