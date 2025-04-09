
// This file represents a simple Express server that can be deployed separately
// from the frontend React application to handle YouTube Shorts downloads

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'public', 'downloads');
fs.ensureDirSync(downloadsDir); // Use fs-extra to ensure directory exists

console.log(`Server starting with downloads directory: ${downloadsDir}`);
console.log(`__dirname is: ${__dirname}`);
console.log(`Absolute path to downloads: ${path.resolve(downloadsDir)}`);

// Helper function to sanitize YouTube URLs
const sanitizeYouTubeUrl = (url) => {
  // Basic sanitization to remove leading/trailing spaces
  url = url.trim();
  
  // If URL doesn't have protocol, add it
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  return url;
};

// API route to get video information
app.post('/api/video-info', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const sanitizedUrl = sanitizeYouTubeUrl(url);
  console.log(`Processing URL: ${sanitizedUrl}`);
  
  try {
    const tempFileName = `info_${Date.now()}.json`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    
    // Execute yt-dlp to get video info with increased verbosity
    const ytdlpCommand = `yt-dlp --dump-json --no-playlist --no-check-certificate "${sanitizedUrl}" > "${tempFilePath}"`;
    console.log(`Executing command: ${ytdlpCommand}`);
    
    exec(ytdlpCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing yt-dlp: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({ error: 'Failed to get video info', details: stderr });
      }
      
      // Read the info file
      fs.readFile(tempFilePath, 'utf8', (err, data) => {
        // Clean up temp file
        fs.unlink(tempFilePath, () => {});
        
        if (err) {
          console.error(`Error reading info file: ${err.message}`);
          return res.status(500).json({ error: 'Failed to read video info' });
        }
        
        try {
          const info = JSON.parse(data);
          
          // Format duration
          const durationSec = info.duration;
          const minutes = Math.floor(durationSec / 60);
          const seconds = Math.floor(durationSec % 60);
          const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          // Available formats
          const formats = [
            { label: "HD", quality: "720p", format: "mp4" },
            { label: "SD", quality: "360p", format: "mp4" },
            { label: "Audio", quality: "128kbps", format: "mp3" }
          ];
          
          // Send response
          res.json({
            title: info.title,
            thumbnail: info.thumbnail,
            duration: formattedDuration,
            author: info.uploader,
            formats
          });
        } catch (parseError) {
          console.error(`Error parsing JSON: ${parseError.message}`);
          res.status(500).json({ error: 'Failed to parse video info' });
        }
      });
    });
  } catch (error) {
    console.error(`Server error: ${error.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to download a video
app.post('/api/download', async (req, res) => {
  const { url, format, quality } = req.body;
  
  if (!url || !format) {
    return res.status(400).json({ error: 'URL and format are required' });
  }
  
  const sanitizedUrl = sanitizeYouTubeUrl(url);
  console.log(`Download request for URL: ${sanitizedUrl}, format: ${format}, quality: ${quality}`);
  
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `video_${timestamp}.${format}`;
    const outputPath = path.join(downloadsDir, filename);
    
    console.log(`Will save to: ${outputPath}`);
    
    let command;
    
    // Build download command based on format and quality
    if (format === 'mp3') {
      command = `yt-dlp -x --audio-format mp3 --audio-quality 0 --no-playlist --no-check-certificate "${sanitizedUrl}" -o "${outputPath}"`;
    } else {
      // Video format with more flexible format selection
      const formatString = quality === '720p' ? 'bestvideo[height<=720]+bestaudio/best[height<=720]' : 'bestvideo[height<=360]+bestaudio/best[height<=360]';
      command = `yt-dlp -f ${formatString} --no-playlist --no-check-certificate --merge-output-format mp4 "${sanitizedUrl}" -o "${outputPath}"`;
    }
    
    console.log(`Executing download command: ${command}`);
    
    // Execute download command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error downloading: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({ error: 'Download failed', details: stderr });
      }
      
      console.log(`Download stdout: ${stdout}`);
      
      // Check if file exists
      if (!fs.existsSync(outputPath)) {
        console.error(`File not created: ${outputPath}`);
        return res.status(500).json({ error: 'File not created' });
      }
      
      const stats = fs.statSync(outputPath);
      console.log(`File size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        fs.unlinkSync(outputPath);
        return res.status(500).json({ error: 'Downloaded file is empty' });
      }
      
      // Return the download URL
      const downloadUrl = `/api/downloads/${filename}`;
      console.log(`Download URL provided: ${downloadUrl}`);
      res.json({ downloadUrl });
      
      // Set up cleanup task for downloaded file (after 1 hour)
      setTimeout(() => {
        fs.unlink(outputPath, (err) => {
          if (err) {
            console.error(`Error deleting file: ${err.message}`);
          } else {
            console.log(`Deleted temporary file: ${outputPath}`);
          }
        });
      }, 3600000); // 1 hour
    });
  } catch (error) {
    console.error(`Server error: ${error.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// New route to serve downloads directly
app.get('/api/downloads/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(downloadsDir, filename);
  
  console.log(`Download request for: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath, (err) => {
    if (err) {
      console.error(`Error sending file: ${err.message}`);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Error sending file' });
      }
    }
  });
});

// Route to check if server is running
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API server is running',
    downloadsDir: downloadsDir,
    dirExists: fs.existsSync(downloadsDir)
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Downloads directory: ${downloadsDir}`);
});
