
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface SearchBarProps {
  onSearch: (url: string, format: string) => void;
  isLoading: boolean;
}

const SearchBar = ({ onSearch, isLoading }: SearchBarProps) => {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("mp4");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    
    // Improved YouTube URL validation for videos and shorts
    if (!isValidYouTubeUrl(url)) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    
    // Standardize URL format before sending
    const standardizedUrl = standardizeYouTubeUrl(url.trim());
    
    // Store the URL in localStorage for later use
    localStorage.setItem("lastYoutubeUrl", standardizedUrl);
    localStorage.setItem("lastFormat", format);
    
    onSearch(standardizedUrl, format);
  };

  // Improved validation for YouTube URLs
  const isValidYouTubeUrl = (url: string) => {
    // Regex for various YouTube URL formats including shorts and regular videos
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(shorts\/|watch\?v=)|youtu\.be\/).+/i;
    return youtubeRegex.test(url.trim());
  };
  
  // Function to standardize YouTube URL format
  const standardizeYouTubeUrl = (url: string) => {
    // Ensure it has proper protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    return url;
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch (error) {
      toast.error("Unable to paste. Please paste manually.");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative rounded-full border border-gray-300 shadow-sm overflow-hidden bg-white focus-within:shadow-md transition-shadow">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Paste YouTube URL here"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-14 pl-6 pr-28 rounded-full border-0 shadow-none text-base focus-visible:ring-0 placeholder:text-gray-400"
            disabled={isLoading}
          />
          <Button
            type="button"
            onClick={handlePaste}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
            disabled={isLoading}
          >
            paste
          </Button>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Label htmlFor="format-select" className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Format
            </Label>
            <Select value={format} onValueChange={setFormat} disabled={isLoading}>
              <SelectTrigger id="format-select" className="h-12 rounded-lg bg-white">
                <SelectValue placeholder="Select Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">Video (MP4)</SelectItem>
                <SelectItem value="mp3">Audio Only (MP3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Button 
              type="submit" 
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-base tracking-wide transition-colors mt-7"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Download"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
