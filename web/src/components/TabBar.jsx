// Rôle : la barre d'onglets en bas de l'écran (composant « Barre d'onglets »
// des maquettes). Pour l'instant : Lieux et Compte. Thèmes et Passeport
// s'y ajouteront avec leurs écrans (ELS-19 et suivants).
import { NavLink } from 'react-router'
import { useAuth } from '../auth/auth-context.js'
import { Icon } from './Icon.jsx'

// Ne reçoit rien. Renvoie la navigation principale. L'onglet Compte mène au
// compte du membre connecté, ou à la connexion s'il n'y a personne.
export function TabBar() {
  const { user } = useAuth()
  const tabs = [
    // L'onglet Lieux reste actif dans le tableau d'un lieu (/lieux/3),
    // comme sur la maquette 02 : il ne demande pas une adresse exacte.
    { to: '/lieux', label: 'Lieux', icon: 'pin', end: false },
    { to: user ? '/compte' : '/connexion', label: 'Compte', icon: 'user', end: true },
  ]

  return (
    <nav className="tab-bar" aria-label="Navigation principale">
      <ul>
        {tabs.map((tab) => (
          <li key={tab.label}>
            {/* NavLink ajoute aria-current="page" sur l'onglet de l'écran
                affiché : le lecteur d'écran annonce « page actuelle ». */}
            <NavLink to={tab.to} end={tab.end} className="tab">
              <Icon name={tab.icon} size={24} />
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
