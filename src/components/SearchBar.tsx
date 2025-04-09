
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      }
    } catch (error) {
      toast.error("Unable to paste. Please paste manually.");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Paste YouTube URL here"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-12 pl-4 pr-20 rounded-md border-muted/30 focus:border-muted/50 focus:ring-0"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handlePaste}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wider font-medium text-muted-foreground"
            disabled={isLoading}
          >
            Paste
          </button>
        </div>
        <Button 
          type="submit" 
          className="w-full h-12 bg-black hover:bg-black/90 text-white font-medium rounded-md text-sm uppercase tracking-wider"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Download"}
        </Button>
      </form>
    </div>
  );
};

export default SearchBar;
