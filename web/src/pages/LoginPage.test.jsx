// Tests de l'écran de connexion (ELS-21) : envoi, et messages de l'API
// pour 401 (identifiants faux) et 429 (trop d'essais).
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MEMBER, callsTo, renderApp, stubApi, stubApiWithPendingMe } from '../test-utils.jsx'

// Remplit et envoie le formulaire de connexion, au clavier seulement :
// la touche Entrée dans le dernier champ envoie le formulaire.
async function submitWithKeyboard(user) {
  await user.type(screen.getByLabelText('E-mail'), MEMBER.email)
  await user.type(screen.getByLabelText('Mot de passe'), 'mon-mot-de-passe{Enter}')
}

describe('Écran de connexion', () => {
  it("montre l'e-mail, le mot de passe et un lien vers l'inscription", async () => {
    stubApi()
    renderApp('/connexion')

    expect(await screen.findByRole('heading', { name: 'Se connecter' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', '/inscription')
  })

  it('envoie e-mail et mot de passe au clavier, puis montre le compte connecté', async () => {
    const fetchMock = stubApi({ 'POST /auth/login': { status: 200, body: { user: MEMBER } } })
    const user = userEvent.setup()
    renderApp('/connexion')
    await screen.findByRole('heading', { name: 'Se connecter' })

    await submitWithKeyboard(user)

    const [[, options]] = callsTo(fetchMock, 'POST', '/auth/login')
    expect(JSON.parse(options.body)).toEqual({ email: MEMBER.email, password: 'mon-mot-de-passe' })
    expect(await screen.findByRole('heading', { name: 'Mon compte' })).toBeInTheDocument()
  })

  it("affiche le message de l'API pour des identifiants faux (401)", async () => {
    stubApi({
      'POST /auth/login': { status: 401, body: { error: { message: 'E-mail ou mot de passe incorrect', details: [] } } },
    })
    const user = userEvent.setup()
    renderApp('/connexion')
    await screen.findByRole('heading', { name: 'Se connecter' })

    await submitWithKeyboard(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect')
    expect(screen.getByRole('heading', { name: 'Se connecter' })).toBeInTheDocument()
  })

  it("affiche le message de l'API après trop d'essais (429)", async () => {
    stubApi({
      'POST /auth/login': {
        status: 429,
        body: { error: { message: 'Trop de tentatives de connexion. Réessaie dans 15 minutes.', details: [] } },
      },
    })
    const user = userEvent.setup()
    renderApp('/connexion')
    await screen.findByRole('heading', { name: 'Se connecter' })

    await submitWithKeyboard(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de tentatives de connexion')
  })

  it("affiche sous le champ e-mail l'erreur 400 qui le concerne", async () => {
    stubApi({
      'POST /auth/login': {
        status: 400,
        body: {
          error: {
            message: 'Requête invalide',
            details: [{ location: 'body', field: 'email', message: 'Adresse e-mail invalide' }],
          },
        },
      },
    })
    const user = userEvent.setup()
    renderApp('/connexion')
    await screen.findByRole('heading', { name: 'Se connecter' })

    await submitWithKeyboard(user)

    const email = screen.getByLabelText('E-mail')
    expect(await screen.findByText('Adresse e-mail invalide')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveFocus()
  })

  it('renvoie vers le compte un membre déjà connecté', async () => {
    stubApi({ 'GET /auth/me': { status: 200, body: { user: MEMBER } } })
    renderApp('/connexion')

    expect(await screen.findByRole('heading', { name: 'Mon compte' })).toBeInTheDocument()
  })

  it("n'affiche pas le formulaire tant que l'API n'a pas dit qui est connecté", async () => {
    const { answerMe } = stubApiWithPendingMe()
    renderApp('/connexion')

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…')
    expect(screen.queryByRole('heading', { name: 'Se connecter' })).not.toBeInTheDocument()

    answerMe({ status: 200, body: { user: MEMBER } })

    expect(await screen.findByRole('heading', { name: 'Mon compte' })).toBeInTheDocument()
  })

  it('annonce de nouveau une erreur identique au second envoi', async () => {
    stubApi({
      'POST /auth/login': { status: 401, body: { error: { message: 'E-mail ou mot de passe incorrect', details: [] } } },
    })
    const user = userEvent.setup()
    renderApp('/connexion')
    await screen.findByRole('heading', { name: 'Se connecter' })

    await submitWithKeyboard(user)
    const firstAlert = await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    // Le bloc est retiré puis remis : le lecteur d'écran l'annonce à nouveau.
    await waitFor(() => expect(screen.getByRole('alert')).not.toBe(firstAlert))
    expect(firstAlert).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect')
  })

  it("retire l'erreur d'un champ dès que le membre le modifie", async () => {
    stubApi({
      'POST /auth/login': {
        status: 400,
        body: {
          error: {
            message: 'Requête invalide',
            details: [{ location: 'body', field: 'email', message: 'Adresse e-mail invalide' }],
          },
        },
      },
    })
    const user = userEvent.setup()
    renderApp('/connexion')
    await screen.findByRole('heading', { name: 'Se connecter' })

    await submitWithKeyboard(user)
    await screen.findByText('Adresse e-mail invalide')
    await user.type(screen.getByLabelText('E-mail'), 'x')

    expect(screen.queryByText('Adresse e-mail invalide')).not.toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
