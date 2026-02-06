/**
 * POE2 Craft Mentor - Unit Tests
 * Simple test suite for business logic (no framework required)
 */

// Mock data structures from app.js
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

// Core functions to test
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

function generatePlanId(data) {
  return `${data.slot}_${data.objectif}_${data.damageType}_${data.budgetDiv}_${data.risque}`;
}

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

// Test framework
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`✗ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    testsPassed++;
    console.log(`✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`✗ ${message}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual: ${JSON.stringify(actual)}`);
  }
}

// Test Suite
console.log("=== POE2 Craft Mentor - Unit Tests ===\n");

// Test: getRiskFactor
console.log("--- getRiskFactor ---");
assertEqual(getRiskFactor("safe"), 0.7, "Safe risk returns 0.7");
assertEqual(getRiskFactor("equilibre"), 1, "Equilibre risk returns 1");
assertEqual(getRiskFactor("agressif"), 1.3, "Agressif risk returns 1.3");

// Test: getStageFactor
console.log("\n--- getStageFactor ---");
assertEqual(getStageFactor("leveling"), 0.7, "Leveling stage returns 0.7");
assertEqual(getStageFactor("midgame"), 1, "Midgame stage returns 1");
assertEqual(getStageFactor("endgame"), 1.2, "Endgame stage returns 1.2");

// Test: pickPriorityMods
console.log("\n--- pickPriorityMods ---");
const physicalMods = pickPriorityMods({ slot: "arme", objectif: "degats", damageType: "physique" });
assert(Array.isArray(physicalMods), "Returns array for damage objective");
assert(physicalMods.length === 5, "Returns 5 priority mods for damage");
assertEqual(physicalMods[0], "% Physical Damage", "First mod is % Physical Damage for physical damage");

const resistMods = pickPriorityMods({ slot: "armure", objectif: "resistances", damageType: "feu" });
assertEqual(resistMods[0], "All Resistances", "Resistance objective returns resistance mods");

const defensiveMods = pickPriorityMods({ slot: "casque", objectif: "survie", damageType: "feu" });
assertEqual(defensiveMods, slotDefensiveMods["casque"], "Survie objective returns defensive mods for slot");

// Test: generatePlanId
console.log("\n--- generatePlanId ---");
const testData1 = { slot: "arme", objectif: "degats", damageType: "physique", budgetDiv: 10, risque: "safe" };
const id1 = generatePlanId(testData1);
assertEqual(id1, "arme_degats_physique_10_safe", "Generates correct plan ID");

const testData2 = { slot: "arme", objectif: "degats", damageType: "physique", budgetDiv: 10, risque: "safe" };
const id2 = generatePlanId(testData2);
assert(id1 === id2, "Same data generates same ID");

const testData3 = { slot: "arme", objectif: "degats", damageType: "physique", budgetDiv: 20, risque: "safe" };
const id3 = generatePlanId(testData3);
assert(id1 !== id3, "Different data generates different ID");

// Test: validateFormData
console.log("\n--- validateFormData ---");
const validData = { budgetDiv: 10, ilvl: 75 };
const validation1 = validateFormData(validData);
assert(validation1.valid === true, "Valid data passes validation");
assert(validation1.errors.length === 0, "Valid data has no errors");

const invalidBudget = { budgetDiv: -5, ilvl: 75 };
const validation2 = validateFormData(invalidBudget);
assert(validation2.valid === false, "Negative budget fails validation");
assert(validation2.errors.length > 0, "Invalid budget produces errors");

const invalidIlvl = { budgetDiv: 10, ilvl: 150 };
const validation3 = validateFormData(invalidIlvl);
assert(validation3.valid === false, "Invalid ilvl fails validation");

const tooBigBudget = { budgetDiv: 2000, ilvl: 75 };
const validation4 = validateFormData(tooBigBudget);
assert(validation4.valid === false, "Budget > 1000 fails validation");

// Summary
console.log("\n=== Test Summary ===");
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log("\n✓ All tests passed!");
} else {
  console.error(`\n✗ ${testsFailed} test(s) failed`);
  process?.exit?.(1); // Exit with error code if in Node.js
}
