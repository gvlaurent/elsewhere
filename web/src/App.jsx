// Rôle : la carte des écrans de l'interface. Associe chaque adresse à son
// écran, tous placés dans la mise en page commune (Layout). Un nouvel écran
// s'ajoute ici, et dans TabBar.jsx s'il a un onglet (ADR-0006).
//
// React Router lit l'adresse du navigateur et affiche l'écran qui lui
// correspond, sans recharger la page.
import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout.jsx'
import { AccountPage } from './pages/AccountPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { PlaceBoardPage } from './pages/PlaceBoardPage.jsx'
import { PlacesPage } from './pages/PlacesPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'

// Ne reçoit rien ; renvoie l'écran de l'adresse actuelle.
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* L'accueil est l'écran des lieux (maquette 01) : « / » y mène. */}
        <Route index element={<Navigate to="/lieux" replace />} />
        <Route path="lieux" element={<PlacesPage />} />
        <Route path="lieux/:id" element={<PlaceBoardPage />} />
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
