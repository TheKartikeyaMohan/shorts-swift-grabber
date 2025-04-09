
import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration?: string;
  author?: string;
  downloadUrl?: string;
  quality?: string;
  format?: string;
  isAudio?: boolean;
  formats?: Array<{
    quality: string;
    format: string;
    label: string;
  }>;
}

// Configuration - replace this with your actual server URL when deployed
const API_SERVER_URL = import.meta.env.VITE_API_SERVER_URL || "http://localhost:3001"; 
const SERVER_HEALTH_TIMEOUT = 3000; // Shorter timeout for health check (3s)

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("mp4");
  const [selectedQuality, setSelectedQuality] = useState<string>("720p");
  const [isExpressServerAvailable, setIsExpressServerAvailable] = useState(false);
  const isMobile = useIsMobile();

  // Check if Express server is available on component mount
  useEffect(() => {
    const checkExpressServer = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SERVER_HEALTH_TIMEOUT);
        
        const response = await fetch(`${API_SERVER_URL}/api/health`, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Express server status:", data);
          setIsExpressServerAvailable(true);
        }
      } catch (error) {
        console.log("Express server not available, will use Edge Function instead");
        setIsExpressServerAvailable(false);
      }
    };
    
    checkExpressServer();
  }, []);

  const handleSearch = async (url: string, format: string, quality?: string) => {
    setIsLoading(true);
    setVideoInfo(null);
    setSelectedFormat(format);
    if (quality) setSelectedQuality(quality);
    
    try {
      toast.info("Processing your download request...");
      
      if (isExpressServerAvailable) {
        // Use Express server with yt-dlp if available
        await handleExpressDownload(url, format, quality);
      } else {
        // Fallback to Supabase Edge Function
        await handleEdgeFunctionDownload(url, format, quality);
      }
    } catch (error) {
      console.error("Error processing download:", error);
      toast.error(error instanceof Error ? error.message : "Error processing video");
      
      // Create a basic fallback response in case of errors
      // This allows the user to at least see some UI
      const videoId = extractVideoId(url);
      if (videoId) {
        const fallbackInfo: VideoInfo = {
          title: "YouTube Shorts Video",
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: "Unknown",
          author: "YouTube Creator",
          downloadUrl: url, // Just link back to YouTube as fallback
          quality: quality || "720p",
          format: format,
          isAudio: format === "mp3"
        };
        
        setVideoInfo(fallbackInfo);
        toast.error("Using fallback mode due to server error. Download may not work.");
      }
      
      setIsLoading(false);
    }
  };

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleExpressDownload = async (url: string, format: string, quality?: string) => {
    try {
      // First get video info
      const infoResponse = await fetch(`${API_SERVER_URL}/api/video-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!infoResponse.ok) {
        const errorData = await infoResponse.json();
        throw new Error(errorData.error || "Failed to fetch video info");
      }
      
      const infoData = await infoResponse.json();
      
      // Now request the download with the specified format/quality
      const downloadResponse = await fetch(`${API_SERVER_URL}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url,
          format,
          quality: quality || (format === 'mp4' ? '720p' : undefined)
        })
      });
      
      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json();
        throw new Error(errorData.error || "Failed to download video");
      }
      
      const downloadData = await downloadResponse.json();
      
      // Combine info and download data
      const videoData: VideoInfo = {
        title: infoData.title || "YouTube Video",
        thumbnail: infoData.thumbnail || "",
        duration: infoData.duration || "",
        author: infoData.author || "",
        downloadUrl: `${API_SERVER_URL}${downloadData.downloadUrl}`,
        quality: downloadData.quality || quality || "",
        format: downloadData.format || format,
        isAudio: format === "mp3",
        formats: infoData.formats || []
      };
      
      setVideoInfo(videoData);
      toast.success("Video ready for download!");
    } catch (error) {
      console.error("Express server error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdgeFunctionDownload = async (url: string, format: string, quality?: string) => {
    try {
      // Try multiple times if needed with exponential backoff
      let attempts = 0;
      const maxAttempts = 3;
      let error: Error | null = null;
      
      while (attempts < maxAttempts) {
        try {
          // Call our Supabase Edge Function with format AND quality
          const { data, error: supabaseError } = await supabase.functions.invoke('download-youtube-shorts', {
            body: { 
              url: url,
              format: format,
              quality: quality || (format === 'mp4' ? '720p' : 'high')
            }
          });
          
          if (supabaseError) {
            console.error(`Edge function error (attempt ${attempts + 1}):`, supabaseError);
            throw new Error(supabaseError.message || "Failed to fetch video");
          }
          
          if (!data) {
            throw new Error("No data returned from API");
          }
          
          // Store the URL and format in localStorage for the download function
          localStorage.setItem("lastYoutubeUrl", url);
          localStorage.setItem("lastFormat", format);
          if (quality) localStorage.setItem("lastQuality", quality);
          
          // Prepare video info from the response
          const videoData: VideoInfo = {
            title: data.title || "YouTube Video",
            thumbnail: data.thumbnail || "",
            duration: data.duration || "",
            author: data.author || "",
            downloadUrl: data.downloadUrl,
            quality: data.quality || quality || "",
            format: data.format || format,
            isAudio: data.isAudio || format === "mp3",
            formats: [
              { label: "HD", quality: "720p", format: "mp4" },
              { label: "SD", quality: "480p", format: "mp4" },
              { label: "Low", quality: "360p", format: "mp4" },
              { label: "Audio", quality: "high", format: "mp3" },
            ]
          };
          
          setVideoInfo(videoData);
          toast.success("Video ready for download!");
          return; // Success, exit the retry loop
        } catch (attemptError) {
          error = attemptError instanceof Error ? attemptError : new Error(String(attemptError));
          attempts++;
          
          if (attempts < maxAttempts) {
            // Exponential backoff: 1s, 2s, 4s...
            const delay = Math.pow(2, attempts - 1) * 1000;
            toast.info(`Retrying download (attempt ${attempts + 1} of ${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If we're here, all attempts failed
      if (error) throw error;
    } catch (error) {
      console.error("Edge function final error:", error);
      throw error;
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
          
          {isExpressServerAvailable && (
            <div className="mt-2 text-xs inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded">
              <span className="mr-1">●</span> Using high-speed yt-dlp server
            </div>
          )}
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
                <VideoResult videoInfo={videoInfo} selectedFormat={selectedFormat} />
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
              <p className="text-xs mt-2 text-slate-400">
                Works with all YouTube Shorts and regular videos
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
