
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clipboard } from "lucide-react";

interface SearchBarProps {
  onSearch: (url: string) => void;
  isLoading: boolean;
}

const SearchBar = ({ onSearch, isLoading }: SearchBarProps) => {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    
    // More flexible URL validation for YouTube Shorts
    if (!isValidYouTubeUrl(url)) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    
    // Store the URL in localStorage for later use
    localStorage.setItem("lastYoutubeUrl", url);
    
    onSearch(url);
  };

  const isValidYouTubeUrl = (url: string) => {
    // More permissive regex that accepts various YouTube URL formats
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/i;
    return youtubeRegex.test(url.trim());
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
        <Button 
          type="submit" 
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-base tracking-wide transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Download"}
        </Button>
      </form>
    </div>
  );
};

export default SearchBar;
