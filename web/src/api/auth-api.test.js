// Tests des appels de comptes : chaque fonction vise la bonne route de l'API
// et renvoie le membre ; getCurrentUser traduit « pas connecté » (401) en null.
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-client.js'
import { getCurrentUser, logIn, logOut, register } from './auth-api.js'

const USER = { id: 7, email: 'julien@exemple.fr', role: 'member' }

// Faux fetch qui répond selon le code et le corps donnés.
function stubFetch(status, body) {
  const fetchMock = vi.fn(async () =>
    status === 204 ? new Response(null, { status }) : Response.json(body, { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('auth-api', () => {
  it('register envoie e-mail, mot de passe et consentement, et renvoie le membre', async () => {
    const fetchMock = stubFetch(201, { user: USER })

    const user = await register({ email: USER.email, password: 'un-long-mot-de-passe', consent: true })

    expect(user).toEqual(USER)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/register')
    expect(JSON.parse(options.body)).toEqual({ email: USER.email, password: 'un-long-mot-de-passe', consent: true })
  })

  it('logIn envoie e-mail et mot de passe, et renvoie le membre', async () => {
    const fetchMock = stubFetch(200, { user: USER })

    await expect(logIn({ email: USER.email, password: 'secret' })).resolves.toEqual(USER)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/login')
  })

  it('logOut appelle la route de déconnexion en POST', async () => {
    const fetchMock = stubFetch(204)

    await logOut()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/logout')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('getCurrentUser renvoie le membre connecté', async () => {
    stubFetch(200, { user: USER })

    await expect(getCurrentUser()).resolves.toEqual(USER)
  })

  it("getCurrentUser renvoie null si personne n'est connecté (401)", async () => {
    stubFetch(401, { error: { message: 'Connexion requise', details: [] } })

    await expect(getCurrentUser()).resolves.toBeNull()
  })

  it('getCurrentUser laisse passer les autres erreurs', async () => {
    stubFetch(500, { error: { message: 'Erreur interne du serveur', details: [] } })

    await expect(getCurrentUser()).rejects.toBeInstanceOf(ApiError)
  })
})
