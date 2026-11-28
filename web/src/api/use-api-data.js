// Rôle : crochet React commun aux écrans qui lisent des données de l'API au
// chargement (lieux, tableau du direct). Il porte les trois états honnêtes
// d'un écran : chargement, erreur (avec un nouvel essai) et succès.
import { useCallback, useEffect, useState } from 'react'

// Charge des données au premier affichage, et de nouveau quand « key »
// change (un autre lieu) ou quand l'écran demande un nouvel essai.
// Reçoit load, une fonction d'appel de l'API définie hors du composant (donc
// stable), et key, passé à load (par exemple l'identifiant du lieu).
// Renvoie { status, data, error, retry } : status vaut 'loading', 'error'
// ou 'success' ; error est l'ApiError reçue ; retry() relance l'appel.
export function useApiData(load, key) {
  const [attempt, setAttempt] = useState(0)
  // Le résultat garde la demande à laquelle il répond : s'il répond à une
  // autre demande (autre lieu, nouvel essai), on est en chargement. Cela
  // évite de remettre l'état à « chargement » à la main dans l'effet.
  const request = `${key}#${attempt}`
  const [result, setResult] = useState({ request: null, data: null, error: null })

  useEffect(() => {
    // Asynchrone : si l'écran change de lieu ou disparaît avant la réponse,
    // celle-ci est ignorée. Une réponse lente ne remplace jamais une plus
    // récente.
    let isCurrent = true
    load(key).then(
      (data) => isCurrent && setResult({ request, data, error: null }),
      (error) => isCurrent && setResult({ request, data: null, error }),
    )
    return () => {
      isCurrent = false
    }
  }, [load, key, request])

  const retry = useCallback(() => setAttempt((count) => count + 1), [])

  if (result.request !== request) return { status: 'loading', data: null, error: null, retry }
  return { status: result.error ? 'error' : 'success', data: result.data, error: result.error, retry }
}
