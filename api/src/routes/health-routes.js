// Rôle : couche « routes » de la santé de l'API. Associe chaque adresse
// à la fonction du contrôleur qui la traite, et rien d'autre.
import { Router } from 'express';
import { getHealth } from '../controllers/health-controller.js';

const router = Router();

router.get('/', getHealth);

export default router;
