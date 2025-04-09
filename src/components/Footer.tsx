
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-6 px-4 mt-8 border-t">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/dmca" className="hover:text-foreground transition-colors">DMCA</Link>
        </div>
        <p className="text-xs text-center mt-4 text-muted-foreground">
          © {currentYear} YouTubeShorts.in - Not affiliated with YouTube
        </p>
      </div>
    </footer>
  );
};

export default Footer;
