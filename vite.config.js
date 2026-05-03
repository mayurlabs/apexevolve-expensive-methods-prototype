import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Base path is configurable so the same build scripts work for both deployment targets:
//   - public GitHub Pages (mayurlabs/apexevolve-expensive-methods-prototype)
//   - git.soma Pages      (mayuresh-verma/apexevolve-v264-pilot)
// Set VITE_BASE_PATH in the build command to override the default.
const basePath = process.env.VITE_BASE_PATH || '/apexevolve-expensive-methods-prototype/'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: basePath,
})
