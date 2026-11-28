// Rôle : page du compte, d'après la maquette 12 (« Compte et données »),
// réduite à ce que l'API sait déjà faire : l'e-mail, la date du
// consentement (C2) et la déconnexion (C1). Export, modification et
// suppression viendront avec leurs tickets (F7).
import { useState } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/auth-context.js'
import { FormAlert } from '../components/FormAlert.jsx'
import { Icon } from '../components/Icon.jsx'

// « 11 novembre 2026 » : la date lisible en français, à l'heure du navigateur.
const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Ne reçoit rien. Renvoie la page du compte ; mène à la connexion si
// personne n'est connecté (y compris juste après la déconnexion).
export function AccountPage() {
  const { user, isLoading, logOut } = useAuth()
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)

  // On attend la réponse de l'API avant de décider : sinon un membre
  // connecté serait renvoyé vers la connexion pendant une fraction de seconde.
  if (isLoading) return <p role="status">Chargement…</p>
  if (!user) return <Navigate to="/connexion" replace />

  async function handleLogOut() {
    if (isSending) return // second clic ignoré, voir RegisterPage.jsx
    setIsSending(true)
    setError('')
    try {
      await logOut()
      // Réussi : user vaut null, la page se redessine et mène à la connexion.
    } catch (logOutError) {
      // La session existe encore côté serveur : on le dit, au lieu de faire
      // croire au membre qu'il est sorti.
      setError(logOutError.message)
      setIsSending(false)
    }
  }

  return (
    <>
      <header className="screen-header">
        <h1>Mon compte</h1>
        <p className="lead">{user.email}</p>
      </header>

      <section className="section" aria-labelledby="account-data">
        <h2 id="account-data">Mes données</h2>
        <p className="note">
          <Icon name="info" size={16} />
          Consentement donné le {DATE_FORMAT.format(new Date(user.consentAt))}.
        </p>
      </section>

      <section className="section" aria-labelledby="account-session">
        <h2 id="account-session">Session</h2>
        <FormAlert message={error} />
        <button type="button" className="action-row" onClick={handleLogOut} aria-disabled={isSending}>
          <Icon name="logout" size={22} />
          Se déconnecter
        </button>
      </section>
    </>
  )
}
