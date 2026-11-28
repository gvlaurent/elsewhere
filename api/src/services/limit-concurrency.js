// Rôle : petit outil des services qui limite le nombre de tâches
// asynchrones lancées en même temps ; les suivantes attendent leur tour,
// comme une file à un guichet. Il sert au hachage des mots de passe
// (password-hashing.js), qui réserve beaucoup de mémoire à chaque calcul.

// Fabrique un limiteur. Reçoit le nombre maximal de tâches simultanées.
// Renvoie une fonction run(task) : task est une fonction asynchrone ; run
// la lance dès qu'une place est libre et renvoie (promesse) son résultat,
// ou son erreur.
export function limitConcurrency(max) {
  let running = 0;
  const waiting = []; // fonctions qui réveillent les tâches en attente

  return async function run(task) {
    // Asynchrone : si toutes les places sont prises, on attend qu'une tâche
    // finisse et nous réveille. Boucle plutôt que « if » : une place libérée
    // peut avoir été reprise entre le réveil et notre tour.
    while (running >= max) {
      await new Promise((resolve) => waiting.push(resolve));
    }
    running += 1;
    try {
      return await task();
    } finally {
      // Même si la tâche a échoué, sa place est rendue et la suivante part.
      running -= 1;
      waiting.shift()?.();
    }
  };
}
