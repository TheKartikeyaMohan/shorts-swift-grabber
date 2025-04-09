
interface AdBannerProps {
  position: 'top' | 'middle' | 'bottom';
}

const AdBanner = ({ position }: AdBannerProps) => {
  // Different styling based on position
  const getAdStyles = () => {
    switch (position) {
      case 'top':
        return 'h-12 my-4 bg-muted/20';
      case 'middle':
        return 'h-16 my-6 bg-muted/20';
      case 'bottom':
        return 'h-12 fixed bottom-0 left-0 w-full bg-muted/70 backdrop-blur-sm z-50 border-t';
      default:
        return 'h-12 my-4 bg-muted/20';
    }
  };

  return (
    <div className={`rounded-lg flex items-center justify-center ${getAdStyles()}`}>
      <p className="text-xs text-muted-foreground">Ad Space</p>
    </div>
  );
};

export default AdBanner;
