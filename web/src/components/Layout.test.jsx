// Tests de la mise en page commune : la barre d'onglets suit l'état
// « qui est connecté », lu par GET /api/auth/me au chargement.
import { screen, within } from '@testing-library/react'
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
