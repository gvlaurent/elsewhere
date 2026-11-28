// Rôle : les petites icônes des maquettes, dessinées en SVG dans le code
// (pas de bibliothèque d'icônes à charger). Elles sont décoratives : chaque
// icône est accompagnée d'un texte visible, donc cachée aux lecteurs d'écran.

const ICONS = {
  back: <path d="M19 12H5m6-6-6 6 6 6" />,
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-9.5v.5" />
    </>
  ),
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4m-4-4h10" />,
}

// Reçoit le nom de l'icône (une clé de ICONS) et sa taille en pixels ;
// renvoie le dessin SVG, qui prend la couleur du texte autour de lui.
export function Icon({ name, size = 20 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  )
}
