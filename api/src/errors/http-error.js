// Rôle : erreur « prévue » de l'API, qui porte son code HTTP. N'importe quelle
// couche peut la lancer (un service : 404 « station introuvable ») ; la
// gestion d'erreurs centrale la traduit en réponse JSON.

// Une erreur HTTP prévue. Reçoit le code (400, 404…), un message lisible par
// l'utilisateur et, au besoin, la liste des détails (par exemple les champs
// invalides). Le message est montré tel quel au client : il ne doit jamais
// contenir d'information interne.
export class HttpError extends Error {
  constructor(status, message, details = []) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}
