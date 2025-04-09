
// This file represents a simple Express server that can be deployed separately
// from the frontend React application to handle YouTube Shorts downloads

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

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

// Helper function to sanitize filenames
const sanitizeFilename = (name) => {
  return name
    .replace(/[^\w\s.-]/g, '') // Remove characters that aren't word chars, spaces, dots, or hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/__+/g, '_') // Replace multiple consecutive underscores with a single one
    .substring(0, 100); // Limit length
};

// Helper function to log download attempts to Supabase (if possible)
const logToSupabase = async (data) => {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log("Supabase credentials not found, skipping log");
      return;
    }
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/downloads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      console.error("Failed to log to Supabase:", await response.text());
    }
  } catch (error) {
    console.error("Error logging to Supabase:", error.message);
  }
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
    
    // Execute yt-dlp to get video info
    const ytdlpCommand = `yt-dlp --dump-json --no-playlist --no-check-certificate "${sanitizedUrl}" > "${tempFilePath}"`;
    console.log(`Executing command: ${ytdlpCommand}`);
    
    exec(ytdlpCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing yt-dlp: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        
        // Log error to Supabase
        logToSupabase({
          video_url: sanitizedUrl,
          status: 'error',
          error_message: `Info fetch failed: ${error.message}`,
          ip_address: req.ip
        });
        
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
          
          // Log successful info fetch to Supabase
          logToSupabase({
            video_url: sanitizedUrl,
            status: 'info_success',
            ip_address: req.ip
          });
          
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
    // Generate a unique filename with UUID to prevent collisions
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const filename = `video_${timestamp}_${uniqueId}.${format}`;
    const outputPath = path.join(downloadsDir, filename);
    
    console.log(`Will save to: ${outputPath}`);
    
    let command;
    
    // Build download command based on format and quality
    if (format === 'mp3') {
      // Audio download - get best audio quality
      command = `yt-dlp -x --audio-format mp3 --audio-quality 0 --no-playlist --no-check-certificate "${sanitizedUrl}" -o "${outputPath}"`;
    } else {
      // Video format with specific resolution preference
      let formatString;
      
      if (quality === '720p') {
        formatString = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
      } else if (quality === '480p') {
        formatString = 'bestvideo[height<=480]+bestaudio/best[height<=480]';
      } else { // Default to 360p
        formatString = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
      }
      
      command = `yt-dlp -f "${formatString}" --no-playlist --no-check-certificate --merge-output-format mp4 "${sanitizedUrl}" -o "${outputPath}"`;
    }
    
    console.log(`Executing download command: ${command}`);
    
    // Execute download command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error downloading: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        
        // Log error to Supabase
        logToSupabase({
          video_url: sanitizedUrl,
          status: 'error',
          format: format,
          error_message: `Download failed: ${error.message}`,
          ip_address: req.ip
        });
        
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
      
      // Generate the download URL - make sure this matches your frontend expected format
      const downloadUrl = `/api/downloads/${filename}`;
      console.log(`Download URL provided: ${downloadUrl}`);
      
      // Log success to Supabase
      logToSupabase({
        video_url: sanitizedUrl,
        download_url: downloadUrl,
        status: 'success',
        format: format,
        ip_address: req.ip
      });
      
      // Return video data in the same format as the Supabase Edge Function
      res.json({
        downloadUrl,
        title: path.basename(filename, path.extname(filename)),
        format,
        quality,
        isAudio: format === 'mp3'
      });
      
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

// Route to serve downloads directly
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
    dirExists: fs.existsSync(downloadsDir),
    ytdlpVersion: process.env.YTDLP_VERSION || 'unknown'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Downloads directory: ${downloadsDir}`);
  
  // Check if yt-dlp is available
  exec('yt-dlp --version', (error, stdout, stderr) => {
    if (error) {
      console.error('⚠️ yt-dlp is not available, downloads will fail!');
      console.error(error.message);
    } else {
      console.log(`yt-dlp version: ${stdout.trim()}`);
      process.env.YTDLP_VERSION = stdout.trim();
    }
  });
});
