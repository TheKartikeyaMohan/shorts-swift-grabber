
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const Header = () => {
  const isMobile = useIsMobile();
  
  return (
    <header className={`w-full ${isMobile ? 'py-6' : 'py-4'} px-4 flex justify-between items-center border-b border-gray-200 bg-white shadow-sm`}>
      <Link to="/" className="flex items-center">
        <h1 className="text-lg font-medium">
          <span className="text-red-600 font-bold">YouTube</span>
          <span className="text-slate-800 font-bold">Shorts</span>
          <span className="text-slate-500 text-sm">.in</span>
        </h1>
      </Link>
    </header>
  );
};

export default Header;
