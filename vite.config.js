import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  // Base path for GitHub Pages
  // Change 'registry-ui' to your repository name
  base: process.env.NODE_ENV === 'production' ? '/registry-ui/' : '/',

  build: {
    // Output directory
    outDir: 'dist',
    // Generate sourcemaps for debugging
    sourcemap: false
  },

  server: {
    port: 5173,
    // CORS proxy for local development only
    // In production (GitHub Pages), registry must have CORS enabled
    proxy: {
      '/registry-api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/registry-api/, '/v2'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const registryUrl = req.headers['x-registry-url']
            if (registryUrl) {
              try {
                const url = new URL(registryUrl)
                options.target = `${url.protocol}//${url.host}`
              } catch (e) {
                console.error('Invalid registry URL:', registryUrl)
              }
            }
          })
        }
      }
    }
  }
})
