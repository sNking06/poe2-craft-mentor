const STORAGE_HISTORY = "poe2_craft_history_v2";
const STORAGE_FAVORITES = "poe2_craft_favorites_v2";

const ECON_SOURCE = {
  provider: "PoE2DB Economy",
  realm: "US",
  date: "2026-02-06",
  url: "https://poe2db.tw/Economy"
};

const SEGMENT_NOTES = {
  Currency: "Base du craft: liquidite forte, reference prix globale.",
  Fragments: "Utile si ton plan repose sur du farm ciblant boss/maps.",
  Ritual: "Peut ouvrir des alternatives low-cost selon l'offre du moment.",
  Essences: "Excellent pour du craft semi-deterministe a budget controle.",
  Breach: "Segment plus volatil, interessant pour opportunites ponctuelles.",
  Delirium: "Souvent rentable pour composants specs et scaling endgame.",
  Expedition: "Bon levier pour acquisition de devises/craft mats.",
  Runes: "Segment niche, verifier volume avant gros investissement.",
  "Soul Cores": "Niche et volatil: garder une taille de position limitee.",
  Idols: "Marche opportuniste, utile surtout en optimisation fine.",
  "Uncut Gems": "Impact direct build power, arbitrage entre craft et achat.",
  Abyss: "Peut fournir des options cout-efficaces selon meta.",
  Gems: "Comparer cout craft vs achat direct est souvent gagnant.",
  Incursion: "Segment situationnel, verifier profondeur du marche."
};

const ECON = {
  "Divine Orb": { chaos: 42.4, trend7d: -2, volume24h: 528762 },
  "Chaos Orb": { chaos: 1, trend7d: 2, volume24h: 22396893 },
  "Exalted Orb": { chaos: 0.12, trend7d: -9, volume24h: 2764512 },
  "Orb of Alchemy": { chaos: 0.1, trend7d: 11, volume24h: 5750684 },
  "Regal Orb": { chaos: 0.1, trend7d: 11, volume24h: 4118094 },
  "Orb of Annulment": { chaos: 1, trend7d: -2, volume24h: 364443 },
  "Vaal Orb": { chaos: 1, trend7d: 6, volume24h: 496723 },
  "Gemcutter's Prism": { chaos: 1, trend7d: -20, volume24h: 1393253 },
  "Artificer's Orb": { chaos: 1, trend7d: 10, volume24h: 654993 },
  "Greater Exalted Orb": { chaos: 1, trend7d: -17, volume24h: 211080 },
  "Greater Regal Orb": { chaos: 1.33, trend7d: 13, volume24h: 469055 },
  "Lesser Jeweller's Orb": { chaos: 0.1, trend7d: -5, volume24h: 2972274 },
  "Greater Jeweller's Orb": { chaos: 0.1, trend7d: -5, volume24h: 2367689 },
  "Perfect Jeweller's Orb": { chaos: 1, trend7d: -15, volume24h: 423728 },
  "Fracturing Orb": { chaos: 34, trend7d: 36, volume24h: 100578 },
  "Mirror of Kalandra": { chaos: 9558, trend7d: 1, volume24h: 327 }
};

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

function buildSteps(data, strategy) {
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

  if (strategy.decision === "FARM") {
    steps.unshift("Etape 0: Monter le budget cible avant craft (farm + achats fractionnes).");
  }
  if (strategy.decision === "WAIT") {
    steps.unshift("Etape 0: Attendre un meilleur timing prix/liquidite avant gros achat.");
  }
  if (strategy.decision === "GO") {
    steps.unshift("Etape 0: Verrouiller les ressources du panier maintenant.");
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

function buildCurrencyBasket(data) {
  const basket = [
    { name: "Chaos Orb", units: 40 },
    { name: "Orb of Annulment", units: 2 },
    { name: "Regal Orb", units: 20 },
    { name: "Exalted Orb", units: 40 },
    { name: "Orb of Alchemy", units: 30 }
  ];

  if (data.objectif === "degats") {
    basket.push({ name: "Vaal Orb", units: 15 });
    basket.push({ name: "Gemcutter's Prism", units: 12 });
  }
  if (data.objectif === "survie") basket.push({ name: "Artificer's Orb", units: 12 });
  if (data.objectif === "mobilite") basket.push({ name: "Greater Regal Orb", units: 6 });
  if (data.risque === "agressif") basket.push({ name: "Fracturing Orb", units: 1 });
  if (data.mode === "debutant") return basket.filter((c) => c.name !== "Fracturing Orb");

  return basket;
}

function buildEconomyInsight(data) {
  const divChaos = ECON["Divine Orb"].chaos;
  const basket = buildCurrencyBasket(data);
  const complexity = slotComplexity[data.slot];
  const stageFactor = getStageFactor(data.stade);

  const adjusted = basket.map((item) => {
    const econ = ECON[item.name];
    const units = Math.max(1, Math.round(item.units * complexity * stageFactor * 0.35));
    const chaosCost = econ ? units * econ.chaos : 0;
    return {
      name: item.name,
      units,
      chaosCost,
      trend7d: econ ? econ.trend7d : 0,
      volume24h: econ ? econ.volume24h : 0
    };
  });

  const totalChaos = adjusted.reduce((sum, item) => sum + item.chaosCost, 0);
  const totalDiv = totalChaos / divChaos;

  const weightedTrend = adjusted.reduce((sum, item) => sum + item.trend7d * (item.chaosCost || 1), 0) / Math.max(1, totalChaos);
  const weightedVolume = adjusted.reduce((sum, item) => sum + item.volume24h, 0) / Math.max(1, adjusted.length);

  const buyNow = adjusted.filter((item) => item.trend7d <= -10).map((item) => item.name);
  const expensiveNow = adjusted.filter((item) => item.trend7d >= 10).map((item) => item.name);
  const lowLiquidity = adjusted.filter((item) => item.volume24h < 150000).map((item) => item.name);

  const budgetDiv = Number(data.budgetDiv);
  const budgetStatus = budgetDiv >= totalDiv ? "ok" : "short";

  return {
    segment: data.segment,
    segmentNote: SEGMENT_NOTES[data.segment],
    source: ECON_SOURCE,
    basket: adjusted,
    totalChaos,
    totalDiv,
    weightedTrend,
    weightedVolume,
    buyNow,
    expensiveNow,
    lowLiquidity,
    budgetStatus
  };
}

function chooseEconomyStrategy(data, economy) {
  const budgetDiv = Number(data.budgetDiv);
  const affordability = budgetDiv / Math.max(0.1, economy.totalDiv);
  const trend = economy.weightedTrend;
  const illiquidCount = economy.lowLiquidity.length;

  let decision = "GO";
  let craftStyle = "Deterministe";
  let notes = "L'economie permet de lancer le craft immediatement.";

  if (affordability < 0.8) {
    decision = "FARM";
    craftStyle = "Low-cost incremental";
    notes = "Ton budget est trop court: farm/achat progressif avant craft complet.";
  } else if (trend > 8 || illiquidCount >= 2) {
    decision = "WAIT";
    craftStyle = "Timing market";
    notes = "Marche tendu: attends un meilleur point d'entree ou craft en petite taille.";
  } else if (affordability >= 1.6 && data.risque === "agressif") {
    decision = "GO";
    craftStyle = "Push high variance";
    notes = "Budget confortable: tu peux tenter une ligne plus agressive.";
  }

  const planBudget = {
    acquisition: Math.max(0, Math.round(budgetDiv * 0.45 * 100) / 100),
    crafting: Math.max(0, Math.round(budgetDiv * 0.4 * 100) / 100),
    reserve: Math.max(0, Math.round(budgetDiv * 0.15 * 100) / 100)
  };

  return {
    decision,
    craftStyle,
    notes,
    affordability,
    planBudget
  };
}

function planToText(plan) {
  const header = `Plan Craft - ${formatTitle(plan.data)} (${new Date().toLocaleString("fr-FR")})`;
  const priorities = plan.priorities.map((m, i) => `P${i + 1}: ${m}`).join("\n");
  const checklist = plan.checklist.map((c) => `- ${c}`).join("\n");
  const steps = plan.steps.map((s) => `- ${s}`).join("\n");
  const eco = `Cout estime: ${plan.economy.totalChaos.toFixed(1)} chaos (${plan.economy.totalDiv.toFixed(2)} div) | Segment: ${plan.economy.segment} | Decision: ${plan.strategy.decision}`;

  return `${header}\n\n${eco}\n\nChecklist:\n${checklist}\n\nPriorites:\n${priorities}\n\nPlan:\n${steps}`;
}

function renderPlan(plan) {
  const priorities = plan.priorities.map((mod, i) => `<li>P${i + 1} - ${mod}</li>`).join("");
  const checklist = plan.checklist.map((item) => `<li>${item}</li>`).join("");
  const steps = plan.steps.map((step) => `<li>${step}</li>`).join("");
  const ecoRows = plan.economy.basket
    .map((item) => `<li>${item.name}: ${item.units}u (~${item.chaosCost.toFixed(1)} chaos, trend 7j ${item.trend7d > 0 ? "+" : ""}${item.trend7d}%)</li>`)
    .join("");

  const budgetChip = plan.economy.budgetStatus === "ok"
    ? `<span class="tag">Budget suffisant</span>`
    : `<span class="tag">Budget insuffisant</span>`;

  const buyNowText = plan.economy.buyNow.length ? plan.economy.buyNow.join(", ") : "Aucun signal fort";
  const expensiveText = plan.economy.expensiveNow.length ? plan.economy.expensiveNow.join(", ") : "Aucun signal fort";
  const liquidityText = plan.economy.lowLiquidity.length ? plan.economy.lowLiquidity.join(", ") : "Liquidite correcte";
  const ratioText = `${plan.strategy.affordability.toFixed(2)}x`;

  resultat.innerHTML = `
    <div class="card">
      <p class="tag">${plan.data.mode}</p>
      <p class="tag">${plan.data.slot}</p>
      <p class="tag">${plan.data.objectif}</p>
      <p class="tag">${plan.data.damageType}</p>
      <p class="tag">${plan.data.segment}</p>
      ${budgetChip}
      <p><strong>Build:</strong> ${plan.data.build || "non precise"} | <strong>Budget:</strong> ${plan.data.budgetDiv} div | <strong>ilvl:</strong> ${plan.data.ilvl}</p>
      <div class="kpi">
        <span>Puissance: <strong>${plan.scores.power}/100</strong></span>
        <span class="${scoreClass(plan.scores.riskScore)}">Risque: <strong>${plan.scores.riskScore}/100</strong></span>
        <span class="${scoreClass(plan.scores.costPressure)}">Pression cout: <strong>${plan.scores.costPressure}/100</strong></span>
      </div>
    </div>
    <div class="card">
      <h3>Decision economie -> craft</h3>
      <p><strong>Decision:</strong> ${plan.strategy.decision} | <strong>Style recommande:</strong> ${plan.strategy.craftStyle}</p>
      <p><strong>Couverture budget / cout:</strong> ${ratioText}</p>
      <p><strong>Allocation budget:</strong> achat matieres ${plan.strategy.planBudget.acquisition} div, craft ${plan.strategy.planBudget.crafting} div, reserve ${plan.strategy.planBudget.reserve} div</p>
      <p>${plan.strategy.notes}</p>
    </div>
    <div class="card">
      <h3>Analyse economie (${plan.economy.source.provider} ${plan.economy.source.realm})</h3>
      <p><strong>Snapshot:</strong> ${plan.economy.source.date} | <a href="${plan.economy.source.url}" target="_blank" rel="noreferrer">source</a></p>
      <p><strong>Segment:</strong> ${plan.economy.segment} - ${plan.economy.segmentNote}</p>
      <p><strong>Cout craft estime:</strong> ${plan.economy.totalChaos.toFixed(1)} chaos (~${plan.economy.totalDiv.toFixed(2)} div)</p>
      <p><strong>Trend panier (7j):</strong> ${plan.economy.weightedTrend > 0 ? "+" : ""}${plan.economy.weightedTrend.toFixed(1)}% | <strong>Volume moyen:</strong> ${Math.round(plan.economy.weightedVolume).toLocaleString("fr-FR")}/24h</p>
      <ul>${ecoRows}</ul>
      <p><strong>Opportunite achat:</strong> ${buyNowText}</p>
      <p><strong>Surveille (prix en hausse):</strong> ${expensiveText}</p>
      <p><strong>Risque liquidite:</strong> ${liquidityText}</p>
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
      <h3>Routine economie + craft</h3>
      <ul>
        <li>1. Choisir le segment marche principal (Currency, Essences, etc.).</li>
        <li>2. Verifier trend 7j et volume avant achat massif.</li>
        <li>3. Construire le panier craft puis comparer au budget div.</li>
        <li>4. Prioriser les devises en baisse et liquides.</li>
      </ul>
    </div>
  `;
}

function storeHistory(plan) {
  const entries = [
    { title: `${formatTitle(plan.data)} | ${plan.economy.totalDiv.toFixed(2)} div`, date: new Date().toLocaleString("fr-FR") },
    ...readJson(STORAGE_HISTORY)
  ].slice(0, 20);

  writeJson(STORAGE_HISTORY, entries);
}

function storeFavorite(plan) {
  const entries = [
    { title: `${formatTitle(plan.data)} | ${plan.economy.totalDiv.toFixed(2)} div`, date: new Date().toLocaleString("fr-FR") },
    ...readJson(STORAGE_FAVORITES)
  ].slice(0, 20);

  writeJson(STORAGE_FAVORITES, entries);
}

function buildPlan(data) {
  const priorities = pickPriorityMods(data);
  const checklist = buildChecklist(data);
  const scores = computeScores(data, priorities);
  const economy = buildEconomyInsight(data);
  const strategy = chooseEconomyStrategy(data, economy);
  const steps = buildSteps(data, strategy);

  return { data, priorities, checklist, steps, scores, economy, strategy };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());
  const plan = buildPlan(data);

  latestPlan = plan;
  renderPlan(plan);
  storeHistory(plan);
  renderHistory();
  setFeedback("Plan genere avec integration economie PoE2DB.");
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
setFeedback("Pret. Source eco: PoE2DB snapshot 2026-02-06.");
