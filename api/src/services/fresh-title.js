// Règle « jamais de faux titre » à la lecture (F1, F5) : un titre n'est
// montré ou gardé que s'il a été lu il y a moins de 5 minutes. Le titre
// lui-même n'est écrit en base que s'il a été classé lisible (ELS-5).
// Partagé par le tableau du direct (ELS-23) et les moments (ELS-19).

export const TITLE_MAX_AGE_MS = 5 * 60 * 1000;

// Renvoie le titre s'il est assez récent, sinon null (« titre indisponible »).
// Reçoit le dernier titre lu et l'heure de cette lecture (colonnes
// last_title et last_title_read_at de stations), et l'instant présent.
export function freshTitle(lastTitle, lastTitleReadAt, now = new Date()) {
  if (!lastTitle || !lastTitleReadAt) return null;
  const age = now.getTime() - new Date(lastTitleReadAt).getTime();
  // Une heure de lecture dans le futur (horloges décalées) n'est pas crue.
  return age >= 0 && age < TITLE_MAX_AGE_MS ? lastTitle : null;
}
