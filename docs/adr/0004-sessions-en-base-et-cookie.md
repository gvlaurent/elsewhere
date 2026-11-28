# ADR-0004 : la session vit en base, le navigateur n'en garde qu'un jeton dans un cookie protégé

Date : 28 novembre 2026 (ELS-17). Statut : accepté.

## Contexte

F4 demande une inscription par e-mail et mot de passe, un mot de passe haché et des sessions sécurisées. C1 exige une **déconnexion qui invalide la session côté serveur**. Le PRD veut aussi que l'authentification soit codée dans Express, pas confiée à Supabase, pour que le jury voie le travail. L'interface et l'API partagent une seule adresse (ADR-0003).

## Décision

**Mot de passe : Argon2id** (bibliothèque `argon2`), l'algorithme que l'OWASP recommande en premier, avec ses réglages minimaux (19 Mio de mémoire, 2 passes, 1 fil). Ils sont plus légers que ceux par défaut, parce que l'offre gratuite de Render n'a que 512 Mo de mémoire. Chaque hash contient son sel et ses réglages. Il faut au moins 12 caractères et au plus 128.

**Session : une ligne dans la table `sessions`** (migration 002), et un jeton dans un cookie.

```text
connexion réussie
  jeton = 32 octets aléatoires (256 bits)        → envoyé au navigateur, cookie elsewhere_session
  empreinte = SHA-256(jeton)                      → gardée en base, avec l'expiration (30 jours)

requête suivante
  cookie → SHA-256 → session trouvée et pas expirée ? → membre connecté, sinon 401

déconnexion
  ligne supprimée en base → le cookie, même copié, ne sert plus à rien
```

- **Le cookie** est `HttpOnly` (le JavaScript de la page ne le lit pas : une faille XSS ne vole pas la session), `Secure` (seulement en HTTPS), `SameSite=Lax` (un autre site ne peut pas déclencher un POST connecté : protection contre la falsification de requête, ou CSRF) et limité à `/api`.
- **La base ne garde que l'empreinte du jeton** : une copie volée de la base ne permet de se connecter à aucun compte.
- **Un e-mail inconnu et un mauvais mot de passe reçoivent la même réponse** (401, même message), en un temps comparable : la connexion ne révèle pas qui est inscrit.
- **Au-delà de 10 échecs en 15 minutes sur un même e-mail**, la connexion est refusée (429). On compte par e-mail, parce que l'adresse IP vue par l'API, derrière les relais de Render, n'est pas fiable.

## Options écartées

- **Jeton JWT signé, sans table** : rien à lire en base à chaque requête, mais un jeton reste valable jusqu'à son expiration. Pour respecter C1, il faudrait une liste des jetons révoqués, c'est-à-dire une table quand même, avec plus de code.
- **`express-session` avec un stockage PostgreSQL** : deux dépendances de plus pour une quarantaine de lignes de code, qui resteraient invisibles pour le jury.
- **L'authentification de Supabase** : écartée par le PRD (Supabase sert uniquement de base).
- **bcrypt** : encore acceptable, mais l'OWASP le place après Argon2id, et il tronque les mots de passe au-delà de 72 octets.

## Conséquences

- Chaque requête protégée lit une ligne en base (index unique sur `token_hash`) : un coût négligeable à l'échelle d'Elsewhere.
- Un membre peut être connecté sur plusieurs appareils : une session par appareil. Les sessions expirées d'un membre sont effacées à sa connexion suivante.
- Le compteur d'échecs vit dans la mémoire du serveur : il repart à zéro au redémarrage et ne serait pas partagé entre plusieurs serveurs. Il suffit tant qu'une seule instance tourne. Quelqu'un peut aussi bloquer un compte 15 minutes en le visant exprès.
- **Au plus 4 calculs Argon2 en même temps** (environ 76 Mio) : une rafale d'inscriptions ou de connexions fait la queue au lieu de saturer la mémoire du serveur.
- **Limite par adresse IP renvoyée à ELS-42.** Ni l'inscription ni les essais d'un même mot de passe sur beaucoup de comptes ne sont encore limités par visiteur. Il faut d'abord vérifier quelle adresse les relais de Render transmettent à l'API (en-tête `X-Forwarded-For`), sinon tous les visiteurs partageraient le même compteur.
- **L'inscription révèle qu'un e-mail a déjà un compte** (409). C'est un compromis courant : la connexion, elle, ne le révèle pas, et un message vague à l'inscription perdrait le membre qui a oublié qu'il était inscrit.
- **Safari refuse un cookie `Secure` sur `http://localhost`** : en développement, tester la connexion avec Chrome ou Firefox. En ligne, tout passe en HTTPS.
- La réinitialisation du mot de passe (C1, ELS-39) ajoutera sa propre table de jetons, sur le même principe : jeton aléatoire, empreinte en base, usage unique.
