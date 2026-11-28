// Rôle : outils partagés par les tests d'écrans. renderApp() affiche toute
// l'application à une adresse donnée, avec une fausse API : les tests
// vérifient ce que voit et fait le membre, sans lancer de serveur.
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'

export const MEMBER = {
  id: 7,
  email: 'julien@exemple.fr',
  role: 'member',
  consentAt: '2026-11-11T20:58:00.000Z',
  createdAt: '2026-11-11T20:58:00.000Z',
}

const NOT_CONNECTED = { status: 401, body: { error: { message: 'Connexion requise', details: [] } } }

// Installe une fausse API. Reçoit un objet { 'POST /auth/login': { status, body } }.
// Une route absente répond comme l'API quand personne n'est connecté : 401
// sur /auth/me. Renvoie le faux fetch, pour vérifier les appels reçus.
export function stubApi(routes = {}) {
  return installFakeFetch(routes, async () => routes['GET /auth/me'] ?? NOT_CONNECTED)
}

// Comme stubApi, mais GET /auth/me reste sans réponse jusqu'à ce que le
// test appelle answerMe({ status, body }) : on imite une API lente.
// Renvoie { fetchMock, answerMe }.
export function stubApiWithPendingMe(routes = {}) {
  let answerMe
  const pending = new Promise((resolve) => {
    answerMe = resolve
  })
  const fetchMock = installFakeFetch(routes, () => pending)
  return { fetchMock, answerMe }
}

// Remplace fetch. Reçoit les réponses par route et une fonction qui donne
// (plus ou moins vite) la réponse de GET /auth/me ; renvoie le faux fetch.
function installFakeFetch(routes, meAnswer) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const key = `${options.method ?? 'GET'} ${url.replace(/^\/api/, '')}`
    const answer = key === 'GET /auth/me' ? await meAnswer() : routes[key]
    if (!answer) throw new Error(`Route non prévue par le test : ${key}`)
    if (answer.status === 204) return new Response(null, { status: 204 })
    return Response.json(answer.body, { status: answer.status })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Affiche l'application entière à l'adresse « path », comme le ferait
// main.jsx, mais avec un routeur en mémoire (pas de vraie barre d'adresse).
export function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

// Raccourci : les appels reçus par la fausse API pour une route donnée.
export function callsTo(fetchMock, method, path) {
  return fetchMock.mock.calls.filter(
    ([url, options = {}]) => url === `/api${path}` && (options.method ?? 'GET') === method,
  )
}
