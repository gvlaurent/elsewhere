// Rôle : couche « contrôleurs » de la santé de l'API. Fait le lien entre HTTP
// et le service : lit la requête, appelle le service, écrit la réponse.
import { getHealthStatus } from '../services/health-service.js';

// Répond à GET /api/health avec l'état renvoyé par le service.
export function getHealth(req, res) {
  const health = getHealthStatus();
  res.json(health);
}
