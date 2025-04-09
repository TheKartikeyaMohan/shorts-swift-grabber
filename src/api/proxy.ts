
// This file is meant to be used in a Node.js environment for server-side deployment
// It handles the actual YouTube downloading logic using yt-dlp

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  formats: Array<{
    quality: string;
    format: string;
    label: string;
  }>;
}

// Function to get video information
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'youtube-shorts-'));
    const outputFile = path.join(tempDir, 'info.json');
    
    // Use yt-dlp to get video info
    await new Promise<void>((resolve, reject) => {
      const ytDlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-playlist',
        url,
        '-o', outputFile
      ]);
      
      let stderrData = '';
      
      ytDlp.stderr.on('data', (data) => {
        stderrData += data.toString();
        console.error(`yt-dlp stderr: ${data}`);
      });
      
      ytDlp.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp process exited with code ${code}: ${stderrData}`));
        }
      });
    });
    
    // Read the output file
    const infoJson = await fs.readFile(outputFile, 'utf8');
    const info = JSON.parse(infoJson);
    
    // Process formats for client-side display
    const formats = [
      { label: "HD", quality: "720p", format: "mp4" },
      { label: "SD", quality: "360p", format: "mp4" },
      { label: "Audio", quality: "128kbps", format: "mp3" }
    ];
    
    // Format duration
    const durationSec = info.duration;
    const minutes = Math.floor(durationSec / 60);
    const seconds = Math.floor(durationSec % 60);
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    
    return {
      title: info.title,
      thumbnail: info.thumbnail,
      duration: formattedDuration,
      author: info.uploader,
      formats
    };
  } catch (error) {
    console.error('Error getting video info:', error);
    throw error;
  }
}

// Function to download video
export async function downloadVideo(
  url: string, 
  format: string, 
  quality: string
): Promise<string> {
  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'youtube-shorts-'));
    let outputFile: string;
    let ytDlpArgs: string[];
    
    if (format === 'mp3') {
      // Audio download
      outputFile = path.join(tempDir, `audio-${Date.now()}.mp3`);
      ytDlpArgs = [
        '-x', 
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--no-playlist',
        '--embed-thumbnail',
        '--add-metadata',
        url,
        '-o', outputFile
      ];
    } else {
      // Video download with format selection
      outputFile = path.join(tempDir, `video-${Date.now()}.mp4`);
      const formatString = quality === '720p' ? 'best[height<=720]' : 'best[height<=360]';
      ytDlpArgs = [
        '-f', formatString,
        '--no-playlist',
        '--merge-output-format', 'mp4',
        '--add-metadata',
        url,
        '-o', outputFile
      ];
    }
    
    console.log('Executing yt-dlp with args:', ytDlpArgs.join(' '));
    
    // Use yt-dlp to download the video
    await new Promise<void>((resolve, reject) => {
      const ytDlp = spawn('yt-dlp', ytDlpArgs);
      
      let stdoutData = '';
      let stderrData = '';
      
      ytDlp.stdout.on('data', (data) => {
        stdoutData += data.toString();
        console.log(`yt-dlp stdout: ${data}`);
      });
      
      ytDlp.stderr.on('data', (data) => {
        stderrData += data.toString();
        console.error(`yt-dlp stderr: ${data}`);
      });
      
      ytDlp.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp process exited with code ${code}: ${stderrData}`));
        }
      });
    });
    
    // Verify the file exists
    await fs.access(outputFile);
    
    // In a real server implementation:
    // 1. Move the file to a public directory
    // 2. Generate a temporary URL for download
    
    const fileName = path.basename(outputFile);
    const publicUrl = `/downloads/${fileName}`;
    
    // Return the path relative to the downloads directory
    return publicUrl;
  } catch (error) {
    console.error('Error downloading video:', error);
    throw error;
  }
}
