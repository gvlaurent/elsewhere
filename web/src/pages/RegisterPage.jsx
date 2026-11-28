// Rôle : écran d'inscription (ELS-21, story F4) avec son consentement
// (ELS-18, story C2), d'après la maquette 08. Envoie POST /api/auth/register
// par l'état de connexion (useAuth), puis mène au compte.
//
// Le consentement : la case n'est jamais pré-cochée, et l'inscription est
// bloquée tant que le membre ne l'a pas cochée lui-même. L'API le vérifie
// aussi (consent: true exigé) et enregistre la date, prise sur le serveur.
import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/auth-context.js'
import { BackLink } from '../components/BackLink.jsx'
import { FormAlert } from '../components/FormAlert.jsx'
import { TextField } from '../components/TextField.jsx'
import { FIELD_ERROR_SUMMARY, firstInvalidField, splitFormErrors } from '../forms/form-errors.js'

// Champs dans l'ordre d'affichage : le premier en erreur reçoit le focus.
const FIELDS = ['email', 'password', 'consent']

// Texte de la case, repris de la maquette 08 : ce qui est gardé, pourquoi,
// et ce que le membre peut en faire.
const CONSENT_TEXT =
  "J'accepte qu'Elsewhere conserve mon e-mail et mes moments pour faire fonctionner mon passeport. Je peux tout exporter ou supprimer à tout moment."
const CONSENT_REQUIRED = 'Cochez la case pour accepter : sans elle, le compte ne peut pas être créé.'

// Ne reçoit rien. Renvoie l'écran d'inscription, ou mène au compte si le
// membre est déjà connecté (y compris juste après son inscription).
export function RegisterPage() {
  const { user, register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false) // jamais pré-cochée (C2)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const consentRef = useRef(null)

  if (user) return <Navigate to="/compte" replace />

  // Affiche les erreurs et donne le focus au premier champ fautif : au
  // clavier ou au lecteur d'écran, on arrive directement sur ce qu'il faut corriger.
  function showErrors(errors) {
    setFieldErrors(errors.fieldErrors)
    setFormError(errors.formError)
    // Les références sont lues ici, dans une réaction à un événement, et
    // jamais pendant l'affichage : c'est la règle de React.
    const refs = { email: emailRef, password: passwordRef, consent: consentRef }
    refs[firstInvalidField(FIELDS, errors.fieldErrors)]?.current?.focus()
  }

  async function handleSubmit(event) {
    // Le formulaire est envoyé par JavaScript, sans recharger la page.
    event.preventDefault()
    // Un second clic pendant l'envoi est ignoré. Le bouton n'est pas désactivé
    // (disabled) : il perdrait le focus, et l'utilisateur au clavier avec lui.
    if (isSending) return
    if (!consent) {
      showErrors({ fieldErrors: { consent: CONSENT_REQUIRED }, formError: FIELD_ERROR_SUMMARY })
      return
    }
    setIsSending(true)
    try {
      await register({ email, password, consent })
      // Réussi : user est rempli, l'écran se redessine et mène au compte.
    } catch (error) {
      // 409 : l'API ne dit pas quel champ est en cause, mais c'est l'e-mail.
      const errors =
        error.status === 409
          ? { fieldErrors: { email: error.message }, formError: FIELD_ERROR_SUMMARY }
          : splitFormErrors(error, FIELDS)
      showErrors(errors)
      setIsSending(false)
    }
  }

  return (
    <>
      <header className="screen-header">
        <BackLink />
        <h1>Créer un compte</h1>
        <p className="lead">Créez un compte pour retrouver vos moments.</p>
      </header>

      {/* noValidate : on remplace les bulles d'erreur du navigateur par nos
          messages, écrits sous chaque champ et lus par les lecteurs d'écran. */}
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
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint="12 caractères au moins."
          error={fieldErrors.password}
          inputRef={passwordRef}
        />

        <div className="consent">
          <div className="consent-row">
            <input
              ref={consentRef}
              id="consent"
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              aria-invalid={fieldErrors.consent ? true : undefined}
              aria-describedby={fieldErrors.consent ? 'consent-error' : undefined}
            />
            <label htmlFor="consent">{CONSENT_TEXT}</label>
          </div>
          {fieldErrors.consent && (
            <p id="consent-error" className="field-error">
              {fieldErrors.consent}
            </p>
          )}
        </div>

        <button type="submit" className="button-primary" aria-disabled={isSending}>
          {isSending ? 'Création du compte…' : 'Créer mon compte'}
        </button>
        <p className="form-link">
          <Link to="/connexion">J'ai déjà un compte</Link>
        </p>
      </form>
    </>
  )
}
