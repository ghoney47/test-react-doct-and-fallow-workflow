import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  // The dev server runs on :5173, the Hono backend on :3000. A browser will
  // block cross-origin requests between them. Proxying means the frontend can
  // just fetch('/patients') and Vite forwards it to the backend — same origin
  // as far as the browser is concerned, so no CORS setup needed on either side.
  server: {
    proxy: {
      '/patients': 'http://localhost:3000',
    },
  },
})
