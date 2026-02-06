// =======================
// CONFIGURATION & CONSTANTS
// =======================

const STORAGE_HISTORY = "poe2_craft_history_v2";
const STORAGE_FAVORITES = "poe2_craft_favorites_v2";
const MAX_HISTORY_ITEMS = 20;
const MAX_FAVORITE_ITEMS = 20;

// Score thresholds for visual feedback
const SCORE_LOW = 35;
const SCORE_MEDIUM = 65;

// DOM Elements
const form = document.getElementById("craft-form");
const resultat = document.getElementById("resultat");
const historique = document.getElementById("historique");
const favoris = document.getElementById("favoris");
const guideContent = document.getElementById("guide-content");
const feedback = document.getElementById("feedback");

const saveFavoriteButton = document.getElementById("save-favorite");
const copyPlanButton = document.getElementById("copy-plan");
const exportPlanButton = document.getElementById("export-plan");
const importPlanButton = document.getElementById("import-plan");
const importFileInput = document.getElementById("import-file");
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

/**
 * Display feedback message to user
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'success', 'error', 'info'
 */
function setFeedback(message, type = 'info') {
  feedback.textContent = message;
  feedback.className = 'feedback';
  if (type === 'error') feedback.classList.add('feedback-error');
  if (type === 'success') feedback.classList.add('feedback-success');
}

/**
 * Read JSON data from localStorage with error handling
 * @param {string} key - Storage key
 * @returns {Array} Parsed data or empty array on error
 */
function readJson(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    setFeedback("Erreur de lecture du stockage local", "error");
    return [];
  }
}

/**
 * Write JSON data to localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} value - Data to store
 * @returns {boolean} Success status
 */
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    if (error.name === 'QuotaExceededError') {
      setFeedback("Stockage local plein. Videz l'historique.", "error");
    } else {
      setFeedback("Erreur de sauvegarde", "error");
    }
    return false;
  }
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

/**
 * Compute scores for a craft plan
 *
 * Power Score (0-100): Indicates potential strength of the craft
 * - Higher budget = more power (logarithmic scaling)
 * - More priorities = more power
 * - Higher stage (endgame) = more power
 * - Higher complexity = less power
 *
 * Risk Score (0-100): Indicates chance of failure/bricking
 * - Higher complexity = more risk
 * - More aggressive risk tolerance = more risk
 * - Beginner mode = lower risk (safer recommendations)
 *
 * Cost Pressure (0-100): Indicates budget strain
 * - Higher complexity = more pressure
 * - Higher risk tolerance = more pressure
 * - Higher stage = more pressure
 * - Higher budget = less pressure
 *
 * @param {Object} data - Craft parameters
 * @param {Array} priorities - List of priority mods
 * @returns {Object} {power, riskScore, costPressure}
 */
function computeScores(data, priorities) {
  const budget = Number(data.budgetDiv);
  const complexity = slotComplexity[data.slot] * (data.objectif === "degats" ? 1.2 : 1);
  const stage = getStageFactor(data.stade);
  const risk = getRiskFactor(data.risque);

  // Power: base 35, logarithmic budget scaling, priorities bonus, stage bonus, complexity penalty
  const budgetPower = Math.min(100, 35 + Math.log10(budget + 1) * 28);
  const power = Math.round(
    Math.max(10, Math.min(100,
      budgetPower + priorities.length * 4 + stage * 10 - complexity * 8
    ))
  );

  // Risk: base 35, scaled by complexity and risk tolerance, beginner mode reduction
  const riskScore = Math.round(
    Math.max(5, Math.min(100,
      35 + risk * complexity * 22 - (data.mode === "debutant" ? 8 : 0)
    ))
  );

  // Cost Pressure: base 25, complexity penalty, risk penalty, stage penalty, budget relief (max 25)
  const costPressure = Math.round(
    Math.max(5, Math.min(100,
      25 + complexity * 22 + risk * 12 + stage * 8 - Math.min(25, budget * 0.5)
    ))
  );

  return { power, riskScore, costPressure };
}

/**
 * Get CSS class for score value
 * @param {number} value - Score value (0-100)
 * @returns {string} CSS class name
 */
function scoreClass(value) {
  if (value <= SCORE_LOW) return "score-ok";
  if (value <= SCORE_MEDIUM) return "score-mid";
  return "score-bad";
}

/**
 * Switch to a different tab
 * @param {string} tabName - Tab name to switch to
 */
function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("is-active"));
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));

  const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
  const targetView = document.getElementById(`view-${tabName}`);

  if (tabButton) tabButton.classList.add("is-active");
  if (targetView) targetView.classList.add("is-active");
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

/**
 * Render history list with interactive cards
 */
function renderHistory() {
  const entries = readJson(STORAGE_HISTORY);
  if (!entries.length) {
    historique.innerHTML = '<li class="empty-state">Aucun craft enregistré.</li>';
    return;
  }

  historique.innerHTML = entries.map((entry) => `
    <li class="history-card">
      <div class="history-card-content" onclick='restorePlan(${JSON.stringify(entry.plan).replace(/'/g, "&apos;")})'>
        <strong>${entry.title}</strong>
        <span class="date-label">${entry.date}</span>
      </div>
      <button class="btn-icon btn-delete" onclick='event.stopPropagation(); removeFromHistory("${entry.id}")' title="Supprimer">✕</button>
    </li>
  `).join("");
}

/**
 * Render favorites list with interactive cards
 */
function renderFavorites() {
  const entries = readJson(STORAGE_FAVORITES);
  if (!entries.length) {
    favoris.innerHTML = '<li class="empty-state">Aucun favori pour le moment.</li>';
    return;
  }

  favoris.innerHTML = entries.map((entry) => `
    <li class="history-card">
      <div class="history-card-content" onclick='restorePlan(${JSON.stringify(entry.plan).replace(/'/g, "&apos;")})'>
        <strong>${entry.title}</strong>
        <span class="date-label">${entry.date}</span>
      </div>
      <button class="btn-icon btn-delete" onclick='event.stopPropagation(); removeFromFavorites("${entry.id}")' title="Supprimer">✕</button>
    </li>
  `).join("");
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

/**
 * Generate a unique ID for a plan based on its data
 * @param {Object} data - Plan data
 * @returns {string} Unique identifier
 */
function generatePlanId(data) {
  return `${data.slot}_${data.objectif}_${data.damageType}_${data.budgetDiv}_${data.risque}`;
}

/**
 * Check if a plan is already in favorites
 * @param {Object} plan - Plan to check
 * @returns {boolean} True if plan exists in favorites
 */
function isPlanInFavorites(plan) {
  const favorites = readJson(STORAGE_FAVORITES);
  const planId = generatePlanId(plan.data);
  return favorites.some(fav => fav.id === planId);
}

/**
 * Store plan in history (auto-saves latest plans)
 * @param {Object} plan - Plan to store
 */
function storeHistory(plan) {
  const newEntry = {
    id: generatePlanId(plan.data),
    title: formatTitle(plan.data),
    date: new Date().toLocaleString("fr-FR"),
    plan: plan
  };

  const entries = [newEntry, ...readJson(STORAGE_HISTORY)].slice(0, MAX_HISTORY_ITEMS);
  writeJson(STORAGE_HISTORY, entries);
}

/**
 * Store plan in favorites (prevents duplicates)
 * @param {Object} plan - Plan to store
 * @returns {boolean} Success status
 */
function storeFavorite(plan) {
  const favorites = readJson(STORAGE_FAVORITES);
  const planId = generatePlanId(plan.data);

  // Check for duplicates
  if (favorites.some(fav => fav.id === planId)) {
    setFeedback("Ce plan est déjà dans les favoris", "info");
    return false;
  }

  const newEntry = {
    id: planId,
    title: formatTitle(plan.data),
    date: new Date().toLocaleString("fr-FR"),
    plan: plan
  };

  const entries = [newEntry, ...favorites].slice(0, MAX_FAVORITE_ITEMS);
  const success = writeJson(STORAGE_FAVORITES, entries);

  if (success) {
    setFeedback("Plan ajouté aux favoris", "success");
    return true;
  }
  return false;
}

/**
 * Remove a single item from history
 * @param {string} id - Item ID to remove
 */
function removeFromHistory(id) {
  const entries = readJson(STORAGE_HISTORY).filter(entry => entry.id !== id);
  writeJson(STORAGE_HISTORY, entries);
  renderHistory();
  setFeedback("Item supprimé de l'historique", "success");
}

/**
 * Remove a single item from favorites
 * @param {string} id - Item ID to remove
 */
function removeFromFavorites(id) {
  const entries = readJson(STORAGE_FAVORITES).filter(entry => entry.id !== id);
  writeJson(STORAGE_FAVORITES, entries);
  renderFavorites();
  setFeedback("Item supprimé des favoris", "success");
}

/**
 * Restore a plan from history or favorites
 * @param {Object} plan - Plan to restore
 */
function restorePlan(plan) {
  latestPlan = plan;
  renderPlan(plan);

  // Populate form with plan data
  Object.entries(plan.data).forEach(([key, value]) => {
    const input = form.elements[key];
    if (input) input.value = value;
  });

  // Switch to assistant tab
  switchTab('assistant');
  setFeedback("Plan restauré", "success");
}

function buildPlan(data) {
  const priorities = pickPriorityMods(data);
  const checklist = buildChecklist(data);
  const steps = buildSteps(data);
  const scores = computeScores(data, priorities);

  return { data, priorities, checklist, steps, scores };
}

/**
 * Validate form data
 * @param {Object} data - Form data to validate
 * @returns {Object} Validation result {valid: boolean, errors: string[]}
 */
function validateFormData(data) {
  const errors = [];

  const budget = Number(data.budgetDiv);
  if (isNaN(budget) || budget < 0) {
    errors.push("Budget invalide (doit être >= 0)");
  }
  if (budget > 1000) {
    errors.push("Budget trop élevé (max 1000 divines)");
  }

  const ilvl = Number(data.ilvl);
  if (isNaN(ilvl) || ilvl < 1 || ilvl > 100) {
    errors.push("Item level invalide (doit être entre 1 et 100)");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());

  // Validate form data
  const validation = validateFormData(data);
  if (!validation.valid) {
    setFeedback(validation.errors.join(". "), "error");
    return;
  }

  const plan = buildPlan(data);

  latestPlan = plan;
  renderPlan(plan);
  storeHistory(plan);
  renderHistory();
  updateSaveFavoriteButton();
  setFeedback("Plan généré avec succès", "success");
});

saveFavoriteButton.addEventListener("click", () => {
  if (!latestPlan) {
    setFeedback("Génère d'abord un plan pour l'ajouter aux favoris.", "info");
    return;
  }

  if (isPlanInFavorites(latestPlan)) {
    setFeedback("Ce plan est déjà dans les favoris", "info");
    return;
  }

  const success = storeFavorite(latestPlan);
  if (success) {
    renderFavorites();
    updateSaveFavoriteButton();
  }
});

copyPlanButton.addEventListener("click", async () => {
  if (!latestPlan) {
    setFeedback("Génère d'abord un plan à copier.", "info");
    return;
  }

  try {
    await navigator.clipboard.writeText(planToText(latestPlan));
    setFeedback("Plan copié dans le presse-papiers", "success");
  } catch {
    setFeedback("Copie impossible dans ce navigateur", "error");
  }
});

/**
 * Export current plan as JSON file
 */
exportPlanButton.addEventListener("click", () => {
  if (!latestPlan) {
    setFeedback("Génère d'abord un plan à exporter", "info");
    return;
  }

  try {
    const dataStr = JSON.stringify(latestPlan, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `poe2-craft-${formatTitle(latestPlan.data).replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    setFeedback("Plan exporté avec succès", "success");
  } catch (error) {
    console.error("Export error:", error);
    setFeedback("Erreur lors de l'export", "error");
  }
});

/**
 * Import plan from JSON file
 */
importPlanButton.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedPlan = JSON.parse(e.target.result);

      // Validate imported plan structure
      if (!importedPlan.data || !importedPlan.priorities || !importedPlan.checklist) {
        setFeedback("Fichier JSON invalide", "error");
        return;
      }

      latestPlan = importedPlan;
      renderPlan(importedPlan);

      // Populate form
      Object.entries(importedPlan.data).forEach(([key, value]) => {
        const input = form.elements[key];
        if (input) input.value = value;
      });

      updateSaveFavoriteButton();
      setFeedback("Plan importé avec succès", "success");
    } catch (error) {
      console.error("Import error:", error);
      setFeedback("Erreur lors de l'import du fichier", "error");
    }
  };

  reader.readAsText(file);
  // Reset input to allow re-importing the same file
  event.target.value = '';
});

/**
 * Update save favorite button visual state
 */
function updateSaveFavoriteButton() {
  if (!latestPlan) {
    saveFavoriteButton.textContent = "Ajouter aux favoris";
    saveFavoriteButton.disabled = false;
    return;
  }

  if (isPlanInFavorites(latestPlan)) {
    saveFavoriteButton.textContent = "✓ Déjà en favoris";
    saveFavoriteButton.disabled = true;
  } else {
    saveFavoriteButton.textContent = "Ajouter aux favoris";
    saveFavoriteButton.disabled = false;
  }
}

clearHistoryButton.addEventListener("click", () => {
  if (!confirm("Vider tout l'historique ? Cette action est irréversible.")) {
    return;
  }

  writeJson(STORAGE_HISTORY, []);
  renderHistory();
  setFeedback("Historique vidé", "success");
});

clearFavoritesButton.addEventListener("click", () => {
  if (!confirm("Vider tous les favoris ? Cette action est irréversible.")) {
    return;
  }

  writeJson(STORAGE_FAVORITES, []);
  renderFavorites();
  setFeedback("Favoris vidés", "success");
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
