# Glossaire d'Elsewhere

Le vocabulaire du projet. Les termes sont en français ; la colonne « Dans le code » donne le nom anglais utilisé dans le code et la base (voir `CONTRIBUTING.md`).

| Terme | Dans le code | Définition |
| --- | --- | --- |
| Lieu | `place` | Ville ou région où se trouvent des stations, avec son pays et son fuseau horaire. On entre dans Elsewhere par un lieu ou par un thème. |
| Station | `station` | Radio musicale recopiée depuis l'annuaire Radio Browser dans le cache d'Elsewhere. Elle est active ou masquée par un admin. |
| Flux | `stream` | Le son en direct d'une station, lu par le navigateur sans passer par l'API. |
| Titre en cours | `last_title` (station) | Dernier artiste et morceau lus dans les métadonnées du flux d'une station, gardés seulement s'ils sont classés lisibles, avec l'heure de cette lecture (`last_title_read_at`). Affiché s'il a moins de 5 minutes, sinon « titre indisponible ». Jamais inventé. |
| Titre gardé | `track_title` (moment) | Copie du titre en cours au moment où le membre garde un moment. Vide si le titre était indisponible : on ne le complète jamais après coup. |
| Thème | `theme` | Genre musical d'une liste fermée (cumbia, highlife, rock turc). Une station peut en avoir plusieurs. |
| Membre | `user` (rôle `member`) | Auditeur qui a créé un compte. On écoute sans compte ; le compte n'est demandé que pour garder quelque chose. |
| Admin | `user` (rôle `admin`) | Membre qui entretient le catalogue : il masque ou réactive les stations signalées. |
| Session | `session` | Connexion ouverte d'un membre sur un appareil, valable 30 jours. Le navigateur garde un jeton secret dans un cookie, la base n'en garde que l'empreinte. Se déconnecter la supprime. |
| Moment | `moment` | Souvenir gardé par un membre pendant une écoute : station, lieu, heure locale, titre s'il était lisible, thème d'entrée. Il garde une copie de ces informations. |
| Passeport | — | Les moments d'un membre rangés par pays, du plus récent au plus ancien (F6). |
| Liste | `list` | Sélection personnelle et privée de stations faite par un membre (« Réveil »). |
| Signalement | `report` | Message d'un membre qui indique qu'une station ne marche pas, avec un motif choisi dans une liste courte. |
| Migration | `migrations/NNN_*.sql` | Fichier SQL numéroté qui fait évoluer la structure de la base ; appliqué une seule fois, jamais modifié ensuite. |
