// Rôle : préparation commune à tous les tests de l'interface, chargée par
// Vitest avant chaque fichier de test (voir vite.config.js).
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Après chaque test : on retire l'écran affiché et on rend le vrai fetch,
// pour qu'un test ne déborde jamais sur le suivant.
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
