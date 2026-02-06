const STORAGE_HISTORY = "poe2_reco_history_v1";
const STORAGE_FAVORITES = "poe2_reco_favorites_v1";
const ECONOMY_PATH = "./data/economy.json";

const form = document.getElementById("craft-form");
const submitButton = document.getElementById("submit-button");
const resultat = document.getElementById("resultat");
const historique = document.getElementById("historique");
const favoris = document.getElementById("favoris");
const guideContent = document.getElementById("guide-content");
const feedback = document.getElementById("feedback");
const dataStatus = document.getElementById("data-status");

const saveFavoriteButton = document.getElementById("save-favorite");
const copyPlanButton = document.getElementById("copy-plan");
const clearHistoryButton = document.getElementById("clear-history");
const clearFavoritesButton = document.getElementById("clear-favorites");

let latestRecommendation = null;
let economy = null;

const SLOT_MULTIPLIER = {
  arme: 1.15,
  casque: 1.0,
  armure: 1.1,
  gants: 0.95,
  bottes: 0.95,
  ceinture: 0.9,
  anneau: 1.05,
  amulette: 1.1
};

const METHOD_PROFILES = {
  essence: {
    key: "essence",
    label: "Essence craft",
    shortWhy: "Tres bon pour sortir rapidement des lignes utiles et stables.",
    fitTags: ["defense", "resist", "speed", "damage"],
    riskFit: { safe: 92, equilibre: 80, agressif: 62 },
    baseCurrencies: [
      { name: "Essence of the Body", units: 8, reason: "Bonne base pour des prefixes defensifs." },
      { name: "Essence of Flames", units: 6, reason: "Permet de pousser des lignes offense elementaires." },
      { name: "Regal Orb", units: 12, reason: "Stabilise les etapes intermediaires." },
      { name: "Chaos Orb", units: 36, reason: "Reroll flexible a cout maitrise." }
    ]
  },
  annul_exalt: {
    key: "annul_exalt",
    label: "Annul / Exalt",
    shortWhy: "Approche haut de gamme pour viser des lignes precises.",
    fitTags: ["crit", "damage", "spell", "minion"],
    riskFit: { safe: 48, equilibre: 82, agressif: 93 },
    baseCurrencies: [
      { name: "Orb of Annulment", units: 8, reason: "Retire une ligne pour nettoyer l'item." },
      { name: "Exalted Orb", units: 42, reason: "Ajoute des lignes sur une base deja preparee." },
      { name: "Regal Orb", units: 16, reason: "Passage magic -> rare dans le plan." },
      { name: "Divine Orb", units: 2, reason: "Finalise les valeurs de lignes importantes." }
    ]
  },
  chaos_spam: {
    key: "chaos_spam",
    label: "Chaos spam",
    shortWhy: "Simple a executer, utile pour obtenir une base jouable vite.",
    fitTags: ["damage", "resist", "defense"],
    riskFit: { safe: 70, equilibre: 78, agressif: 65 },
    baseCurrencies: [
      { name: "Chaos Orb", units: 140, reason: "Source principale de reroll." },
      { name: "Regal Orb", units: 6, reason: "Verrouille une base acceptable." },
      { name: "Orb of Alchemy", units: 24, reason: "Option economique de transition." }
    ]
  },
  vaal_finish: {
    key: "vaal_finish",
    label: "Vaal finish",
    shortWhy: "Finition agressive quand la base est deja forte.",
    fitTags: ["damage", "crit", "corruption"],
    riskFit: { safe: 28, equilibre: 64, agressif: 90 },
    baseCurrencies: [
      { name: "Vaal Orb", units: 40, reason: "Corruption finale pour push l'item." },
      { name: "Gemcutter's Prism", units: 14, reason: "Soutient les lignes liees aux gems." },
      { name: "Chaos Orb", units: 26, reason: "Ajustements avant corruption." }
    ]
  },
  fracture_setup: {
    key: "fracture_setup",
    label: "Fracture setup",
    shortWhy: "Meilleure option pour verrouiller une ligne premium.",
    fitTags: ["crit", "damage", "spell", "minion", "fracture"],
    riskFit: { safe: 20, equilibre: 61, agressif: 95 },
    baseCurrencies: [
      { name: "Fracturing Orb", units: 1, reason: "Verrouille une ligne clef pour le craft." },
      { name: "Orb of Annulment", units: 10, reason: "Nettoie avant tentative de fracture." },
      { name: "Exalted Orb", units: 38, reason: "Remplit les trous apres verrouillage." },
      { name: "Divine Orb", units: 2, reason: "Optimise la ligne fracturee." }
    ]
  },
  budget_progressif: {
    key: "budget_progressif",
    label: "Budget progressif",
    shortWhy: "Approche recommandee quand le budget est limite.",
    fitTags: ["defense", "resist", "speed", "budget"],
    riskFit: { safe: 95, equilibre: 84, agressif: 50 },
    baseCurrencies: [
      { name: "Chaos Orb", units: 52, reason: "Budget principal pour reroll." },
      { name: "Orb of Alchemy", units: 64, reason: "Conversion economique des bases." },
      { name: "Regal Orb", units: 8, reason: "Verrouille une base jouable." },
      { name: "Lesser Jeweller's Orb", units: 44, reason: "Ajuste les sockets a faible cout." }
    ]
  }
};

const TAG_KEYWORDS = {
  damage: ["damage", "degat", "dps", "attack", "caster", "spell", "ele", "element", "phys", "chaos"],
  defense: ["life", "vie", "armour", "armor", "evasion", "es", "energy shield", "tank", "defense"],
  resist: ["res", "resist", "resistance", "all res", "cap res"],
  speed: ["speed", "movement", "ms", "cast speed", "attack speed"],
  crit: ["crit", "critical", "multi", "crit chance", "crit multi"],
  minion: ["minion", "summon", "spectre", "zombie"],
  spell: ["spell", "cast", "gem level", "+level"],
  fracture: ["fracture", "fracturing", "locked line", "line lock"],
  corruption: ["corrupt", "corruption", "vaal"],
  budget: ["cheap", "low cost", "pas cher", "budget"]
};

const METHOD_HINTS = [
  { method: "fracture_setup", regex: /(fracture|fracturing|line lock|locked line)/ },
  { method: "vaal_finish", regex: /(vaal|corrupt|corruption)/ },
  { method: "annul_exalt", regex: /(annul|exalt|prefix|suffix|meta craft)/ },
  { method: "chaos_spam", regex: /(chaos spam|reroll|spam)/ },
  { method: "budget_progressif", regex: /(pas cher|budget|low cost|cheap)/ }
];

const FALLBACK_ECONOMY = {
  source: { provider: "fallback", page: "local", realm: "US" },
  fetchedAt: null,
  divineReference: "divine",
  rates: {
    chaos: 1,
    divine: 43,
    exalted: 0.12,
    annul: 6,
    vaal: 0.2,
    alch: 0.1,
    regal: 0.00055,
    gcp: 0.9,
    "fracturing-orb": 1500,
    "lesser-jewellers-orb": 0.00038
  },
  segments: [
    {
      id: "Currency",
      rows: [
        { name: "Chaos Orb", slug: "chaos", trend7dPct: 0, volume24h: 1000000, chaosValue: 1 },
        { name: "Divine Orb", slug: "divine", trend7dPct: 0, volume24h: 600000, chaosValue: 43 },
        { name: "Exalted Orb", slug: "exalted", trend7dPct: -5, volume24h: 500000, chaosValue: 0.12 },
        { name: "Orb of Annulment", slug: "annul", trend7dPct: 3, volume24h: 120000, chaosValue: 6 },
        { name: "Vaal Orb", slug: "vaal", trend7dPct: 2, volume24h: 170000, chaosValue: 0.2 },
        { name: "Orb of Alchemy", slug: "alch", trend7dPct: 1, volume24h: 800000, chaosValue: 0.1 },
        { name: "Regal Orb", slug: "regal", trend7dPct: 4, volume24h: 350000, chaosValue: 0.00055 },
        { name: "Gemcutter's Prism", slug: "gcp", trend7dPct: -3, volume24h: 210000, chaosValue: 0.9 },
        { name: "Fracturing Orb", slug: "fracturing-orb", trend7dPct: 22, volume24h: 25000, chaosValue: 1500 },
        { name: "Lesser Jeweller's Orb", slug: "lesser-jewellers-orb", trend7dPct: -6, volume24h: 300000, chaosValue: 0.00038 }
      ]
    },
    {
      id: "Essences",
      rows: [
        { name: "Essence of the Body", slug: "essence-of-the-body", trend7dPct: -4, volume24h: 12000, chaosValue: 0.4 },
        { name: "Essence of Flames", slug: "essence-of-flames", trend7dPct: 6, volume24h: 12000, chaosValue: 22 }
      ]
    }
  ]
};

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.className = isError ? "feedback feedback-error" : "feedback feedback-success";
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

function toNumber(value, fallback = 0) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildEconomyIndex(raw) {
  const rows = (raw.segments || []).flatMap((segment) => segment.rows || []);
  const byName = new Map();
  const bySlug = new Map();

  for (const row of rows) {
    if (!row || !row.name || !row.slug) continue;
    const key = normalizeText(row.name);
    if (!byName.has(key)) byName.set(key, row);
    bySlug.set(String(row.slug).toLowerCase(), row);
  }

  const divineRef = String(raw.divineReference || "divine").toLowerCase();
  const divineChaos = raw.rates && raw.rates[divineRef] ? raw.rates[divineRef] : (bySlug.get(divineRef)?.chaosValue || 43);

  return {
    source: raw.source || { provider: "unknown", page: "", realm: "US" },
    fetchedAt: raw.fetchedAt || null,
    rates: raw.rates || {},
    byName,
    bySlug,
    divineChaos,
    rowCount: rows.length
  };
}

function getEconomyRowByName(name) {
  if (!economy) return null;
  return economy.byName.get(normalizeText(name)) || null;
}

function getChaosValueForCurrency(name) {
  const row = getEconomyRowByName(name);
  if (row && Number.isFinite(row.chaosValue) && row.chaosValue > 0) {
    return row.chaosValue;
  }

  const slug = row ? String(row.slug).toLowerCase() : "";
  if (slug && economy?.rates?.[slug]) return economy.rates[slug];

  return null;
}

function parseDesiredLines(rawText) {
  return String(rawText || "")
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function inferIntent(desiredLinesText) {
  const normalized = normalizeText(desiredLinesText);
  const lines = parseDesiredLines(desiredLinesText);
  const tags = new Set();

  for (const [tag, words] of Object.entries(TAG_KEYWORDS)) {
    if (words.some((word) => normalized.includes(word))) {
      tags.add(tag);
    }
  }

  let forcedMethod = null;
  for (const hint of METHOD_HINTS) {
    if (hint.regex.test(normalized)) {
      forcedMethod = hint.method;
      break;
    }
  }

  const complexity = Math.max(1, Math.min(3, lines.length + Math.floor(tags.size / 3)));

  return {
    lines,
    tags,
    forcedMethod,
    complexity
  };
}

function tagFitScore(profile, intent) {
  const fitSet = new Set(profile.fitTags);
  let hits = 0;
  intent.tags.forEach((tag) => {
    if (fitSet.has(tag)) hits += 1;
  });

  const base = 35;
  const ratio = profile.fitTags.length ? hits / profile.fitTags.length : 0;
  let score = base + ratio * 65;

  if (intent.forcedMethod && intent.forcedMethod === profile.key) {
    score += 25;
  }

  return Math.min(100, score);
}

function riskFitScore(profile, risk) {
  return profile.riskFit[risk] ?? 70;
}

function scoreCurrency(currency, methodProfile, intent) {
  let score = 55;

  if (currency.trend7dPct <= -10) score += 15;
  else if (currency.trend7dPct <= 0) score += 9;
  else if (currency.trend7dPct >= 15) score -= 12;
  else if (currency.trend7dPct >= 8) score -= 7;

  if (currency.volume24h >= 500000) score += 12;
  else if (currency.volume24h >= 100000) score += 8;
  else if (currency.volume24h < 20000) score -= 10;

  if (intent.tags.has("budget") && currency.chaosValue > 50) score -= 10;
  if (methodProfile.key === "fracture_setup" && currency.name === "Fracturing Orb") score += 14;
  if (methodProfile.key === "essence" && currency.name.startsWith("Essence")) score += 10;

  return Math.max(1, Math.min(99, Math.round(score)));
}

function buildCurrencyPlan(methodProfile, intent, formData) {
  const slotMult = SLOT_MULTIPLIER[formData.slot] || 1;
  const result = [];

  for (const item of methodProfile.baseCurrencies) {
    const row = getEconomyRowByName(item.name);
    const chaosValue = getChaosValueForCurrency(item.name);
    if (!chaosValue) continue;

    const trend = row?.trend7dPct ?? 0;
    const volume = row?.volume24h ?? 0;

    const units = Math.max(1, Math.round(item.units * intent.complexity * slotMult));
    const totalChaos = units * chaosValue;
    const totalDiv = totalChaos / economy.divineChaos;

    const scored = {
      name: item.name,
      units,
      chaosValue,
      totalChaos,
      totalDiv,
      trend7dPct: trend,
      volume24h: volume,
      reason: item.reason,
      score: 0
    };

    scored.score = scoreCurrency(scored, methodProfile, intent);
    result.push(scored);
  }

  return result.sort((a, b) => b.score - a.score);
}

function budgetFitScore(budgetDiv, estimatedDiv) {
  const safeEstimated = Math.max(0.1, estimatedDiv);
  const ratio = budgetDiv / safeEstimated;

  if (ratio >= 1) {
    return Math.min(100, 85 + (ratio - 1) * 20);
  }

  return Math.max(5, ratio * 85);
}

function economyHealthScore(currencies) {
  if (!currencies.length) return 0;
  return currencies.reduce((sum, row) => sum + row.score, 0) / currencies.length;
}

function evaluateMethod(profile, intent, formData) {
  const currencies = buildCurrencyPlan(profile, intent, formData);
  const estimatedChaos = currencies.reduce((sum, row) => sum + row.totalChaos, 0);
  const estimatedDiv = estimatedChaos / economy.divineChaos;
  const budgetDiv = toNumber(formData.budgetDiv, 0);

  const tagScore = tagFitScore(profile, intent);
  const riskScore = riskFitScore(profile, formData.risque);
  const budgetScore = budgetFitScore(budgetDiv, estimatedDiv);
  const ecoScore = economyHealthScore(currencies);

  const methodScore = Math.round(tagScore * 0.4 + budgetScore * 0.35 + riskScore * 0.15 + ecoScore * 0.1);

  return {
    profile,
    methodScore,
    tagScore,
    riskScore,
    budgetScore,
    ecoScore,
    estimatedChaos,
    estimatedDiv,
    budgetRatio: budgetDiv / Math.max(0.1, estimatedDiv),
    currencies
  };
}

function buildPlanSteps(bestEval, intent) {
  const linesText = intent.lines.length ? intent.lines.join(", ") : "tes lignes";
  const method = bestEval.profile.label;

  return [
    `1. Prepare une base propre pour ${linesText}.`,
    `2. Lance la methode ${method}.`,
    `3. Priorise les 2 premieres currencies conseillees avant le reste.`,
    "4. Arrete les tentatives si tu depasses ton budget reserve.",
    "5. Finalise les rolls uniquement si l'item est deja jouable."
  ];
}

function buildRecommendation(formData) {
  const intent = inferIntent(formData.desiredLines);
  const evaluations = Object.values(METHOD_PROFILES).map((profile) => evaluateMethod(profile, intent, formData));
  evaluations.sort((a, b) => b.methodScore - a.methodScore);

  const best = evaluations[0];
  const alternative = evaluations[1] || null;

  return {
    formData,
    intent,
    best,
    alternative,
    steps: buildPlanSteps(best, intent)
  };
}

function recommendationTitle(reco) {
  return `${reco.best.profile.label} | ${toNumber(reco.formData.budgetDiv).toFixed(1)} div | ${reco.formData.slot}`;
}

function toTrendLabel(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)}%`;
}

function renderRecommendation(reco) {
  const lines = reco.intent.lines.length ? reco.intent.lines : [reco.formData.desiredLines.trim()];
  const lineList = lines.map((line) => `<li>${line}</li>`).join("");

  const bestCurrencies = reco.best.currencies.slice(0, 5);
  const currencyList = bestCurrencies.length
    ? bestCurrencies
        .map((currency, index) => {
          const trendClass = currency.trend7dPct <= 0 ? "score-ok" : "score-mid";
          return `<li>#${index + 1} <strong>${currency.name}</strong> - ${currency.units}u (~${currency.totalDiv.toFixed(2)} div / ${currency.totalChaos.toFixed(1)} chaos) - <span class="${trendClass}">trend ${toTrendLabel(currency.trend7dPct)}</span> - ${currency.reason}</li>`;
        })
        .join("")
    : "<li>Pas assez de data economie pour cette methode.</li>";

  const stepsList = reco.steps.map((step) => `<li>${step}</li>`).join("");
  const budgetState = reco.best.budgetRatio >= 1 ? "Budget compatible" : "Budget trop court";

  const altBlock = reco.alternative
    ? `<p><strong>Alternative:</strong> ${reco.alternative.profile.label} (score ${reco.alternative.methodScore}/100, cout ~${reco.alternative.estimatedDiv.toFixed(2)} div)</p>`
    : "";

  resultat.innerHTML = `
    <div class="card">
      <p class="tag">Methode recommandee</p>
      <h3>${reco.best.profile.label}</h3>
      <p>${reco.best.profile.shortWhy}</p>
      <div class="kpi">
        <span>Score global: <strong>${reco.best.methodScore}/100</strong></span>
        <span>${budgetState}</span>
        <span>Cout estime: <strong>${reco.best.estimatedDiv.toFixed(2)} div</strong></span>
      </div>
      ${altBlock}
    </div>

    <div class="card">
      <h3>Lignes demandees</h3>
      <ul>${lineList}</ul>
    </div>

    <div class="card">
      <h3>Currencies a utiliser (ordre)</h3>
      <ul>${currencyList}</ul>
    </div>

    <div class="card">
      <h3>Plan simple</h3>
      <ul>${stepsList}</ul>
    </div>
  `;
}

function recommendationToText(reco) {
  const lines = reco.intent.lines.length ? reco.intent.lines.join(", ") : reco.formData.desiredLines;
  const currencies = reco.best.currencies
    .slice(0, 5)
    .map((currency, i) => `${i + 1}. ${currency.name} - ${currency.units}u (~${currency.totalDiv.toFixed(2)} div) - trend ${toTrendLabel(currency.trend7dPct)}`)
    .join("\n");

  return [
    `Objectif: ${lines}`,
    `Methode: ${reco.best.profile.label}`,
    `Score: ${reco.best.methodScore}/100`,
    `Cout estime: ${reco.best.estimatedDiv.toFixed(2)} div (${reco.best.estimatedChaos.toFixed(1)} chaos)`,
    "",
    "Currencies recommandees:",
    currencies
  ].join("\n");
}

function renderHistory() {
  const entries = readJson(STORAGE_HISTORY);
  if (!entries.length) {
    historique.innerHTML = "<li class='empty-state'>Aucune recommandation enregistree.</li>";
    return;
  }

  historique.innerHTML = entries
    .map((entry) => `<li><strong>${entry.title}</strong><br><span class='date-label'>${entry.date}</span></li>`)
    .join("");
}

function renderFavorites() {
  const entries = readJson(STORAGE_FAVORITES);
  if (!entries.length) {
    favoris.innerHTML = "<li class='empty-state'>Aucun favori.</li>";
    return;
  }

  favoris.innerHTML = entries
    .map((entry) => `<li><strong>${entry.title}</strong><br><span class='date-label'>${entry.date}</span></li>`)
    .join("");
}

function renderGuide() {
  guideContent.innerHTML = `
    <div class="card">
      <h3>Comment utiliser l'assistant</h3>
      <ul>
        <li>1. Ecris simplement la ligne que tu veux obtenir.</li>
        <li>2. Indique ton budget.</li>
        <li>3. Laisse l'app choisir la methode et les currencies.</li>
      </ul>
    </div>
    <div class="card">
      <h3>Exemples de saisie</h3>
      <ul>
        <li>"+life, +all resist"</li>
        <li>"crit chance + crit multi"</li>
        <li>"+2 minion level"</li>
        <li>"movement speed + resist"</li>
      </ul>
    </div>
  `;
}

function storeHistory(reco) {
  const entries = [
    {
      title: recommendationTitle(reco),
      date: new Date().toLocaleString("fr-FR")
    },
    ...readJson(STORAGE_HISTORY)
  ].slice(0, 20);

  writeJson(STORAGE_HISTORY, entries);
}

function storeFavorite(reco) {
  const entries = [
    {
      title: recommendationTitle(reco),
      date: new Date().toLocaleString("fr-FR")
    },
    ...readJson(STORAGE_FAVORITES)
  ].slice(0, 20);

  writeJson(STORAGE_FAVORITES, entries);
}

async function loadEconomyData() {
  try {
    const response = await fetch(ECONOMY_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    economy = buildEconomyIndex(payload);

    const dateLabel = payload.fetchedAt ? new Date(payload.fetchedAt).toLocaleString("fr-FR") : "n/a";
    dataStatus.textContent = `Data economie OK - ${economy.rowCount} lignes - maj ${dateLabel}`;
    dataStatus.className = "feedback feedback-success";
  } catch (error) {
    economy = buildEconomyIndex(FALLBACK_ECONOMY);
    dataStatus.textContent = "PoE2DB indisponible: fallback local actif.";
    dataStatus.className = "feedback feedback-error";
    console.error(error);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = Object.fromEntries(new FormData(form).entries());
  const desired = String(formData.desiredLines || "").trim();
  if (!desired) {
    setFeedback("Ecris d'abord la ligne de craft souhaitee.", true);
    return;
  }

  if (!economy) {
    setFeedback("Les donnees economie ne sont pas encore chargees.", true);
    return;
  }

  const reco = buildRecommendation(formData);
  latestRecommendation = reco;

  renderRecommendation(reco);
  storeHistory(reco);
  renderHistory();
  setFeedback("Conseil genere: methode + currencies pretes.");
});

saveFavoriteButton.addEventListener("click", () => {
  if (!latestRecommendation) {
    setFeedback("Genere d'abord un conseil.", true);
    return;
  }

  storeFavorite(latestRecommendation);
  renderFavorites();
  setFeedback("Ajoute aux favoris.");
});

copyPlanButton.addEventListener("click", async () => {
  if (!latestRecommendation) {
    setFeedback("Genere d'abord un conseil a copier.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(recommendationToText(latestRecommendation));
    setFeedback("Conseil copie dans le presse-papiers.");
  } catch {
    setFeedback("Copie impossible dans ce navigateur.", true);
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

async function bootstrap() {
  submitButton.disabled = true;
  await loadEconomyData();
  submitButton.disabled = false;
  renderHistory();
  renderFavorites();
  renderGuide();
  setFeedback("Pret. Decris ta ligne de craft.");
}

bootstrap();
