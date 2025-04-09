
FROM node:18-slim

# Install yt-dlp and required dependencies with specific versions
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl wget && \
    pip3 install --upgrade pip && \
    pip3 install yt-dlp==2023.12.30 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Test yt-dlp installation and print version
RUN yt-dlp --version

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY backend-package.json ./package.json
COPY package-lock.json ./package-lock.json

# Install backend dependencies
RUN npm install

# Create necessary directories with proper permissions
RUN mkdir -p src/api/public/downloads && \
    chmod -R 777 src/api/public/downloads

# Copy source code
COPY src/api ./src/api

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "src/api/server.js"]
