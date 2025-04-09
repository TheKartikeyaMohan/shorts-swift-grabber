
import { useState, useRef } from "react";
import { Youtube, Clipboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        toast.success("URL pasted!");
      }
    } catch (error) {
      toast.error("Unable to paste. Please paste manually.");
      // Focus the input for manual pasting
      inputRef.current?.focus();
    }
  };

  const clearInput = () => {
    setUrl("");
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="youtube-search-container relative">
          <Youtube className="youtube-icon text-youtube" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Paste YouTube Shorts URL here"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="youtube-search-input pr-20"
            disabled={isLoading}
          />
          {url ? (
            <button 
              type="button"
              onClick={clearInput}
              className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoading}
            >
              <X size={18} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={handlePaste}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-muted hover:bg-muted/80 text-muted-foreground p-1.5 rounded-md transition-colors"
            disabled={isLoading}
          >
            <Clipboard size={18} />
          </button>
        </div>
        <Button 
          type="submit" 
          className="w-full bg-youtube hover:bg-youtube/90 text-white font-medium rounded-full py-6 h-auto text-lg"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Download Now"}
        </Button>
      </form>
    </div>
  );
};

export default SearchBar;
