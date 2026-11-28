// Tests de l'heure locale d'un lieu, calculée dans le navigateur à partir
// de son fuseau IANA (F1).
import { describe, expect, it } from 'vitest'
import { formatLocalTime } from './local-time.js'

// Le même instant pour tous les lieux : 21 h 58 à Dakar (UTC+0).
const INSTANT = new Date('2026-11-28T21:58:00Z')

describe('formatLocalTime', () => {
  it("donne l'heure d'un fuseau, à la française", () => {
    expect(formatLocalTime('Africa/Dakar', INSTANT)).toBe('21 h 58')
    expect(formatLocalTime('Africa/Lagos', INSTANT)).toBe('22 h 58')
    expect(formatLocalTime('America/Mexico_City', INSTANT)).toBe('15 h 58')
  })

  it('écrit minuit et les minutes sur deux chiffres', () => {
    expect(formatLocalTime('Europe/Lisbon', new Date('2026-11-28T00:05:00Z'))).toBe('0 h 05')
  })

  it('renvoie null pour un fuseau inconnu, au lieu de faire planter l\'écran', () => {
    expect(formatLocalTime('Nulle/Part', INSTANT)).toBeNull()
  })
})
