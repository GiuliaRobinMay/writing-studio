import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Single-user, local-first studio. No backend in v1.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    open: false,
  },
})
