// Rôle : la première liste de lieux d'Elsewhere, lue par la commande
// d'importation des stations (npm run stations:import, ELS-22).
//
// Source : validée par Gabriel le 28/11/2026, à partir des personas et des
// thèmes du PRD (docs/prd.md, section 3) : Dakar pour Aminata, Lagos et
// Accra pour le « highlife » de Julien, Bogotá pour la cumbia, Istanbul pour
// le rock turc, Lisbonne pour le fado.
//
// Chaque lieu donne ce que la table places attend (nom, pays, fuseau IANA
// pour l'heure locale) et, en plus, ses alias : les textes cherchés dans le
// champ libre « state » de Radio Browser pour rattacher une station au lieu,
// ou dans le nom de la station quand ce champ est vide (règle « la région
// d'abord, sinon le nom », décidée le 28/11/2026).
// Ce champ varie (« Lagos », « Lagos State », « Greater Accra », avec ou
// sans accent) : la comparaison ignore majuscules et accents, et un alias
// n'a qu'à être contenu dans le champ (voir station-selection.js). Si le
// rapport d'importation montre beaucoup de « lieu inconnu » pour un pays,
// c'est sans doute qu'un alias manque ici.
//
// Object.freeze : la liste ne peut pas être modifiée par erreur ailleurs.
export const STARTING_PLACES = Object.freeze([
  {
    name: 'Dakar',
    countryCode: 'SN',
    countryName: 'Sénégal',
    timezone: 'Africa/Dakar',
    stateAliases: ['Dakar'],
  },
  {
    name: 'Lagos',
    countryCode: 'NG',
    countryName: 'Nigeria',
    timezone: 'Africa/Lagos',
    stateAliases: ['Lagos'],
  },
  {
    name: 'Accra',
    countryCode: 'GH',
    countryName: 'Ghana',
    timezone: 'Africa/Accra',
    stateAliases: ['Accra'],
  },
  {
    name: 'Bogotá',
    countryCode: 'CO',
    countryName: 'Colombie',
    timezone: 'America/Bogota',
    stateAliases: ['Bogota'],
  },
  {
    name: 'Istanbul',
    countryCode: 'TR',
    countryName: 'Turquie',
    timezone: 'Europe/Istanbul',
    stateAliases: ['Istanbul'],
  },
  {
    name: 'Lisbonne',
    countryCode: 'PT',
    countryName: 'Portugal',
    timezone: 'Europe/Lisbon',
    stateAliases: ['Lisboa', 'Lisbon'],
  },
]);
