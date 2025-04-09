
// This file represents a simple Express server that can be deployed separately
// from the frontend React application to handle YouTube Shorts downloads

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
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
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// API route to get video information
app.post('/api/video-info', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    const tempFileName = `info_${Date.now()}.json`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    
    // Execute yt-dlp to get video info
    exec(`yt-dlp --dump-json --no-playlist "${url}" > "${tempFilePath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing yt-dlp: ${error.message}`);
        return res.status(500).json({ error: 'Failed to get video info' });
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
  
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `video_${timestamp}.${format}`;
    const outputPath = path.join(downloadsDir, filename);
    
    let command;
    
    // Build download command based on format and quality
    if (format === 'mp3') {
      command = `yt-dlp -x --audio-format mp3 --audio-quality 0 --no-playlist "${url}" -o "${outputPath}"`;
    } else {
      // Video format
      const formatString = quality === '720p' ? 'best[height<=720]' : 'best[height<=360]';
      command = `yt-dlp -f ${formatString} --no-playlist --merge-output-format mp4 "${url}" -o "${outputPath}"`;
    }
    
    console.log(`Executing command: ${command}`);
    
    // Execute download command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error downloading: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({ error: 'Download failed', details: stderr });
      }
      
      console.log(`Download successful: ${outputPath}`);
      
      // Check if file exists
      if (!fs.existsSync(outputPath)) {
        console.error(`File not created: ${outputPath}`);
        return res.status(500).json({ error: 'File not created' });
      }
      
      // Return the download URL
      const downloadUrl = `/downloads/${filename}`;
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

// Route to check if server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Downloads directory: ${downloadsDir}`);
});
