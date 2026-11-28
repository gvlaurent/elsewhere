// Rôle : la petite ligne qui résume un lieu, « 21 h 58 · 7 radios en
// direct », écrite pareil sur l'écran des lieux (maquette 01) et dans
// l'en-tête du tableau du direct (maquette 02).

// Reçoit l'heure locale (ou null si le fuseau est inconnu : elle est alors
// omise) et le nombre de radios. Renvoie « 21 h 58 · 7 radios en direct ».
export function describePlace(localTime, stationCount) {
  return [localTime, radioCount(stationCount)].filter(Boolean).join(' · ')
}

// Reçoit un nombre de radios ; renvoie « 1 radio en direct » ou
// « 7 radios en direct ».
function radioCount(count) {
  return count === 1 ? '1 radio en direct' : `${count} radios en direct`
}
