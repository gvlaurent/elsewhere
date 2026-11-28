// Rôle : couche « contrôleurs » des moments. Fait le lien entre HTTP et le
// service : lit le membre connecté (req.user, posé par requireAuth) et les
// données validées (req.validated), appelle moments-service.js, puis écrit
// la réponse et son code. Aucune règle métier ici.
import { deleteMoment, keepMoment, listMoments } from '../services/moments-service.js';

// POST /api/moments. Garde un moment et répond 201 avec { moment }. Une
// station ou un thème introuvable part en 404 (levé par le service).
export async function create(req, res) {
  const moment = await keepMoment(req.app.locals.db, req.user.id, req.validated.body);
  res.status(201).json({ moment });
}

// GET /api/moments. Répond 200 avec { moments } : ceux du membre connecté,
// du plus récent au plus ancien.
export async function list(req, res) {
  const moments = await listMoments(req.app.locals.db, req.user.id);
  res.json({ moments });
}

// DELETE /api/moments/:id. Supprime le moment et répond 204 (« fait, rien à
// renvoyer »). Un moment absent ou d'un autre membre part en 404.
export async function remove(req, res) {
  await deleteMoment(req.app.locals.db, req.user.id, req.validated.params.id);
  res.status(204).end();
}
