
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const Header = ({ toggleTheme, isDarkMode }: HeaderProps) => {
  return (
    <header className="w-full py-4 px-4 flex justify-between items-center border-b border-muted/10">
      <div className="flex items-center">
        <h1 className="text-lg font-medium">
          <span>YouTubeShorts.in</span>
        </h1>
      </div>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="text-muted-foreground"
      >
        {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
};

export default Header;
