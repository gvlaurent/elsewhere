// Tests de l'écran d'inscription (ELS-21) et de son consentement (ELS-18, C2).
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MEMBER, callsTo, renderApp, stubApi, stubApiWithPendingMe } from '../test-utils.jsx'

// Remplit le formulaire d'inscription. Coche la case seulement si demandé.
async function fillForm(user, { consent = true } = {}) {
  await user.type(screen.getByLabelText('E-mail'), MEMBER.email)
  await user.type(screen.getByLabelText('Mot de passe'), 'un-long-mot-de-passe')
  if (consent) await user.click(screen.getByRole('checkbox'))
}

describe("Écran d'inscription", () => {
  it("montre les champs avec leur étiquette, l'aide du mot de passe et une case non cochée", async () => {
    stubApi()
    renderApp('/inscription')

    expect(await screen.findByRole('heading', { name: 'Créer un compte' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email')
    const password = screen.getByLabelText('Mot de passe')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAccessibleDescription(/12 caractères au moins/)
    const consent = screen.getByRole('checkbox', { name: /J'accepte qu'Elsewhere conserve mon e-mail/ })
    expect(consent).not.toBeChecked()
    expect(screen.getByRole('link', { name: "J'ai déjà un compte" })).toHaveAttribute('href', '/connexion')
  })

  it("dit clairement ce qui est gardé, sans rien promettre de plus, et ne demande rien sur l'origine", async () => {
    stubApi()
    renderApp('/inscription')

    await screen.findByRole('heading', { name: 'Créer un compte' })
    const consentText = screen.getByRole('checkbox').labels[0].textContent
    expect(consentText).toMatch(/mon e-mail/)
    expect(consentText).toMatch(/la date de cet accord/)
    expect(consentText).toMatch(/moments et les listes/)
    // Export et suppression (F7) ne sont pas encore codés : pas de promesse (ELS-40).
    expect(consentText).not.toMatch(/export|supprim/i)
    // Deux champs à remplir et une case : aucune question sur l'origine (C2).
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.queryByLabelText(/pays|origine|nationalité/i)).not.toBeInTheDocument()
  })

  it("bloque l'envoi tant que la case n'est pas cochée, et le dit près de la case", async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    renderApp('/inscription')
    await screen.findByRole('heading', { name: 'Créer un compte' })

    await fillForm(user, { consent: false })
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(callsTo(fetchMock, 'POST', '/auth/register')).toHaveLength(0)
    const consent = screen.getByRole('checkbox')
    expect(consent).toHaveAttribute('aria-invalid', 'true')
    expect(consent).toHaveAccessibleDescription(/Cochez la case/)
    expect(consent).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent(/corrigez le ou les champs signalés/i)
  })

  it('envoie e-mail, mot de passe et consentement, puis montre le compte connecté', async () => {
    const fetchMock = stubApi({ 'POST /auth/register': { status: 201, body: { user: MEMBER } } })
    const user = userEvent.setup()
    renderApp('/inscription')
    await screen.findByRole('heading', { name: 'Créer un compte' })

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    const [[, options]] = callsTo(fetchMock, 'POST', '/auth/register')
    expect(JSON.parse(options.body)).toEqual({ email: MEMBER.email, password: 'un-long-mot-de-passe', consent: true })
    expect(await screen.findByRole('heading', { name: 'Mon compte' })).toBeInTheDocument()
    expect(screen.getByText(MEMBER.email)).toBeInTheDocument()
  })

  it("affiche chaque erreur 400 de l'API sous son champ", async () => {
    stubApi({
      'POST /auth/register': {
        status: 400,
        body: {
          error: {
            message: 'Requête invalide',
            details: [{ location: 'body', field: 'password', message: 'Trop petit : 12 caractères au minimum' }],
          },
        },
      },
    })
    const user = userEvent.setup()
    renderApp('/inscription')
    await screen.findByRole('heading', { name: 'Créer un compte' })

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    const password = screen.getByLabelText('Mot de passe')
    expect(await screen.findByText('Trop petit : 12 caractères au minimum')).toBeInTheDocument()
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(password).toHaveAccessibleDescription(/Trop petit : 12 caractères au minimum/)
    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid')
  })

  it("affiche l'e-mail déjà inscrit (409) sous le champ e-mail", async () => {
    stubApi({
      'POST /auth/register': {
        status: 409,
        body: { error: { message: 'Un compte existe déjà avec cet e-mail', details: [] } },
      },
    })
    const user = userEvent.setup()
    renderApp('/inscription')
    await screen.findByRole('heading', { name: 'Créer un compte' })

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    const email = await screen.findByLabelText('E-mail')
    expect(await screen.findByText('Un compte existe déjà avec cet e-mail')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription(/Un compte existe déjà/)
  })

  it('affiche une panne du serveur en tête du formulaire', async () => {
    stubApi({
      'POST /auth/register': { status: 500, body: { error: { message: 'Erreur interne du serveur', details: [] } } },
    })
    const user = userEvent.setup()
    renderApp('/inscription')
    await screen.findByRole('heading', { name: 'Créer un compte' })

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur interne du serveur')
  })

  it("n'affiche pas le formulaire tant que l'API n'a pas dit qui est connecté", async () => {
    const { answerMe } = stubApiWithPendingMe()
    renderApp('/inscription')

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…')
    expect(screen.queryByRole('heading', { name: 'Créer un compte' })).not.toBeInTheDocument()

    answerMe({ status: 200, body: { user: MEMBER } })

    expect(await screen.findByRole('heading', { name: 'Mon compte' })).toBeInTheDocument()
  })

  it("retire l'erreur de la case dès qu'elle est cochée", async () => {
    stubApi()
    const user = userEvent.setup()
    renderApp('/inscription')
    await screen.findByRole('heading', { name: 'Créer un compte' })

    await fillForm(user, { consent: false })
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    await user.click(screen.getByRole('checkbox'))

    expect(screen.queryByText(/Cochez la case/)).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
