// Rôle : l'heure locale d'un lieu, calculée dans le navigateur à partir de
// son fuseau IANA (« Africa/Dakar »), sans appel à l'API (ADR-0007). Le
// navigateur connaît déjà les fuseaux et leurs changements d'heure.

// Formateurs déjà prêts, un par fuseau : en créer un est coûteux, et l'écran
// des lieux redessine chaque heure locale toutes les minutes.
const formatters = new Map()

// Reçoit un fuseau IANA et un instant (Date). Renvoie l'heure de ce lieu à
// la française, « 21 h 58 », ou null si le navigateur ne connaît pas ce
// fuseau (l'écran n'affiche alors pas d'heure plutôt que de planter).
export function formatLocalTime(timeZone, date) {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hourCycle: 'h23', // de 0 à 23 h, jamais « 24 h 05 »
      })
    } catch {
      // Intl lève une RangeError pour un fuseau inconnu.
      return null
    }
    formatters.set(timeZone, formatter)
  }
  // formatToParts découpe « 21:58 » en morceaux : on garde l'heure et les
  // minutes, et on écrit « 21 h 58 » comme les maquettes.
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
  return `${parts.hour} h ${parts.minute}`
}
