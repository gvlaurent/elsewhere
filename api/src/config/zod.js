// Rôle : point d'entrée unique de Zod dans l'API. Règle une fois pour toutes
// la langue des messages d'erreur (français), puis partage z. Tout fichier
// qui décrit des données importe z d'ici, jamais directement de 'zod' : les
// messages sont ainsi en français quel que soit l'ordre de chargement.
import { z } from 'zod';

z.config(z.locales.fr());

export { z };
