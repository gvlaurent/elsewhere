// Rôle : hachage des mots de passe, utilisé par le service des comptes
// (auth-service.js). Le mot de passe n'est jamais stocké : la base garde
// son hash, une empreinte à sens unique dont on ne peut pas le retrouver.
//
// Algorithme : Argon2id, celui que l'OWASP recommande en premier. Il est
// volontairement lent et gourmand en mémoire : tester des milliards de mots
// de passe sur une base volée devient hors de prix. Chaque hash contient
// son propre sel aléatoire et ses réglages ($argon2id$v=19$m=19456,t=2,p=1$…),
// ce qui permettra de les renforcer plus tard sans casser les anciens.
import argon2 from 'argon2';

// Réglages minimaux de l'OWASP pour Argon2id : 19 Mio de mémoire,
// 2 passes, 1 fil. Plus légers que ceux par défaut de la bibliothèque
// (64 Mio) : l'offre gratuite de Render n'a que 512 Mo de mémoire.
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456, // en Kio
  timeCost: 2,
  parallelism: 1,
};

// Calcule le hash d'un mot de passe. Reçoit le mot de passe en clair ;
// renvoie (promesse) le hash complet, prêt à stocker dans users.password_hash.
// Asynchrone : le calcul prend quelques dizaines de millisecondes et tourne
// hors du fil principal de Node, qui continue à servir les autres requêtes.
export function hashPassword(password) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

// Vérifie un mot de passe. Reçoit le hash stocké et le mot de passe proposé ;
// renvoie (promesse) true s'ils correspondent, false sinon. La bibliothèque
// relit le sel et les réglages dans le hash, puis compare en temps constant.
export function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}
