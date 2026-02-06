const STORAGE_KEY = "poe2_craft_history_v1";

const form = document.getElementById("craft-form");
const resultat = document.getElementById("resultat");
const historique = document.getElementById("historique");

const baseBySlot = {
  arme: "Priorise une base avec fort potentiel de degats et un bon niveau d'objet.",
  casque: "Cherche une base defensive adaptee a ta classe (armure/evasion/es).",
  armure: "Base torse = plus gros impact defensif, qualite et niveau d'objet prioritaires.",
  gants: "Vise une base qui complete tes manques (defense ou utilite).",
  bottes: "Priorite a la vitesse de deplacement puis defenses utiles.",
  ceinture: "Base stable orientee survie/resistances pour lisser le build.",
  anneau: "Base flexible pour corriger resistances et stats offense/defense.",
  amulette: "Base a fort impact build: stats globales, offense et utility."
};

function planCraft({ slot, objectif, stade, budget, risque }) {
  const steps = [];

  steps.push(baseBySlot[slot]);
  steps.push("Definis 2 a 3 mods cibles max. Si tu en vises trop, le craft devient instable.");

  if (budget === "faible") {
    steps.push("Commence par des crafts deterministes: essences, craft bench et ajustements simples.");
  } else if (budget === "moyen") {
    steps.push("Combine craft deterministe + relances controlees pour verrouiller les mods clefs.");
  } else {
    steps.push("Budget eleve: vise un plan multi-etapes avec verrouillage des bons prefixes/suffixes.");
  }

  if (objectif === "degats") {
    steps.push("Priorise les mods offensifs du build avant les stats de confort.");
  }
  if (objectif === "survie") {
    steps.push("Cap d'abord les defenses critiques (vie/es/armure/evasion) avant d'optimiser les degats.");
  }
  if (objectif === "resistances") {
    steps.push("Fixe tes caps de resistances tot au craft pour eviter les blocages de progression.");
  }
  if (objectif === "mobilite") {
    steps.push("Ajoute des mods de confort (vitesse, fluidite) une fois la base defensive stable.");
  }

  if (stade === "leveling") {
    steps.push("Pendant le leveling: depense peu, upgrade souvent, remplace vite les pieces faibles.");
  } else if (stade === "midgame") {
    steps.push("En midgame: stabilise un set coherent avant de chasser le perfect item.");
  } else {
    steps.push("En endgame: specialise le craft pour ton build final et prepare plusieurs iterations.");
  }

  if (risque === "safe") {
    steps.push("Mode safe: stoppe le craft des que l'objet atteint un bon niveau jouable.");
  } else if (risque === "equilibre") {
    steps.push("Mode equilibre: tente 1 ou 2 upgrades de plus, puis arbitre cout / gain.");
  } else {
    steps.push("Mode agressif: autorise des tentatives high variance avec limite de budget stricte.");
  }

  steps.push("Valide toujours l'objet en situation reelle (map/boss) avant d'investir plus.");

  return steps;
}

function renderResult(data, steps) {
  const titre = `${data.slot} | ${data.objectif} | ${data.stade}`;
  const list = steps.map((step) => `<li>${step}</li>`).join("");

  resultat.innerHTML = `
    <p class="tag">Plan recommande</p>
    <p><strong>${titre}</strong> - budget ${data.budget}, risque ${data.risque}</p>
    <ul>${list}</ul>
  `;
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(entry) {
  const entries = [entry, ...getHistory()].slice(0, 12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function renderHistory() {
  const entries = getHistory();
  if (!entries.length) {
    historique.innerHTML = "<li>Aucun craft enregistre pour le moment.</li>";
    return;
  }

  historique.innerHTML = entries
    .map((entry) => `<li><strong>${entry.summary}</strong> - ${entry.date}</li>`)
    .join("");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());
  const steps = planCraft(data);

  renderResult(data, steps);

  saveHistory({
    summary: `${data.slot} / ${data.objectif} / ${data.stade} / ${data.budget}`,
    date: new Date().toLocaleString("fr-FR")
  });

  renderHistory();
});

renderHistory();
