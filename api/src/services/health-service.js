// Rôle : couche « services » de la santé de l'API. Porte la logique métier,
// sans rien savoir de HTTP (ni req, ni res) : elle se teste sans serveur.

// Indique l'état de l'API. Pour l'instant, répondre suffit à prouver qu'elle
// tourne ; la base n'est pas interrogée, pour qu'un incident de base ne fasse
// pas croire que l'API elle-même est arrêtée.
export function getHealthStatus() {
  return { status: 'ok' };
}
