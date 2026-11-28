// Rôle : écran d'accueil, futur écran des lieux (maquette 01). Pour
// l'instant, seulement son en-tête : la liste des lieux viendra avec
// l'API des stations.

// Ne reçoit rien ; renvoie l'en-tête de l'accueil.
export function HomePage() {
  return (
    <header className="screen-header">
      <h1>Elsewhere</h1>
      <p className="lead">Écoutez ce qui passe ailleurs, maintenant. Sans compte.</p>
    </header>
  )
}
