// Rôle : rassemble toutes les routes de l'API sous un seul routeur.
// app.js n'importe que ce fichier : ajouter une ressource se fait ici.
import { Router } from 'express';
import healthRoutes from './health-routes.js';

const router = Router();

router.use('/health', healthRoutes);

export default router;
