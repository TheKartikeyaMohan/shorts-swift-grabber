
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
        <div className="relative google-card">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Paste YouTube URL here"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-12 pl-4 pr-20 rounded-lg border-transparent focus:border-blue-500 focus:ring-0 shadow-none"
            disabled={isLoading}
          />
          <Button
            type="button"
            onClick={handlePaste}
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center space-x-1 text-xs bg-transparent hover:bg-transparent text-muted-foreground hover:text-blue-500"
            disabled={isLoading}
          >
            <Clipboard className="h-4 w-4" /> 
            <span>Paste</span>
          </Button>
        </div>
        <Button 
          type="submit" 
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm tracking-wide transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Download"}
        </Button>
      </form>
    </div>
  );
};

export default SearchBar;
