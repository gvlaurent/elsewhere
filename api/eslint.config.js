// Configuration d'ESLint pour l'API : les règles recommandées de JavaScript,
// avec les variables globales de Node.js (process, console…) au lieu de celles du navigateur.
import js from '@eslint/js'
import globals from 'globals'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
