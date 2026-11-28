// Rôle : une ligne de station (composant « ligne de station » des
// maquettes 02 et 04) : son nom, son titre en cours ou « Titre
// indisponible », et son lieu quand l'écran le demande. Partagée par le
// tableau du direct (ELS-23) et les thèmes (ELS-24).
//
// Pas de bouton de lecture : le lecteur arrive avec ELS-25. Une ligne ne
// fait rien plutôt que de faire semblant de jouer.
import { Icon } from './Icon.jsx'

// Reçoit station = { id, name, title, placeName?, countryName? } : title
// vaut null quand l'API n'a pas de titre récent ; placeName et countryName
// ne sont affichés que s'ils sont fournis (un thème mêle plusieurs lieux,
// le tableau d'un lieu n'en a pas besoin). Renvoie un élément de liste <li>.
export function StationRow({ station }) {
  const { name, title, placeName, countryName } = station
  const place = [placeName, countryName].filter(Boolean).join(', ')

  return (
    <li className={title ? 'station-row' : 'station-row station-row--no-title'}>
      <span className="station-row__badge">
        <Icon name="radio" size={24} />
      </span>
      <div className="station-row__text">
        <p className="station-row__name">{name}</p>
        {place && <p className="station-row__place">{place}</p>}
        {/* Jamais de faux titre : sans titre récent, on l'écrit en toutes
            lettres, avec une icône, pas seulement en gris (RGAA 3.1). */}
        {title ? (
          <p className="station-row__title">
            <Icon name="music" size={16} />
            {title}
          </p>
        ) : (
          <p className="station-row__title station-row__title--missing">
            <Icon name="info" size={16} />
            Titre indisponible
          </p>
        )}
      </div>
    </li>
  )
}
