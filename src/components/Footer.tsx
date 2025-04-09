
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-6 px-4 mt-auto border-t border-slate-200">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-center space-x-8 text-xs text-slate-500">
          <Link to="/privacy" className="hover:text-blue-600 transition-colors font-medium">Privacy</Link>
          <Link to="/terms" className="hover:text-blue-600 transition-colors font-medium">Terms</Link>
          <Link to="/dmca" className="hover:text-blue-600 transition-colors font-medium">DMCA</Link>
        </div>
        <p className="text-xs text-center mt-3 text-slate-400">
          © {currentYear} YouTubeShorts.in
        </p>
      </div>
    </footer>
  );
};

export default Footer;
