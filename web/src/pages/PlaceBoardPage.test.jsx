// Tests du tableau du direct d'un lieu (maquette 02) : chaque station avec
// son titre, ou « titre indisponible » ; chargement, erreur et lieu inconnu.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp, stubApi } from '../test-utils.jsx'

const DAKAR = { id: 1, name: 'Dakar', countryCode: 'SN', countryName: 'Sénégal', timezone: 'Africa/Dakar' }
const BOARD = {
  place: DAKAR,
  stations: [
    { id: 10, name: 'Radio Teranga', streamUrl: 'https://s.example/10', homepageUrl: null, title: "Youssou N'Dour – Birima" },
    { id: 11, name: 'Sabar FM', streamUrl: 'https://s.example/11', homepageUrl: null, title: null },
  ],
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Tableau du direct', () => {
  it("montre le lieu, son heure locale, et chaque station avec son titre ou « Titre indisponible »", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-11-28T21:58:00Z') })
    stubApi({ 'GET /places/1/stations': { status: 200, body: BOARD } })
    renderApp('/lieux/1')

    expect(await screen.findByRole('heading', { name: 'Dakar' })).toBeInTheDocument()
    expect(screen.getByText('Sénégal · 21 h 58 · 2 radios en direct')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Radios en direct à Dakar' })
    const [teranga, sabar] = within(list).getAllByRole('listitem')
    expect(teranga).toHaveTextContent("Radio TerangaYoussou N'Dour – Birima")
    expect(sabar).toHaveTextContent('Sabar FMTitre indisponible')
    // L'onglet Lieux reste actif dans un lieu, comme sur la maquette.
    const tabs = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(within(tabs).getByRole('link', { name: 'Lieux' })).toHaveAttribute('aria-current', 'page')
  })

  it('montre « Titre indisponible » partout quand aucun titre récent n\'est connu', async () => {
    const stations = BOARD.stations.map((station) => ({ ...station, title: null }))
    stubApi({ 'GET /places/1/stations': { status: 200, body: { place: DAKAR, stations } } })
    renderApp('/lieux/1')

    expect(await screen.findAllByText('Titre indisponible')).toHaveLength(2)
    expect(screen.queryByText("Youssou N'Dour – Birima")).not.toBeInTheDocument()
  })

  it('dit clairement quand un lieu est inconnu (404)', async () => {
    stubApi({ 'GET /places/99/stations': { status: 404, body: { error: { message: 'Lieu introuvable', details: [] } } } })
    renderApp('/lieux/99')

    expect(await screen.findByRole('heading', { name: 'Lieu introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir les lieux en direct' })).toHaveAttribute('href', '/lieux')
  })

  it("traite une adresse au format faux (400) comme un lieu inconnu", async () => {
    stubApi({ 'GET /places/abc/stations': { status: 400, body: { error: { message: 'Requête invalide', details: [] } } } })
    renderApp('/lieux/abc')

    expect(await screen.findByRole('heading', { name: 'Lieu introuvable' })).toBeInTheDocument()
  })

  it('annonce le chargement, puis une panne avec un bouton pour réessayer', async () => {
    stubApi({ 'GET /places/1/stations': { status: 500, body: { error: { message: 'Erreur interne du serveur', details: [] } } } })
    const user = userEvent.setup()
    renderApp('/lieux/1')

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…')
    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur interne du serveur')

    stubApi({ 'GET /places/1/stations': { status: 200, body: BOARD } })
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByRole('heading', { name: 'Dakar' })).toBeInTheDocument()
  })

  it("dit honnêtement qu'un lieu n'a plus de radio en direct", async () => {
    stubApi({ 'GET /places/1/stations': { status: 200, body: { place: DAKAR, stations: [] } } })
    renderApp('/lieux/1')

    expect(await screen.findByText("Aucune radio n'est en direct ici pour l'instant.")).toBeInTheDocument()
  })
})
