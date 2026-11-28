// Tests de la ligne de station (composant « ligne de station » des
// maquettes) : titre en cours ou « titre indisponible », lieu seulement
// s'il est fourni.
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StationRow } from './StationRow.jsx'

// Affiche une ligne dans une liste, comme sur les écrans.
function renderRow(station) {
  return render(
    <ul>
      <StationRow station={station} />
    </ul>,
  )
}

describe('StationRow', () => {
  it('montre le nom et le titre en cours', () => {
    renderRow({ id: 1, name: 'Radio Teranga', title: "Youssou N'Dour – Birima" })

    expect(screen.getByText('Radio Teranga')).toBeInTheDocument()
    expect(screen.getByText("Youssou N'Dour – Birima")).toBeInTheDocument()
    expect(screen.queryByText('Titre indisponible')).not.toBeInTheDocument()
  })

  it('écrit « Titre indisponible » quand le titre manque, sans rien inventer', () => {
    renderRow({ id: 2, name: 'Sabar FM', title: null })

    expect(screen.getByText('Titre indisponible')).toBeInTheDocument()
  })

  it("n'affiche le lieu que s'il est fourni", () => {
    const { unmount } = renderRow({ id: 3, name: 'Joy FM', title: null })
    expect(screen.queryByText(/Ghana/)).not.toBeInTheDocument()
    unmount()

    renderRow({ id: 3, name: 'Joy FM', title: null, placeName: 'Accra', countryName: 'Ghana' })
    expect(screen.getByText('Accra, Ghana')).toBeInTheDocument()
  })

  it("ne propose aucun bouton de lecture tant que le lecteur n'existe pas", () => {
    renderRow({ id: 1, name: 'Radio Teranga', title: null })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
