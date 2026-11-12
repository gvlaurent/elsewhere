// Rôle : configure Vite, l'outil qui sert l'interface pendant le développement
// (npm run dev) et prépare la version finale dans dist/ (npm run build).
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Documentation des options : https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
