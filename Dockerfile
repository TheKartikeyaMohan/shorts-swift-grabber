
FROM node:18-slim

# Install yt-dlp and required dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl && \
    pip3 install yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY backend-package.json ./package.json
COPY package-lock.json ./package-lock.json

# Install backend dependencies
RUN npm install

# Create necessary directories
RUN mkdir -p src/api/public/downloads

# Copy source code
COPY src/api ./src/api

# Make public directory accessible
RUN chmod 777 src/api/public/downloads

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "src/api/server.js"]
