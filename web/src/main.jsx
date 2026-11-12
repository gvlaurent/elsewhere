// Rôle : point d'entrée de l'interface. index.html charge ce fichier, qui affiche
// le composant App dans <div id="root"> ; StrictMode signale les erreurs en développement.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
