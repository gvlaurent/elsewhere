// Rôle : règle commune à tous les formulaires pour placer une erreur de
// l'API au bon endroit : sous le champ concerné, ou en tête du formulaire.
import { ApiError, fieldErrorsOf } from '../api/api-client.js'

// Phrase de tête quand l'erreur est sur un champ : le détail est écrit sous
// le champ (et lu par le lecteur d'écran quand il y reçoit le focus).
export const FIELD_ERROR_SUMMARY = "Le formulaire n'a pas été envoyé : corrigez le champ signalé."

// Répartit une erreur entre les champs et la tête du formulaire. Reçoit
// l'erreur levée par l'appel et la liste des champs affichés (['email',
// 'password']). Renvoie { fieldErrors, formError } :
// - fieldErrors : { champ: message } pour les champs de cette liste ;
// - formError : la phrase de tête, ou le message de l'API s'il ne concerne
//   aucun champ affiché (401, 429, 500, réseau coupé).
export function splitFormErrors(error, fields) {
  const fieldErrors = {}
  for (const [field, message] of Object.entries(fieldErrorsOf(error))) {
    if (fields.includes(field)) fieldErrors[field] = message
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, formError: FIELD_ERROR_SUMMARY }
  }
  const formError = error instanceof ApiError ? error.message : 'Une erreur inattendue est survenue. Réessayez.'
  return { fieldErrors, formError }
}

// Le premier champ en erreur, dans l'ordre d'affichage : c'est lui qui
// reçoit le focus. Reçoit la liste des champs et fieldErrors ; renvoie un
// nom de champ, ou undefined.
export function firstInvalidField(fields, fieldErrors) {
  return fields.find((field) => field in fieldErrors)
}
