// Rôle : point d'entrée de l'interface. index.html charge ce fichier, qui
// affiche l'application dans <div id="root">, entourée de :
// - BrowserRouter : relie les écrans à l'adresse du navigateur (App.jsx) ;
// - AuthProvider : l'état « qui est connecté », pour tous les écrans ;
// - StrictMode : signale les erreurs courantes, en développement seulement.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
