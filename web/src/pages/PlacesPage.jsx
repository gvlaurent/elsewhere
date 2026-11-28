// Rôle : écran des lieux, l'accueil d'Elsewhere (maquette 01, F1). Liste
// les lieux qui ont des radios en direct, avec leur pays, leur heure locale
// et leur nombre de radios. Sans compte. Toucher un lieu ouvre son tableau
// du direct (/lieux/:id).
//
// La recherche d'un lieu de la maquette n'est pas codée : avec six lieux
// de départ, la liste se lit d'un coup d'œil.
import { Link } from 'react-router'
import { getPlaces } from '../api/places-api.js'
import { useApiData } from '../api/use-api-data.js'
import { Icon } from '../components/Icon.jsx'
import { LoadError } from '../components/LoadError.jsx'
import { describePlace } from '../components/place-summary.js'
import { formatLocalTime } from '../time/local-time.js'
import { useCurrentMinute } from '../time/use-current-minute.js'

// Ne reçoit rien. Renvoie l'en-tête, puis la liste des lieux, ou l'état du
// chargement ou de l'erreur.
export function PlacesPage() {
  const { status, data: places, error, retry } = useApiData(getPlaces)

  return (
    <>
      <header className="screen-header">
        <h1>Elsewhere</h1>
        <p className="lead">Écoutez ce qui passe ailleurs, maintenant. Sans compte.</p>
      </header>
      <section className="section" aria-labelledby="places-title">
        <h2 id="places-title">Lieux en direct</h2>
        {status === 'loading' && <p role="status">Chargement…</p>}
        {status === 'error' && <LoadError error={error} onRetry={retry} />}
        {status === 'success' && <PlaceList places={places} />}
      </section>
    </>
  )
}

// Reçoit la liste des lieux reçue de l'API ; renvoie leurs cartes, ou un
// message honnête s'il n'y en a aucun. L'heure locale de chaque lieu est
// recalculée à chaque nouvelle minute.
function PlaceList({ places }) {
  const now = useCurrentMinute()

  if (places.length === 0) {
    return <p className="note">Aucun lieu n'a de radio en direct pour l'instant.</p>
  }

  return (
    <>
      <ul className="card-list" aria-labelledby="places-title">
        {places.map((place) => (
          <li key={place.id}>
            <Link to={`/lieux/${place.id}`} className="place-card">
              <span className="place-card__badge">
                <Icon name="pin" size={24} />
              </span>
              <span className="place-card__text">
                <span className="place-card__name">
                  {place.name}, {place.countryName}
                </span>
                <span className="place-card__meta">
                  {describePlace(formatLocalTime(place.timezone, now), place.stationCount)}
                </span>
              </span>
              <Icon name="chevron" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="note">
        <Icon name="info" />
        Heure locale de chaque lieu. Lieux choisis par les curateurs.
      </p>
    </>
  )
}
