// Tests de l'état « qui est connecté » : une réponse de GET /api/auth/me
// arrivée en retard ne doit pas effacer un membre qui vient de se connecter
// ou de s'inscrire.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { MEMBER, stubApiWithPendingMe } from '../test-utils.jsx'
import { useAuth } from './auth-context.js'
import { AuthProvider } from './AuthProvider.jsx'

// Petit composant de test : montre l'état et propose les deux actions.
function Probe() {
  const { user, isLoading, logIn, register } = useAuth()
  return (
    <>
      <p data-testid="state">{isLoading ? 'chargement' : 'prêt'}</p>
      <p data-testid="user">{user ? user.email : 'personne'}</p>
      <button onClick={() => logIn({ email: MEMBER.email, password: 'x' })}>connexion</button>
      <button onClick={() => register({ email: MEMBER.email, password: 'x', consent: true })}>inscription</button>
    </>
  )
}

const LATE_401 = { status: 401, body: { error: { message: 'Connexion requise', details: [] } } }

describe('AuthProvider', () => {
  it.each([
    ['connexion', { 'POST /auth/login': { status: 200, body: { user: MEMBER } } }],
    ['inscription', { 'POST /auth/register': { status: 201, body: { user: MEMBER } } }],
  ])('ignore la réponse tardive de /me après une %s réussie', async (action, routes) => {
    const { answerMe } = stubApiWithPendingMe(routes)
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: action }))
    expect(await screen.findByText(MEMBER.email)).toBeInTheDocument()
    expect(screen.getByTestId('state')).toHaveTextContent('prêt')

    // /me répond enfin « personne » : cette réponse date d'avant la connexion.
    await act(async () => answerMe(LATE_401))

    expect(screen.getByTestId('user')).toHaveTextContent(MEMBER.email)
  })
})
