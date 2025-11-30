import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite plugin to log startup message
const logStartupPlugin = () => {
  return {
    name: 'log-startup',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const port = 5173
        const apiUrl = 'http://localhost:3000'
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🎨 FRONTEND SERVER STARTED')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`📍 URL:     http://localhost:${port}`)
        console.log(`🔗 API:     ${apiUrl}`)
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), logStartupPlugin()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
