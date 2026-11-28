// Rôle : l'état des erreurs d'un formulaire, commun à tous les écrans qui en
// ont un (inscription, connexion…). Un « crochet » (hook) React est une
// fonction qui garde un état pour le composant qui l'appelle.
import { useState } from 'react'
import { FIELD_ERROR_SUMMARY, focusFirstInvalidField } from './form-errors.js'

// Reçoit la liste des champs du formulaire, dans l'ordre d'affichage.
// Renvoie :
// - fieldErrors : { champ: message } ; formError : le message de tête ;
// - clearErrors() : tout vider, au début de chaque envoi ;
// - showErrors({ fieldErrors, formError }, refs) : afficher les erreurs et
//   donner le focus au premier champ fautif ;
// - clearFieldError(champ) : retirer l'erreur d'un champ que le membre modifie.
export function useFormErrors(fields) {
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  function clearErrors() {
    // Le bloc d'alerte disparaît : si la même erreur revient, il est remis et
    // le lecteur d'écran l'annonce de nouveau (un texte identique ne l'est pas).
    setFieldErrors({})
    setFormError('')
  }

  function showErrors(errors, refs) {
    setFieldErrors(errors.fieldErrors)
    setFormError(errors.formError)
    // Les références sont lues ici, dans une réaction à un événement, et
    // jamais pendant l'affichage : c'est la règle de React.
    focusFirstInvalidField(fields, errors.fieldErrors, refs)
  }

  function clearFieldError(field) {
    if (!(field in fieldErrors)) return
    const remaining = { ...fieldErrors }
    delete remaining[field]
    setFieldErrors(remaining)
    // Plus aucun champ en erreur : la phrase « corrigez le ou les champs
    // signalés » n'a plus d'objet. Un autre message de tête (429…) reste.
    if (Object.keys(remaining).length === 0 && formError === FIELD_ERROR_SUMMARY) setFormError('')
  }

  return { fieldErrors, formError, clearErrors, showErrors, clearFieldError }
}
