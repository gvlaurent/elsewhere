# Documents de domaine

Comment les skills d'ingénierie lisent le vocabulaire et les décisions du projet avant d'explorer le code.

## À lire avant d'explorer

- **`GLOSSARY.md`** à la racine : le vocabulaire du projet (station, flux, titre en cours…).
- **`docs/adr/`** : les décisions d'architecture (ADR, *Architecture Decision Record* : une fiche courte par choix structurant, avec son contexte et sa raison). Lire celles qui touchent la zone de travail.
- **`docs/prd.md`** : le périmètre du produit ; lire d'abord ses « écarts connus ».

Si l'un de ces fichiers n'existe pas encore, **continuer sans le signaler**. Le skill `/domain-modeling` (appelé par `/grill-with-docs` et `/improve-codebase-architecture`) les crée au fil de l'eau, quand un terme ou une décision est vraiment tranché.

## Organisation

Dépôt à contexte unique :

```
/
├── GLOSSARY.md
├── docs/
│   ├── prd.md
│   └── adr/
│       └── 0001-<decision>.md
├── api/
└── web/
```

## Utiliser le vocabulaire du glossaire

Quand une sortie nomme un concept du domaine (titre de ticket, proposition de refactorisation, nom de test), employer le terme défini dans `GLOSSARY.md`, pas un synonyme. Le glossaire est en français ; les noms dans le code restent en anglais (voir `CONTRIBUTING.md`), le glossaire donne la correspondance.

Si le concept manque au glossaire, c'est un signal : soit on invente un mot que le projet n'emploie pas (à reconsidérer), soit il y a un vrai manque (à noter pour `/domain-modeling`).

## Signaler les conflits avec un ADR

Si une sortie contredit un ADR existant, le dire explicitement au lieu de passer outre :

> _Contredit l'ADR-0003 (Supabase comme base uniquement), mais mérite d'être rouvert parce que…_
