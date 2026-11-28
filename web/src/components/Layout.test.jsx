// Tests de la mise en page commune : la barre d'onglets suit l'état
// « qui est connecté », lu par GET /api/auth/me au chargement, et la
// déconnexion ramène à l'état « non connecté ».
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MEMBER, callsTo, renderApp, stubApi } from '../test-utils.jsx'

describe('Mise en page commune', () => {
  it("demande qui est connecté au chargement, et l'onglet Compte mène à la connexion si personne", async () => {
    const fetchMock = stubApi()
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Elsewhere' })).toBeInTheDocument()
    expect(callsTo(fetchMock, 'GET', '/auth/me')).toHaveLength(1)
    const tabs = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(within(tabs).getByRole('link', { name: 'Lieux' })).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).getByRole('link', { name: 'Compte' })).toHaveAttribute('href', '/connexion')
  })

  it("l'onglet Compte mène au compte quand le membre est connecté", async () => {
    stubApi({ 'GET /auth/me': { status: 200, body: { user: MEMBER } } })
    renderApp('/')

    const tabs = await screen.findByRole('navigation', { name: 'Navigation principale' })
    expect(await within(tabs).findByRole('link', { name: 'Compte' })).toHaveAttribute('href', '/compte')
  })

  it("renvoie vers la connexion qui ouvre la page du compte sans être connecté", async () => {
    stubApi()
    renderApp('/compte')

    expect(await screen.findByRole('heading', { name: 'Se connecter' })).toBeInTheDocument()
  })

  it('montre une page claire pour une adresse inconnue', async () => {
    stubApi()
    renderApp('/nulle-part')

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
  })
})

describe('Page du compte et déconnexion', () => {
  it("montre l'e-mail, la date du consentement, et déconnecte", async () => {
    const fetchMock = stubApi({
      'GET /auth/me': { status: 200, body: { user: MEMBER } },
      'POST /auth/logout': { status: 204 },
    })
    const user = userEvent.setup()
    renderApp('/compte')

    expect(await screen.findByRole('heading', { name: 'Mon compte' })).toBeInTheDocument()
    expect(screen.getByText(MEMBER.email)).toBeInTheDocument()
    expect(screen.getByText(/Consentement donné le 11 novembre 2026/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    expect(callsTo(fetchMock, 'POST', '/auth/logout')).toHaveLength(1)
    expect(await screen.findByRole('heading', { name: 'Se connecter' })).toBeInTheDocument()
    const tabs = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(within(tabs).getByRole('link', { name: 'Compte' })).toHaveAttribute('href', '/connexion')
  })

  it('signale une déconnexion qui échoue, sans faire croire que le membre est sorti', async () => {
    stubApi({
      'GET /auth/me': { status: 200, body: { user: MEMBER } },
      'POST /auth/logout': { status: 500, body: { error: { message: 'Erreur interne du serveur', details: [] } } },
    })
    const user = userEvent.setup()
    renderApp('/compte')

    await user.click(await screen.findByRole('button', { name: 'Se déconnecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur interne du serveur')
    expect(screen.getByRole('heading', { name: 'Mon compte' })).toBeInTheDocument()
  })
})
