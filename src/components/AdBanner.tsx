
interface AdBannerProps {
  position: 'top' | 'middle' | 'bottom';
}

const AdBanner = ({ position }: AdBannerProps) => {
  // Different styling based on position
  const getAdStyles = () => {
    switch (position) {
      case 'top':
        return 'h-16 my-4 bg-muted/30';
      case 'middle':
        return 'h-24 my-6 bg-muted/30';
      case 'bottom':
        return 'h-16 fixed bottom-0 left-0 w-full bg-muted/80 backdrop-blur-sm z-50 border-t';
      default:
        return 'h-16 my-4 bg-muted/30';
    }
  };

  return (
    <div className={`rounded-lg flex items-center justify-center ${getAdStyles()}`}>
      <p className="text-xs text-muted-foreground">Advertisement</p>
    </div>
  );
};

export default AdBanner;
