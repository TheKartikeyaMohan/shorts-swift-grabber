
// This service provides a mock implementation for YouTube download functionality
// to demonstrate the UI when the real backend is not available

// Sample thumbnail images for mocking results
const THUMBNAIL_SAMPLES = [
  "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "https://i.ytimg.com/vi/9bZkp7q19f0/maxresdefault.jpg",
  "https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg",
  "https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg",
  "https://i.ytimg.com/vi/pRpeEdMmmQ0/maxresdefault.jpg"
];

// Generate random duration between 15-60 seconds (typical for shorts)
const getRandomDuration = () => {
  const seconds = Math.floor(Math.random() * 45) + 15;
  return `0:${seconds < 10 ? '0' + seconds : seconds}`;
};

// Extract video ID from YouTube URL
const extractVideoId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

// Extract channel name from URL or generate sample
const extractChannelName = (url: string): string => {
  const channels = ["MrBeast", "PewDiePie", "5-Minute Crafts", "T-Series", "Cocomelon"];
  return channels[Math.floor(Math.random() * channels.length)];
};

// Generate video title based on URL or sample
const generateVideoTitle = (url: string): string => {
  const titles = [
    "Amazing YouTube Shorts Video - Must Watch!",
    "You Won't Believe What Happens Next!",
    "This Trick Will Change Your Life Forever",
    "The Best Life Hack of 2023",
    "How to Download YouTube Videos Easily"
  ];
  return titles[Math.floor(Math.random() * titles.length)];
};

// Mock video info fetch
export const fetchVideoInfo = async (url: string) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const videoId = extractVideoId(url) || "dQw4w9WgXcQ";
  const thumbnailIndex = Math.floor(Math.random() * THUMBNAIL_SAMPLES.length);
  
  return {
    title: generateVideoTitle(url),
    thumbnail: THUMBNAIL_SAMPLES[thumbnailIndex],
    duration: getRandomDuration(),
    author: extractChannelName(url),
    formats: [
      { label: "HD", quality: "720p", format: "mp4" },
      { label: "SD", quality: "360p", format: "mp4" },
      { label: "Audio", quality: "128kbps", format: "mp3" }
    ]
  };
};

// Mock download function
export const downloadVideo = async (url: string, format: string, quality: string) => {
  // Simulate network delay for "processing"
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // For demonstration purposes, we'll return a mock download URL
  // In a real implementation, this would be a link to the actual downloaded file
  const videoId = extractVideoId(url) || "dQw4w9WgXcQ";
  
  if (Math.random() > 0.9) {
    // Occasionally simulate an error for realistic behavior
    throw new Error("Download failed - please try again");
  }
  
  return {
    // Since we can't actually download videos in the browser without the backend,
    // we'll "point" to a YouTube embed as a placeholder
    downloadUrl: `https://www.youtube.com/embed/${videoId}`,
    success: true
  };
};
