// Rôle : couche « contrôleurs » des lieux (F1). Fait le lien entre HTTP et
// places-service.js : lit les données validées (req.validated) et le pool,
// appelle le service, écrit la réponse JSON. Aucune règle métier ici.
import { getPlaceBoard, listPlaces } from '../services/places-service.js';

// GET /api/places. Répond 200 avec { places }, les lieux qui ont au moins
// une station active.
export async function getPlaces(req, res) {
  const places = await listPlaces(req.app.locals.db);
  res.json({ places });
}

// GET /api/places/:id/stations. Répond 200 avec { place, stations }, le
// tableau du direct du lieu. Un lieu inconnu part en 404 (levé par le
// service, traduit par la gestion d'erreurs centrale).
export async function getPlaceStations(req, res) {
  const board = await getPlaceBoard(req.app.locals.db, req.validated.params.id);
  res.json(board);
}
