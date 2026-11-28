// Rôle : couche « routes » des lieux et du tableau du direct (F1). Associe
// chaque adresse sous /api/places à son contrôleur, avec la validation des
// entrées (400). Routes publiques : pas de requireAuth, on écoute sans
// compte (PRD, principe n° 1).
import { Router } from 'express';
import { z } from '../config/zod.js';
import { validate } from '../middlewares/validate.js';
import { getPlaceStations, getPlaces } from '../controllers/places-controller.js';

// L'identifiant arrive en texte dans l'adresse : z.coerce le convertit en
// nombre, puis on exige un entier positif. « abc », « 0 » ou « 1.5 »
// repartent en 400 avant d'atteindre la base. Le plafond est celui du type
// integer de PostgreSQL : au-delà, la base lèverait une erreur (500).
const PG_INTEGER_MAX = 2_147_483_647;
const placeParams = z.object({ id: z.coerce.number().int().positive().max(PG_INTEGER_MAX) });

// Fabrique le routeur des lieux. Ne reçoit rien ; renvoie un routeur
// Express neuf, comme createAuthRoutes.
export function createPlacesRoutes() {
  const router = Router();

  router.get('/', getPlaces);
  router.get('/:id/stations', validate({ params: placeParams }), getPlaceStations);

  return router;
}
