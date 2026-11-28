// Rôle : l'état « erreur » d'un écran qui n'a pas pu lire l'API : la cause
// et une action pour réessayer (maquettes, « messages d'erreur qui donnent
// la cause et une action »).
import { FormAlert } from './FormAlert.jsx'

// Reçoit error (une ApiError, dont le message est déjà écrit pour la
// personne) et onRetry, appelé au clic sur « Réessayer ». Renvoie le message
// annoncé aux lecteurs d'écran (role="alert") et le bouton.
export function LoadError({ error, onRetry }) {
  return (
    <div className="load-error">
      <FormAlert message={error.message} />
      <button type="button" className="button-secondary" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  )
}
