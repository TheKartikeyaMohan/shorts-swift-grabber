
import { useState } from "react";
import { Youtube, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SearchBarProps {
  onSearch: (url: string) => void;
  isLoading: boolean;
}

const SearchBar = ({ onSearch, isLoading }: SearchBarProps) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a YouTube Shorts URL");
      return;
    }
    
    // Basic URL validation
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    
    onSearch(url);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="youtube-search-container">
          <Youtube className="youtube-icon text-youtube" />
          <Input
            type="text"
            placeholder="Paste YouTube Shorts URL here"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="youtube-search-input"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          className="w-full bg-youtube hover:bg-youtube/90 text-white font-medium rounded-full py-3 h-auto"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Download"}
        </Button>
      </form>
    </div>
  );
};

export default SearchBar;
