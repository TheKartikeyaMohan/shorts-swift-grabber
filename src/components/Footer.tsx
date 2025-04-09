
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-4 px-4 mt-auto border-t border-muted/10">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-center space-x-6 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/dmca" className="hover:text-foreground transition-colors">DMCA</Link>
        </div>
        <p className="text-xs text-center mt-2 text-muted-foreground">
          © {currentYear} YouTubeShorts.in
        </p>
      </div>
    </footer>
  );
};

export default Footer;
