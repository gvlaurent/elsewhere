// Rôle : middleware de validation des entrées, branché sur une route avant
// son contrôleur. Vérifie le corps, les paramètres d'adresse et la requête
// (« ?… ») avec des schémas Zod (importés de config/zod.js), et refuse tout
// ce qui ne correspond pas.
import { HttpError } from '../errors/http-error.js';

// Les trois endroits d'une requête qui transportent des données du client.
const LOCATIONS = ['params', 'query', 'body'];

// Fabrique le middleware d'une route. Reçoit un objet de schémas Zod, chacun
// facultatif : { params, query, body }. Renvoie un middleware Express qui :
// - si tout est valide, range les données vérifiées (et converties : « 42 »
//   devient 42) dans req.validated, puis passe au contrôleur ;
// - sinon, transmet une HttpError 400 qui liste chaque champ fautif (field
//   vaut null quand c'est l'ensemble qui est faux, par exemple un tableau
//   envoyé à la place d'un objet).
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
          details.push({
            location,
            field: issue.path.length > 0 ? issue.path.join('.') : null,
            message: issue.message,
          });
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
