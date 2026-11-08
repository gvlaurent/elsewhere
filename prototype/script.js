const audio = document.querySelector("#radio");                         // Range le lecteur audio dans une boite qui s'appelle audio
const playBtn = document.querySelector(".play-btn");                    // Range le bouton paly dans une boite qui s'appelle playBtn
const surpriseBtn = document.querySelector(".surprise-btn");            // Range le BOUTON SURPRENDS-MOI dans une boite qui s'appelle surpriseBtn

// API radio-browser.info : 1 station au hasard, en HTTPS, MP3, qui fonctionne
const API_URL = "https://de1.api.radio-browser.info/json/stations/search" // Range l'url de l'API dans la boite API_URL (majuscule pour dire réglage fixe)
    + "?is_https=true&hidebroken=true&codec=MP3&order=random&limit=1";    // + sert à coller pour la lisibilité  et après ? paramètres de l'API séparés par &
    
// Traduit un code pays ("JP") en nom français ("Japon")
const countryNames = new Intl.DisplayNames(["fr"], { type: "region" });

// Convertit une station de l'API au format qu'utilise notre carte
function toStation(apiStation) {
    const country = apiStation.countrycode ? countryNames.of(apiStation.countrycode) : apiStation.country;
    return {
        name: apiStation.name.trim(),
        place: [apiStation.state, country].filter(Boolean).join(", "),
        tags: apiStation.tags.split(",").slice(0, 3).join(" · "),
        url: apiStation.url_resolved,
    };
}

// Met le bouton à jour (icône pause + texte lu par les lecteurs d'écran)
function setPlaying(isPlaying) {
    playBtn.classList.toggle("is-playing", isPlaying);
    playBtn.setAttribute("aria-label", isPlaying ? "Mettre la radio en pause" : "Écouter la radio");
}

// Le lecteur audio prévient quand il démarre ou s'arrête
audio.addEventListener("play", () => setPlaying(true));
audio.addEventListener("pause", () => setPlaying(false));

// Lecture et mise en pause de la satation de radio
playBtn.addEventListener("click", () => {                               // sur le bouton play, écoute l'évènement "click" et exécute ceci {
    if (audio.paused) {                                                 // Si le lecteur audio est en pause
        audio.play().catch((erreur) => {                                // Audio.play renvoie une promesse "Promise", .catch dit quoi faire en cas d'échec
            console.error("Une erreur s'est produite : ", erreur);      // affiche console.error avec le message "Une erreur s'est produite"
        });                 
    } else {                                                            // Sinon
        audio.pause();                                                  // lecteur audio en pause.
    } 
});

// Demande une station au hasard à radio-browser et la renvoie
async function pickRandomStation() {
    //A COMPLETER fetch(API_URL)
}

// Affiche une station sur la carte et lance sa lecture
function playStation(station) {
    document.querySelector(".station-name").textContent = station.name;
    document.querySelector(".station-place").textContent = station.place;
    document.querySelector(".station-tags").textContent = station.tags;
    audio.src = station.url;
    audio.play().catch((erreur) => {
        console.error("Impossible de lancer " + station.name + " : ", erreur);
    });
}

surpriseBtn.addEventListener("click", async () => {
    try {
        playStation(await pickRandomStation());
    } catch (erreur) {
        console.error("Impossible de joindre radio-browser : ", erreur);
    }
});
