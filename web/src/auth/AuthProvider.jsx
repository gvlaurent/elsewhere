// Rôle : fournit l'état « qui est connecté » à toute l'interface (voir
// auth-context.js). Au chargement de l'application, il demande à l'API qui
// est connecté (GET /api/auth/me) : le cookie de session est HttpOnly, le
// JavaScript ne peut pas le lire, seule l'API sait s'il est valide.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as authApi from '../api/auth-api.js'
import { AuthContext } from './auth-context.js'

// Reçoit les composants enfants (toute l'application) ; les affiche à
// l'intérieur du contexte de connexion.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  // Passe à true dès qu'une inscription, une connexion ou une déconnexion a
  // réussi : la réponse de /me demandée au chargement est alors périmée.
  const sessionChangedRef = useRef(false)

  useEffect(() => {
    // Asynchrone : la réponse peut arriver après que le composant a disparu
    // (en développement, StrictMode le monte deux fois). « cancelled » évite
    // alors de mettre à jour un état qui n'est plus affiché.
    let cancelled = false
    authApi
      .getCurrentUser()
      // Si l'API est injoignable, on affiche l'interface comme pour un
      // visiteur : on écoute sans compte, le compte n'est demandé qu'ensuite.
      .catch(() => null)
      .then((currentUser) => {
        if (cancelled) return
        // Course possible : si /me répond lentement (401) après une connexion
        // réussie, on ne doit pas effacer le membre qui vient d'entrer.
        if (!sessionChangedRef.current) setUser(currentUser)
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Retient le nouveau membre (ou null) après une action réussie. Sa
  // réponse vient de l'API à l'instant : elle l'emporte sur celle de /me.
  const applySession = useCallback((newUser) => {
    sessionChangedRef.current = true
    setUser(newUser)
    setIsLoading(false)
  }, [])

  // Chaque action appelle l'API, puis met l'état à jour seulement si elle a
  // réussi. En cas d'erreur, l'ApiError remonte à l'écran, qui l'affiche.
  const register = useCallback(async (fields) => applySession(await authApi.register(fields)), [applySession])
  const logIn = useCallback(async (fields) => applySession(await authApi.logIn(fields)), [applySession])
  const logOut = useCallback(async () => {
    await authApi.logOut()
    applySession(null)
  }, [applySession])

  // useMemo garde le même objet tant que rien ne change : les composants qui
  // lisent le contexte ne se redessinent pas pour rien.
  const value = useMemo(
    () => ({ user, isLoading, register, logIn, logOut }),
    [user, isLoading, register, logIn, logOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
