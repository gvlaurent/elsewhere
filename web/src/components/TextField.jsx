// Rôle : un champ de formulaire accessible, réutilisé par tous les écrans.
// Étiquette visible au-dessus (RGAA 11.1), aide et erreur sous le champ,
// reliées au champ pour que le lecteur d'écran les lise avec lui.

// Reçoit :
// - id, label, type, value, onChange, autoComplete : le champ lui-même ;
// - placeholder : exemple grisé dans le champ vide (jamais à la place de l'étiquette) ;
// - hint : texte d'aide facultatif (« 12 caractères au moins. ») ;
// - error : message d'erreur facultatif, affiché sous le champ ;
// - inputRef : référence vers le champ, pour lui donner le focus.
// Renvoie le bloc étiquette + champ + aide + erreur.
export function TextField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  placeholder,
  hint,
  error,
  inputRef,
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  // aria-describedby liste les textes lus après l'étiquette : l'aide, puis l'erreur.
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={id}
        className="field-input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
