// Rôle : middleware de validation des entrées, branché sur une route avant
// son contrôleur. Vérifie le corps, les paramètres d'adresse et la requête
// (« ?… ») avec des schémas Zod, et refuse tout ce qui ne correspond pas.
import { z } from 'zod';
import { HttpError } from '../errors/http-error.js';

// Messages d'erreur de Zod en français, pour toute l'API.
z.config(z.locales.fr());

// Les trois endroits d'une requête qui transportent des données du client.
const LOCATIONS = ['params', 'query', 'body'];

// Fabrique le middleware d'une route. Reçoit un objet de schémas Zod, chacun
// facultatif : { params, query, body }. Renvoie un middleware Express qui :
// - si tout est valide, range les données vérifiées (et converties : « 42 »
//   devient 42) dans req.validated, puis passe au contrôleur ;
// - sinon, transmet une HttpError 400 qui liste chaque champ fautif.
// Toutes les erreurs sont collectées avant de répondre, pour que le client
// corrige tout en une fois.
export function validate(schemas) {
  return (req, res, next) => {
    const validated = {};
    const details = [];

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      // Sécurité : seules les données qui ont passé le schéma sont gardées.
      // Un champ inattendu envoyé par le client est retiré par Zod.
      const result = schema.safeParse(req[location] ?? {});
      if (result.success) {
        validated[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ location, field: issue.path.join('.'), message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      return next(new HttpError(400, 'Requête invalide', details));
    }
    req.validated = validated;
    next();
  };
}
