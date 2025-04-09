
import { Link } from "react-router-dom";
import { BadgePercent } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-6 px-4 mt-auto border-t border-gray-200 bg-white/80">
      <div className="max-w-xl mx-auto">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center mb-2">
            <BadgePercent className="h-3.5 w-3.5 text-red-500 mr-1.5" />
            <span className="text-xs text-slate-700 font-medium">Free YouTube Shorts Downloader</span>
          </div>
          <div className="flex justify-center space-x-8 text-xs text-slate-600">
            <Link to="/privacy" className="hover:text-red-600 transition-colors font-medium">Privacy</Link>
            <Link to="/terms" className="hover:text-red-600 transition-colors font-medium">Terms</Link>
            <Link to="/dmca" className="hover:text-red-600 transition-colors font-medium">DMCA</Link>
          </div>
        </div>
        <p className="text-xs text-center mt-3 text-slate-500">
          © {currentYear} YouTubeShorts.in • Not affiliated with YouTube
        </p>
      </div>
    </footer>
  );
};

export default Footer;
