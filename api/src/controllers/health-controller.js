// Rôle : couche « contrôleurs » de la santé de l'API. Fait le lien entre HTTP
// et le service : lit la requête, appelle le service, écrit la réponse.
import { getHealthStatus } from '../services/health-service.js';

// Répond à GET /api/health. Reçoit la requête et la réponse d'Express
// (req n'est pas lu), demande l'état au service et l'envoie en JSON avec
// le code 200. Ne renvoie rien : la réponse part par res.
export function getHealth(req, res) {
  const health = getHealthStatus();
  res.json(health);
}
