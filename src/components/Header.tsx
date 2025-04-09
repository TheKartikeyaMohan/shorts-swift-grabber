
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const Header = ({ toggleTheme, isDarkMode }: HeaderProps) => {
  return (
    <header className="w-full py-4 px-4 flex justify-between items-center border-b border-slate-200">
      <div className="flex items-center">
        <h1 className="text-lg font-medium">
          <span className="text-blue-600">YouTube</span>
          <span className="text-slate-700">Shorts</span>
          <span className="text-slate-500 text-sm">.in</span>
        </h1>
      </div>
      <Button 
        variant="outline" 
        size="icon"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="text-slate-500 border border-slate-200 hover:bg-slate-50"
      >
        {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
};

export default Header;
