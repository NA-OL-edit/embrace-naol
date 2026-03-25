import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  base: "/",

  server: {
    host: true,
    port: 8080,
    strictPort: true,
    allowedHosts: true,

    hmr: {
      protocol: "wss",
      clientPort: 443,
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8090",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    host: true,
    port: 8080,
    strictPort: true,
    allowedHosts: true,
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'framer-motion', 'recharts'],
          three: ['three', '@react-three/fiber', '@react-three/drei']
        }
      }
    }
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
