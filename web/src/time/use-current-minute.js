// Rôle : crochet React qui donne l'instant présent et se met à jour au début
// de chaque minute. Les écrans des lieux s'en servent pour que l'heure
// locale affichée avance toute seule, sans recharger la page.
import { useEffect, useState } from 'react'

const MINUTE_MS = 60_000

// Ne reçoit rien. Renvoie une Date, renouvelée à chaque changement de minute.
export function useCurrentMinute() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Asynchrone : on attend juste le temps qu'il reste avant la minute
    // suivante (et non 60 s pile), pour que l'heure change en même temps
    // que l'horloge du téléphone. Le nouvel état relance cet effet, qui
    // programme la minute d'après.
    const timer = setTimeout(() => setNow(new Date()), MINUTE_MS - (now.getTime() % MINUTE_MS))
    return () => clearTimeout(timer)
  }, [now])

  return now
}
