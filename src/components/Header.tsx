
import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const Header = ({ toggleTheme, isDarkMode }: HeaderProps) => {
  return (
    <header className="w-full py-4 px-4 flex justify-between items-center">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold">
          <span className="text-youtube">YouTube</span>
          <span>Shorts.in</span>
        </h1>
      </div>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </header>
  );
};

export default Header;
