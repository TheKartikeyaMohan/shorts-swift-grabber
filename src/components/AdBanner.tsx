
interface AdBannerProps {
  position: 'top' | 'middle' | 'bottom';
}

const AdBanner = ({ position }: AdBannerProps) => {
  // Different styling based on position
  const getAdStyles = () => {
    switch (position) {
      case 'top':
        return 'h-8 my-4 bg-muted/10';
      case 'middle':
        return 'h-10 my-6 bg-muted/10';
      case 'bottom':
        return 'h-6 fixed bottom-0 left-0 w-full bg-muted/20 backdrop-blur-sm z-50';
      default:
        return 'h-8 my-4 bg-muted/10';
    }
  };

  return (
    <div className={`flex items-center justify-center ${getAdStyles()}`}>
      <p className="text-xs text-muted-foreground">Ad</p>
    </div>
  );
};

export default AdBanner;
