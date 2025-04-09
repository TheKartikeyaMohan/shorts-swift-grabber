
interface AdBannerProps {
  position: 'top' | 'middle' | 'bottom';
}

const AdBanner = ({ position }: AdBannerProps) => {
  // Different styling based on position
  const getAdStyles = () => {
    switch (position) {
      case 'top':
        return 'h-9 my-4 bg-gray-50 border border-gray-200 rounded-md';
      case 'middle':
        return 'h-10 my-6 bg-gray-50 border border-gray-200 rounded-md';
      case 'bottom':
        return 'h-8 fixed bottom-0 left-0 w-full bg-white/90 border-t border-gray-200 backdrop-blur-sm z-50';
      default:
        return 'h-8 my-4 bg-gray-50 border border-gray-200 rounded-md';
    }
  };

  return (
    <div className={`flex items-center justify-center ${getAdStyles()}`}>
      <p className="text-xs text-gray-400 font-medium">Advertisement</p>
    </div>
  );
};

export default AdBanner;
