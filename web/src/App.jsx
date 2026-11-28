// Rôle : la carte des écrans de l'interface. Associe chaque adresse à son
// écran, tous placés dans la mise en page commune (Layout). C'est le seul
// fichier à modifier pour ajouter un écran (ADR-0005).
//
// React Router lit l'adresse du navigateur et affiche l'écran qui lui
// correspond, sans recharger la page.
import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout.jsx'
import { AccountPage } from './pages/AccountPage.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'

// Ne reçoit rien ; renvoie l'écran de l'adresse actuelle.
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="inscription" element={<RegisterPage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="compte" element={<AccountPage />} />
        {/* « * » attrape toute adresse qui n'a pas d'écran. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
