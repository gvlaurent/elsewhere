// Rôle : couche « routes » des moments (F5, F6). Associe chaque adresse
// sous /api/moments à son contrôleur, et branche avant lui les
// middlewares : connexion requise (401), puis validation des entrées (400).
// Les droits (« ce moment est-il à toi ? ») sont vérifiés plus loin, dans
// le service.
import { Router } from 'express';
import { z } from '../config/zod.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/require-auth.js';
import { create, list, remove } from '../controllers/moments-controller.js';

// Un identifiant de la base : entier positif, au plus 2 147 483 647, le
// plus grand « integer » de PostgreSQL. Au-delà, la base lèverait une
// erreur (500) au lieu d'un simple « introuvable » : on refuse dès l'entrée.
const databaseId = z.number().int().positive().max(2_147_483_647);

// Le navigateur n'envoie que des identifiants : le titre, les copies et
// l'heure sont calculés par le serveur. Tout autre champ (un titre inventé)
// est retiré par la validation.
const keepBody = z.object({
  stationId: databaseId,
  // Facultatif : absent ou null quand l'auditeur est entré par un lieu.
  themeId: databaseId.nullish(),
});

// Dans l'adresse, l'identifiant arrive en texte (« 42 ») : z.coerce le
// convertit en nombre avant de le vérifier.
const momentParams = z.object({ id: z.coerce.number().pipe(databaseId) });

// Fabrique le routeur des moments. Ne reçoit rien ; renvoie un routeur
// Express. requireAuth est branché sur tout le routeur : aucune route des
// moments n'est accessible sans session.
export function createMomentsRoutes() {
  const router = Router();

  router.use(requireAuth);
  router.post('/', validate({ body: keepBody }), create);
  router.get('/', list);
  router.delete('/:id', validate({ params: momentParams }), remove);

  return router;
}
