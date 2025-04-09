
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 5000,
        onError: (err: Error, req: Request, res: Response) => {
          console.error(`Proxy error:`, err);
          // Fix: Response doesn't have statusCode property
          // @ts-ignore - Response interface might not match exactly
          res.status = 500;
          // @ts-ignore - Response interface might not match exactly
          res.end(JSON.stringify({ 
            error: "Backend server connection failed",
            details: err.message
          }));
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
