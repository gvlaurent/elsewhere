// Rôle : la mise en page commune à tous les écrans, mobile d'abord : une
// colonne de la largeur d'un téléphone (390 px dans les maquettes), le
// contenu de l'écran au-dessus, la barre d'onglets en bas.
import { Outlet } from 'react-router'
import { TabBar } from './TabBar.jsx'

// Ne reçoit rien. <Outlet /> est l'emplacement où React Router place l'écran
// de l'adresse actuelle (voir App.jsx).
export function Layout() {
  return (
    <div className="app-shell">
      <main className="screen">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
