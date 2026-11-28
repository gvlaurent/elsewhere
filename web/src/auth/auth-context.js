// Rôle : l'état « qui est connecté », partagé par toute l'interface.
// AuthProvider.jsx le remplit ; n'importe quel composant le lit avec
// useAuth(), sans le recevoir de son parent.
//
// Un « contexte » React est une valeur accessible à tous les composants
// placés à l'intérieur de son fournisseur (le « Provider »).
import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// Lit l'état de connexion. Ne reçoit rien ; renvoie
// { user, isLoading, register, logIn, logOut } :
// - user : le membre connecté, ou null ;
// - isLoading : true tant que l'API n'a pas dit qui est connecté ;
// - register, logIn, logOut : appellent l'API puis mettent user à jour.
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>')
  return value
}
