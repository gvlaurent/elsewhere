// Rôle : configure Vite, l'outil qui sert l'interface pendant le développement
// (npm run dev) et prépare la version finale dans dist/ (npm run build).
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Documentation des options : https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En développement, l'interface appelle /api/… sur sa propre adresse
    // (localhost:5173) et Vite transmet à l'API locale. En ligne, Render fait
    // la même chose (render.yaml) : le code de l'interface ne change pas.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
