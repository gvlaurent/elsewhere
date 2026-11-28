// Tests du module unique d'appel à l'API : ce qu'il envoie, ce qu'il renvoie,
// et comment il traduit le format d'erreur commun { error: { message, details } }.
import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, fieldErrorsOf } from './api-client.js'

// Remplace fetch par un faux qui répond toujours la même chose, et le renvoie
// pour que le test vérifie l'appel reçu.
function stubFetch(status, body) {
  const fetchMock = vi.fn(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('apiRequest', () => {
  it('envoie le corps en JSON sur /api, à la même adresse, avec le cookie', async () => {
    const fetchMock = stubFetch(201, { user: { id: 1 } })

    const data = await apiRequest('/auth/register', { method: 'POST', body: { email: 'a@b.fr' } })

    expect(data).toEqual({ user: { id: 1 } })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/register')
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('same-origin')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(options.body)).toEqual({ email: 'a@b.fr' })
  })

  it('fait un GET sans corps par défaut', async () => {
    const fetchMock = stubFetch(200, { user: null })

    await apiRequest('/auth/me')

    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('GET')
    expect(options.body).toBeUndefined()
  })

  it('renvoie null pour une réponse 204 sans contenu', async () => {
    stubFetch(204)

    await expect(apiRequest('/auth/logout', { method: 'POST' })).resolves.toBeNull()
  })

  it("lève une ApiError avec le code, le message et les détails de l'API", async () => {
    stubFetch(400, {
      error: {
        message: 'Requête invalide',
        details: [{ location: 'body', field: 'password', message: 'Trop court' }],
      },
    })

    const error = await apiRequest('/auth/register', { method: 'POST', body: {} }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.message).toBe('Requête invalide')
    expect(error.details).toEqual([{ location: 'body', field: 'password', message: 'Trop court' }])
  })

  it("donne un message générique si la réponse d'erreur n'est pas du JSON", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad Gateway</html>', { status: 502 })))

    const error = await apiRequest('/auth/me').catch((e) => e)

    expect(error.status).toBe(502)
    expect(error.message).toMatch(/serveur/i)
    expect(error.details).toEqual([])
  })

  it('lève une ApiError de code 0 quand le réseau ne répond pas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))

    const error = await apiRequest('/auth/me').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/connexion/i)
  })
})

describe('fieldErrorsOf', () => {
  it('range les messages par champ du corps, en gardant le premier', () => {
    const error = new ApiError(400, 'Requête invalide', [
      { location: 'body', field: 'email', message: 'E-mail invalide' },
      { location: 'body', field: 'email', message: 'Second message' },
      { location: 'body', field: 'password', message: 'Trop court' },
      { location: 'body', field: null, message: 'Objet attendu' },
    ])

    expect(fieldErrorsOf(error)).toEqual({ email: 'E-mail invalide', password: 'Trop court' })
  })

  it("renvoie un objet vide pour une erreur qui n'est pas de l'API", () => {
    expect(fieldErrorsOf(new Error('autre'))).toEqual({})
  })
})
