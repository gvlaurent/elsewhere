// Tests des appels des lieux : chaque fonction vise la bonne route publique
// de l'API et renvoie seulement ce qui sert à l'écran.
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-client.js'
import { getPlaceBoard, getPlaces } from './places-api.js'

// Faux fetch qui répond selon le code et le corps donnés.
function stubFetch(status, body) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('places-api', () => {
  it('getPlaces appelle GET /api/places et renvoie la liste des lieux', async () => {
    const places = [{ id: 1, name: 'Dakar', stationCount: 7 }]
    const fetchMock = stubFetch(200, { places })

    await expect(getPlaces()).resolves.toEqual(places)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/places')
  })

  it("getPlaceBoard appelle GET /api/places/:id/stations et renvoie le lieu et ses stations", async () => {
    const board = { place: { id: 4, name: 'Dakar' }, stations: [] }
    const fetchMock = stubFetch(200, board)

    await expect(getPlaceBoard(4)).resolves.toEqual(board)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/places/4/stations')
  })

  it("getPlaceBoard encode l'identifiant venu de l'adresse et laisse remonter l'erreur", async () => {
    const fetchMock = stubFetch(400, { error: { message: 'Requête invalide', details: [] } })

    await expect(getPlaceBoard('a/b')).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/places/a%2Fb/stations')
  })
})
