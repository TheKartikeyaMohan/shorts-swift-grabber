
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Set up meta tags for SEO
const updateMetaTags = () => {
  // Set title
  document.title = "YouTubeShorts.in - Download YouTube Shorts without watermark";
  
  // Create or update meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', 'Download YouTube Shorts videos without watermark in MP4 and MP3 format. Free YouTube Shorts downloader with no registration required.');
  
  // Create or update meta keywords
  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (!metaKeywords) {
    metaKeywords = document.createElement('meta');
    metaKeywords.setAttribute('name', 'keywords');
    document.head.appendChild(metaKeywords);
  }
  metaKeywords.setAttribute('content', 'YouTube Shorts Downloader India, MP4 Shorts Saver, Download YouTube Shorts without watermark, YouTube Shorts to MP3, YouTube Shorts Converter');
};

// Call the function to update meta tags
updateMetaTags();

createRoot(document.getElementById("root")!).render(<App />);
