// Rôle : le lien « ← Retour » en haut des écrans (maquettes 08 et 09).
import { useLocation, useNavigate } from 'react-router'
import { Icon } from './Icon.jsx'

// Reçoit le texte à afficher (« Retour » par défaut). Renvoie un bouton qui
// revient à l'écran précédent, comme la flèche du navigateur.
export function BackLink({ label = 'Retour' }) {
  const navigate = useNavigate()
  const location = useLocation()

  function goBack() {
    // Contournement : si l'écran a été ouvert directement (lien collé, page
    // rechargée), il n'y a pas d'écran précédent dans l'application ;
    // React Router le signale par la clé 'default'. On va alors à l'accueil
    // plutôt que de quitter le site.
    if (location.key === 'default') navigate('/')
    else navigate(-1)
  }

  return (
    <button type="button" className="back-link" onClick={goBack}>
      <Icon name="back" />
      {label}
    </button>
  )
}
