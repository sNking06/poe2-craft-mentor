const STORAGE_HISTORY = "poe2_craft_history_v2";
const STORAGE_FAVORITES = "poe2_craft_favorites_v2";

const form = document.getElementById("craft-form");
const resultat = document.getElementById("resultat");
const historique = document.getElementById("historique");
const favoris = document.getElementById("favoris");
const guideContent = document.getElementById("guide-content");
const feedback = document.getElementById("feedback");

const saveFavoriteButton = document.getElementById("save-favorite");
const copyPlanButton = document.getElementById("copy-plan");
const clearHistoryButton = document.getElementById("clear-history");
const clearFavoritesButton = document.getElementById("clear-favorites");

let latestPlan = null;

const slotComplexity = {
  arme: 1.35,
  casque: 1.05,
  armure: 1.2,
  gants: 1,
  bottes: 1,
  ceinture: 0.95,
  anneau: 1.15,
  amulette: 1.25
};

const baseChecklist = [
  "Choisir une base adaptee au build et au slot.",
  "Verifier l'item level minimum des mods cibles.",
  "Mettre la qualite avant les etapes couteuses.",
  "Fixer 2 a 3 mods prioritaires maximum.",
  "Definir une limite de budget claire avant de commencer."
];

const damageMods = {
  physique: ["% Physical Damage", "Adds Physical Damage", "% Attack Speed", "% Critical Chance", "% Critical Multiplier"],
  foudre: ["Adds Lightning Damage", "% Lightning Damage", "Shock Effect", "% Cast/Attack Speed", "% Critical Chance"],
  feu: ["Adds Fire Damage", "% Fire Damage", "Ignite Effect", "% Cast/Attack Speed", "% Critical Chance"],
  froid: ["Adds Cold Damage", "% Cold Damage", "Freeze/Chill Effect", "% Cast/Attack Speed", "% Critical Chance"],
  chaos: ["Adds Chaos Damage", "% Chaos Damage", "Damage over Time Multiplier", "% Cast/Attack Speed", "Resistance Penetration"],
  minions: ["+ Minion Levels", "% Minion Damage", "% Minion Attack/Cast Speed", "Minion Life", "Aura/Buff Effect"],
  mixte: ["% Global Damage", "% Cast/Attack Speed", "% Critical Chance", "% Critical Multiplier", "Utility Mod"]
};

const slotDefensiveMods = {
  casque: ["Life/ES", "Resistances", "Attribute Need", "Defensive Base Value", "Utility Prefix"],
  armure: ["High Life/ES", "Core Resistances", "Damage Mitigation", "Recovery", "Build Utility"],
  gants: ["Life/ES", "Resistances", "Attack/Cast Utility", "Suppression/Block", "Attribute Need"],
  bottes: ["Movement Speed", "Life/ES", "Resistances", "Avoidance", "Utility Mod"],
  ceinture: ["High Life", "Resistances", "Flask/Recovery Utility", "Armor/ES", "Attribute Need"],
  anneau: ["Resistances", "Life/ES", "Damage Utility", "Mana Sustain", "Attribute Need"],
  amulette: ["+ Skills/Levels", "Life/ES", "Resistances", "Damage Utility", "Attribute Need"],
  arme: ["Defense Through Offense", "Sustain Utility", "Crit/Leech Utility", "Speed", "Optional Resist"]
};

function setFeedback(message) {
  feedback.textContent = message;
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getRiskFactor(risk) {
  if (risk === "safe") return 0.7;
  if (risk === "equilibre") return 1;
  return 1.3;
}

function getStageFactor(stage) {
  if (stage === "leveling") return 0.7;
  if (stage === "midgame") return 1;
  return 1.2;
}

function pickPriorityMods({ slot, objectif, damageType }) {
  if (objectif === "degats") return damageMods[damageType];
  if (objectif === "resistances") return ["All Resistances", "Single High Resist", "Life/ES", "Attribute Need", "Utility Suffix"];
  if (objectif === "mobilite") return ["Movement/Action Speed", "Utility Trigger", "Life/ES", "Resistances", "QoL Mod"];
  return slotDefensiveMods[slot];
}

function buildChecklist(data) {
  const list = [...baseChecklist];
  if (Number(data.ilvl) < 70) list.push("Alerte: ilvl potentiellement trop bas pour certains mods endgame.");
  if (data.mode === "debutant") list.push("Mode debutant: viser d'abord un item stable et jouable.");
  if (Number(data.budgetDiv) <= 3) list.push("Budget serre: eviter les tentatives a forte variance.");
  if (Number(data.budgetDiv) >= 50) list.push("Budget eleve: planifier une version stable puis une version push.");
  return list;
}

function buildSteps(data) {
  const steps = [
    "Etape 1: Base correcte + item level valide + qualite appliquee.",
    "Etape 2: Obtenir les priorites 1 et 2 avant toute optimisation secondaire.",
    "Etape 3: Stabiliser prefixes/suffixes et corriger les manques critiques.",
    "Etape 4: Ajouter les priorites 3 a 5 selon le budget restant.",
    "Etape 5: Tester en contenu reel puis ajuster si le gain est marginal."
  ];

  if (data.mode === "debutant") {
    steps.push("Regle debutant: arreter apres 2 echecs couteux consecutifs.");
  } else {
    steps.push("Regle avance: preparer un rollback (plan B) avant les etapes risquees.");
  }

  return steps;
}

function computeScores(data, priorities) {
  const budget = Number(data.budgetDiv);
  const complexity = slotComplexity[data.slot] * (data.objectif === "degats" ? 1.2 : 1);
  const stage = getStageFactor(data.stade);
  const risk = getRiskFactor(data.risque);

  const budgetPower = Math.min(100, 35 + Math.log10(budget + 1) * 28);
  const power = Math.round(Math.max(10, Math.min(100, budgetPower + priorities.length * 4 + stage * 10 - complexity * 8)));
  const riskScore = Math.round(Math.max(5, Math.min(100, 35 + risk * complexity * 22 - (data.mode === "debutant" ? 8 : 0))));
  const costPressure = Math.round(Math.max(5, Math.min(100, 25 + complexity * 22 + risk * 12 + stage * 8 - Math.min(25, budget * 0.5))));

  return { power, riskScore, costPressure };
}

function scoreClass(value) {
  if (value <= 35) return "score-ok";
  if (value <= 65) return "score-mid";
  return "score-bad";
}

function formatTitle(data) {
  return `${data.slot} | ${data.objectif} | ${data.damageType} | ${data.budgetDiv} div`;
}

function planToText(plan) {
  const header = `Plan Craft - ${formatTitle(plan.data)} (${new Date().toLocaleString("fr-FR")})`;
  const priorities = plan.priorities.map((m, i) => `P${i + 1}: ${m}`).join("\n");
  const checklist = plan.checklist.map((c) => `- ${c}`).join("\n");
  const steps = plan.steps.map((s) => `- ${s}`).join("\n");

  return `${header}\n\nChecklist:\n${checklist}\n\nPriorites:\n${priorities}\n\nPlan:\n${steps}`;
}

function renderPlan(plan) {
  const priorities = plan.priorities.map((mod, i) => `<li>P${i + 1} - ${mod}</li>`).join("");
  const checklist = plan.checklist.map((item) => `<li>${item}</li>`).join("");
  const steps = plan.steps.map((step) => `<li>${step}</li>`).join("");

  resultat.innerHTML = `
    <div class="card">
      <p class="tag">${plan.data.mode}</p>
      <p class="tag">${plan.data.slot}</p>
      <p class="tag">${plan.data.objectif}</p>
      <p class="tag">${plan.data.damageType}</p>
      <p><strong>Build:</strong> ${plan.data.build || "non precise"} | <strong>Budget:</strong> ${plan.data.budgetDiv} div | <strong>ilvl:</strong> ${plan.data.ilvl}</p>
      <div class="kpi">
        <span>Puissance: <strong>${plan.scores.power}/100</strong></span>
        <span class="${scoreClass(plan.scores.riskScore)}">Risque: <strong>${plan.scores.riskScore}/100</strong></span>
        <span class="${scoreClass(plan.scores.costPressure)}">Pression cout: <strong>${plan.scores.costPressure}/100</strong></span>
      </div>
    </div>
    <div class="card">
      <h3>Checklist avant craft</h3>
      <ul>${checklist}</ul>
    </div>
    <div class="card">
      <h3>Priorites de mods</h3>
      <ul>${priorities}</ul>
    </div>
    <div class="card">
      <h3>Plan d'action</h3>
      <ul>${steps}</ul>
    </div>
  `;
}

function renderHistory() {
  const entries = readJson(STORAGE_HISTORY);
  if (!entries.length) {
    historique.innerHTML = "<li>Aucun craft enregistre.</li>";
    return;
  }

  historique.innerHTML = entries.map((entry) => `<li><strong>${entry.title}</strong> - ${entry.date}</li>`).join("");
}

function renderFavorites() {
  const entries = readJson(STORAGE_FAVORITES);
  if (!entries.length) {
    favoris.innerHTML = "<li>Aucun favori pour le moment.</li>";
    return;
  }

  favoris.innerHTML = entries.map((entry) => `<li><strong>${entry.title}</strong> - ${entry.date}</li>`).join("");
}

function renderGuide() {
  guideContent.innerHTML = `
    <div class="card">
      <h3>Erreurs frequentes</h3>
      <ul>
        <li>Forcer trop de mods parfaits avec un budget insuffisant.</li>
        <li>Ignorer l'item level minimal des mods cibles.</li>
        <li>Ne pas fixer de stop-loss craft avant de commencer.</li>
        <li>Prioriser uniquement les degats et oublier les defenses.</li>
        <li>Ne pas valider l'item en situation reelle (map/boss).</li>
      </ul>
    </div>
    <div class="card">
      <h3>Routine recommandee</h3>
      <ul>
        <li>1. Definir objectif, budget et niveau de risque.</li>
        <li>2. Verrouiller priorites 1-2.</li>
        <li>3. Evaluer le gain reel en gameplay.</li>
        <li>4. Arreter si le ratio cout/gain devient mauvais.</li>
      </ul>
    </div>
  `;
}

function storeHistory(plan) {
  const entries = [
    { title: formatTitle(plan.data), date: new Date().toLocaleString("fr-FR") },
    ...readJson(STORAGE_HISTORY)
  ].slice(0, 20);

  writeJson(STORAGE_HISTORY, entries);
}

function storeFavorite(plan) {
  const entries = [
    { title: formatTitle(plan.data), date: new Date().toLocaleString("fr-FR") },
    ...readJson(STORAGE_FAVORITES)
  ].slice(0, 20);

  writeJson(STORAGE_FAVORITES, entries);
}

function buildPlan(data) {
  const priorities = pickPriorityMods(data);
  const checklist = buildChecklist(data);
  const steps = buildSteps(data);
  const scores = computeScores(data, priorities);

  return { data, priorities, checklist, steps, scores };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());
  const plan = buildPlan(data);

  latestPlan = plan;
  renderPlan(plan);
  storeHistory(plan);
  renderHistory();
  setFeedback("Plan genere avec succes.");
});

saveFavoriteButton.addEventListener("click", () => {
  if (!latestPlan) {
    setFeedback("Genere d'abord un plan pour l'ajouter aux favoris.");
    return;
  }

  storeFavorite(latestPlan);
  renderFavorites();
  setFeedback("Plan ajoute aux favoris.");
});

copyPlanButton.addEventListener("click", async () => {
  if (!latestPlan) {
    setFeedback("Genere d'abord un plan a copier.");
    return;
  }

  try {
    await navigator.clipboard.writeText(planToText(latestPlan));
    setFeedback("Plan copie dans le presse-papiers.");
  } catch {
    setFeedback("Copie impossible dans ce navigateur.");
  }
});

clearHistoryButton.addEventListener("click", () => {
  writeJson(STORAGE_HISTORY, []);
  renderHistory();
  setFeedback("Historique vide.");
});

clearFavoritesButton.addEventListener("click", () => {
  writeJson(STORAGE_FAVORITES, []);
  renderFavorites();
  setFeedback("Favoris vides.");
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("is-active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));

    button.classList.add("is-active");
    const target = document.getElementById(`view-${button.dataset.tab}`);
    if (target) target.classList.add("is-active");
  });
});

renderHistory();
renderFavorites();
renderGuide();
setFeedback("Pret.");
