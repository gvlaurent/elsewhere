// Tests de l'écran des lieux (maquette 01) : lieux avec heure locale et
// nombre de radios, sans compte ; chargement, erreur et nouvel essai.
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { callsTo, renderApp, stubApi } from '../test-utils.jsx'

const DAKAR = { id: 1, name: 'Dakar', countryCode: 'SN', countryName: 'Sénégal', timezone: 'Africa/Dakar', stationCount: 7 }
const LAGOS = { id: 2, name: 'Lagos', countryCode: 'NG', countryName: 'Nigeria', timezone: 'Africa/Lagos', stationCount: 1 }
const SERVER_ERROR = { status: 500, body: { error: { message: 'Erreur interne du serveur', details: [] } } }

afterEach(() => {
  vi.useRealTimers()
})

describe('Écran des lieux', () => {
  it("l'accueil mène aux lieux : chaque lieu avec son pays, son heure locale et son nombre de radios", async () => {
    // Horloge fixée : 21 h 58 à Dakar, 22 h 58 à Lagos. shouldAdvanceTime
    // laisse le temps avancer, pour que les promesses de l'écran se règlent.
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-11-28T21:58:00Z') })
    stubApi({ 'GET /places': { status: 200, body: { places: [DAKAR, LAGOS] } } })
    renderApp('/')

    const list = await screen.findByRole('list', { name: 'Lieux en direct' })
    const dakar = within(list).getByRole('link', { name: /Dakar, Sénégal/ })
    expect(dakar).toHaveAttribute('href', '/lieux/1')
    expect(dakar).toHaveTextContent('21 h 58 · 7 radios en direct')
    expect(within(list).getByRole('link', { name: /Lagos, Nigeria/ })).toHaveTextContent('22 h 58 · 1 radio en direct')
    const tabs = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(within(tabs).getByRole('link', { name: 'Lieux' })).toHaveAttribute('aria-current', 'page')
  })

  it("met l'heure locale à jour chaque minute", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-11-28T21:58:30Z') })
    stubApi({ 'GET /places': { status: 200, body: { places: [DAKAR] } } })
    renderApp('/lieux')

    const dakar = await screen.findByRole('link', { name: /Dakar, Sénégal/ })
    expect(dakar).toHaveTextContent('21 h 58')

    // Asynchrone : on laisse d'abord React lancer ses effets en attente,
    // dont celui qui programme le passage à la minute suivante.
    await act(async () => {})
    // 30 secondes plus tard, la minute change : l'écran suit sans recharger.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(dakar).toHaveTextContent('21 h 59')
  })

  it('annonce le chargement, puis une erreur avec un bouton pour réessayer', async () => {
    const fetchMock = stubApi({ 'GET /places': SERVER_ERROR })
    const user = userEvent.setup()
    renderApp('/lieux')

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…')
    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur interne du serveur')

    // L'API répond de nouveau : « Réessayer » relance la demande.
    stubApi({ 'GET /places': { status: 200, body: { places: [DAKAR] } } })
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByRole('link', { name: /Dakar, Sénégal/ })).toBeInTheDocument()
    expect(callsTo(fetchMock, 'GET', '/places')).toHaveLength(1)
  })

  it("dit honnêtement qu'aucun lieu n'est en direct", async () => {
    stubApi({ 'GET /places': { status: 200, body: { places: [] } } })
    renderApp('/lieux')

    expect(await screen.findByText("Aucun lieu n'a de radio en direct pour l'instant.")).toBeInTheDocument()
  })
})
