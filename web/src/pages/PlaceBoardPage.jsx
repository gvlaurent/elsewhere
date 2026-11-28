// Rôle : le tableau du direct d'un lieu (maquette 02, F1), à l'adresse
// /lieux/:id. Montre chaque radio active du lieu avec son titre en cours,
// ou « Titre indisponible » : l'API ne donne un titre que s'il a été lu il
// y a moins de 5 minutes, et l'écran n'en invente jamais.
//
// Hors de ce ticket : la lecture du son (ELS-25) et le guide du lieu
// (ELS-27). Toucher une station ne joue rien pour l'instant.
import { Link, useParams } from 'react-router'
import { getPlaceBoard } from '../api/places-api.js'
import { useApiData } from '../api/use-api-data.js'
import { BackLink } from '../components/BackLink.jsx'
import { Icon } from '../components/Icon.jsx'
import { LoadError } from '../components/LoadError.jsx'
import { describePlace } from '../components/place-summary.js'
import { StationRow } from '../components/StationRow.jsx'
import { formatLocalTime } from '../time/local-time.js'
import { useCurrentMinute } from '../time/use-current-minute.js'

// Ne reçoit rien : l'identifiant du lieu est lu dans l'adresse. Renvoie le
// tableau, ou l'état du chargement, de l'erreur ou du lieu inconnu.
export function PlaceBoardPage() {
  const { id } = useParams()
  const { status, data, error, retry } = useApiData(getPlaceBoard, id)

  // 404 : le lieu n'existe pas ; 400 : l'adresse ne contient pas un
  // identifiant valable (/lieux/abc). Dans les deux cas, aucun lieu à montrer.
  if (status === 'error' && (error.status === 404 || error.status === 400)) {
    return <UnknownPlace />
  }

  return (
    <>
      <BackLink label="Lieux" />
      {status === 'loading' && <p role="status">Chargement…</p>}
      {status === 'error' && <LoadError error={error} onRetry={retry} />}
      {status === 'success' && <Board place={data.place} stations={data.stations} />}
    </>
  )
}

// Reçoit le lieu et ses stations ; renvoie l'en-tête du lieu (pays, heure
// locale, nombre de radios) et la liste des stations.
function Board({ place, stations }) {
  const now = useCurrentMinute()
  const meta = describePlace(formatLocalTime(place.timezone, now), stations.length)

  return (
    <>
      <header className="screen-header">
        <h1>{place.name}</h1>
        <p className="lead">{`${place.countryName} · ${meta}`}</p>
      </header>
      <p className="note">
        <Icon name="clock" />
        Titres relevés il y a moins de 5 minutes. Sinon : « titre indisponible ».
      </p>
      {stations.length === 0 ? (
        <p className="note">Aucune radio n'est en direct ici pour l'instant.</p>
      ) : (
        <ul className="card-list" aria-label={`Radios en direct à ${place.name}`}>
          {stations.map((station) => (
            <StationRow key={station.id} station={station} />
          ))}
        </ul>
      )}
    </>
  )
}

// Ne reçoit rien ; renvoie le message du lieu inconnu et le chemin vers la
// liste des lieux.
function UnknownPlace() {
  return (
    <>
      <BackLink label="Lieux" />
      <header className="screen-header">
        <h1>Lieu introuvable</h1>
        <p className="lead">
          Ce lieu n'existe pas ou n'est plus proposé. <Link to="/lieux">Voir les lieux en direct</Link>
        </p>
      </header>
    </>
  )
}
