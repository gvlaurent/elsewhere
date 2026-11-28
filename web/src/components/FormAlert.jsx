// Rôle : le message d'erreur en tête d'un formulaire, annoncé par les
// lecteurs d'écran dès qu'il apparaît (role="alert", une zone aria-live).

// Reçoit le message ; n'affiche rien s'il est vide.
export function FormAlert({ message }) {
  if (!message) return null
  return (
    <p className="form-alert" role="alert">
      {message}
    </p>
  )
}
