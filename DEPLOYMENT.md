
# YouTube Shorts Downloader - Deployment Guide

This document outlines how to deploy both the frontend React application and the backend API service.

## Prerequisites

- Node.js 16+ (for frontend)
- Docker (for backend)
- A server with public access

## Frontend Deployment

1. Build the React application:
   ```
   npm run build
   ```

2. The build output will be in the `dist` folder which can be served by any static file server like Nginx, Apache, or Vercel.

3. When deploying, make sure to update the API endpoint URLs in the frontend code to point to your backend server.

## Backend Deployment

### Option 1: Using Docker (Recommended)

1. Build the Docker image:
   ```
   docker build -t youtube-shorts-downloader-backend .
   ```

2. Run the container:
   ```
   docker run -p 3001:3001 -d youtube-shorts-downloader-backend
   ```

3. The API will be available at `http://your-server-ip:3001`

### Option 2: Manual Deployment

1. Install Node.js and required dependencies on your server.

2. Install yt-dlp:
   ```
   pip install yt-dlp
   ```

3. Install FFmpeg:
   ```
   # Ubuntu/Debian
   apt-get install ffmpeg
   
   # CentOS/RHEL
   yum install ffmpeg
   ```

4. Navigate to the backend directory and install Node.js dependencies:
   ```
   cd backend
   npm install
   ```

5. Start the server:
   ```
   npm start
   ```

## Configuration

The backend server listens on port 3001 by default, but you can change this by setting the `PORT` environment variable.

## Security Considerations

1. Set up HTTPS for both frontend and backend to ensure secure data transmission.
2. Implement rate limiting to prevent abuse.
3. Consider adding authentication for API endpoints if needed.
4. Make sure to configure CORS appropriately to allow only your frontend domains.

## Maintenance

- Regularly update yt-dlp to ensure compatibility with YouTube's changes:
  ```
  pip install -U yt-dlp
  ```

- Monitor disk space usage, as downloaded videos can consume significant storage. The backend automatically cleans up downloaded files after 1 hour.
