// Rôle : écran affiché pour une adresse que l'application ne connaît pas.
import { Link } from 'react-router'

// Ne reçoit rien ; renvoie un message clair et un lien vers l'accueil.
export function NotFoundPage() {
  return (
    <header className="screen-header">
      <h1>Page introuvable</h1>
      <p className="lead">
        Cette adresse ne mène à aucun écran. <Link to="/">Revenir à l'accueil</Link>
      </p>
    </header>
  )
}
