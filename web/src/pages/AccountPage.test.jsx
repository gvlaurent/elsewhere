// Tests de la page du compte (maquette 12, en partie) : e-mail, date du
// consentement (C2) et déconnexion (C1).
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MEMBER, callsTo, renderApp, stubApi } from '../test-utils.jsx'

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
    expect(screen.getByText('Consentement donné le 11 novembre 2026.')).toBeInTheDocument()
    expect(screen.queryByText(/origine/)).not.toBeInTheDocument()

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
