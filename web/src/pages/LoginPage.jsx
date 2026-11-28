// Rôle : écran de connexion (ELS-21, story F4), d'après la maquette 09.
// Envoie POST /api/auth/login par l'état de connexion (useAuth), puis mène
// au compte. Les refus de l'API (401 identifiants faux, 429 trop d'essais)
// s'affichent en tête du formulaire, avec le message de l'API.
import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/auth-context.js'
import { BackLink } from '../components/BackLink.jsx'
import { FormAlert } from '../components/FormAlert.jsx'
import { Icon } from '../components/Icon.jsx'
import { TextField } from '../components/TextField.jsx'
import { firstInvalidField, splitFormErrors } from '../forms/form-errors.js'

const FIELDS = ['email', 'password']

// Ne reçoit rien. Renvoie l'écran de connexion, ou mène au compte si le
// membre est déjà connecté (y compris juste après sa connexion).
export function LoginPage() {
  const { user, logIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  if (user) return <Navigate to="/compte" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSending) return // second envoi ignoré, voir RegisterPage.jsx
    setIsSending(true)
    try {
      await logIn({ email, password })
    } catch (error) {
      const errors = splitFormErrors(error, FIELDS)
      setFieldErrors(errors.fieldErrors)
      setFormError(errors.formError)
      // Les références sont lues ici, dans une réaction à un événement, et
      // jamais pendant l'affichage : c'est la règle de React.
      const refs = { email: emailRef, password: passwordRef }
      refs[firstInvalidField(FIELDS, errors.fieldErrors)]?.current?.focus()
      setIsSending(false)
    }
  }

  return (
    <>
      <header className="screen-header">
        <BackLink />
        <h1>Se connecter</h1>
        <p className="lead">Pour retrouver vos moments et votre passeport.</p>
      </header>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormAlert message={formError} />
        <TextField
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.fr"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
          inputRef={emailRef}
        />
        <TextField
          id="password"
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          inputRef={passwordRef}
        />
        <button type="submit" className="button-primary" aria-disabled={isSending}>
          {isSending ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="form-link">
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </p>
      </form>

      <p className="note">
        <Icon name="info" size={16} />
        Pas besoin de compte pour écouter : il ne sert qu'à garder des moments.
      </p>
    </>
  )
}
