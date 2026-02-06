#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const SOURCE_ROOT = "https://poe2db.tw";
const SOURCE_PAGE = `${SOURCE_ROOT}/Economy`;
const SEGMENTS = [
  "Currency",
  "Fragments",
  "Ritual",
  "Essences",
  "Breach",
  "Delirium",
  "Expedition",
  "Runes",
  "Soul_Cores",
  "Idols",
  "Uncut_Gems",
  "Abyss",
  "Gems",
  "Incursion"
];

const OUTPUT_FILE = path.join(__dirname, "..", "frontend", "data", "economy.json");

function parseNumeric(text) {
  if (!text) return null;
  const normalized = String(text).replace(/,/g, "").trim();
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function decodeHtml(text) {
  return String(text)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(text) {
  return decodeHtml(String(text).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function toLabel(segmentId) {
  return segmentId.replace(/_/g, " ");
}

function extractRows(html, segmentId) {
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return [];

  const tbody = tbodyMatch[1];
  const rows = [];
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let rowMatch = rowRegex.exec(tbody);

  while (rowMatch) {
    const rowHtml = rowMatch[1];
    const tdMatches = [...rowHtml.matchAll(/<td>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (tdMatches.length >= 4) {
      const [tdName, tdValue, tdTrend, tdVolume] = tdMatches;

      const primaryLink = tdName.match(/<a href="Economy_([^"]+)">([\s\S]*?)<\/a>/i);
      if (primaryLink) {
        const slug = primaryLink[1].toLowerCase();
        const name = stripTags(primaryLink[2]);
        const wikiMatch = tdName.match(/<a href="([^"]+)" class="border p-1">Wiki<\/a>/i);

        const valueMatch = tdValue.match(
          /([0-9][0-9.,]*)\s*<a href="Economy_([^"]+)".*?fa-left-right[^>]*><\/i>\s*([0-9][0-9.,]*)\s*<a href="Economy_([^"]+)"/is
        );

        const trendMatch = tdTrend.match(/([+-]?\d+(?:\.\d+)?)%/);
        const volumeMatch = tdVolume.match(/([0-9][0-9,]*(?:\.\d+)?)/);

        const row = {
          segment: toLabel(segmentId),
          segmentId,
          slug,
          name,
          wikiSlug: wikiMatch ? wikiMatch[1] : null,
          trend7dPct: trendMatch ? parseNumeric(trendMatch[1]) : null,
          volume24h: volumeMatch ? parseNumeric(volumeMatch[1]) : null
        };

        if (valueMatch) {
          row.value = {
            quoteAmount: parseNumeric(valueMatch[1]),
            quoteCurrencySlug: valueMatch[2].toLowerCase(),
            itemAmount: parseNumeric(valueMatch[3]),
            itemCurrencySlug: valueMatch[4].toLowerCase()
          };
        } else {
          row.value = null;
        }

        rows.push(row);
      }
    }

    rowMatch = rowRegex.exec(tbody);
  }

  return rows;
}

function addEdge(graph, from, to, factor) {
  if (!from || !to || !Number.isFinite(factor) || factor <= 0) return;
  if (!graph.has(from)) graph.set(from, []);
  graph.get(from).push({ to, factor });
}

function buildRates(allRows) {
  const graph = new Map();

  for (const row of allRows) {
    if (!row.value) continue;
    const { quoteAmount, quoteCurrencySlug, itemAmount, itemCurrencySlug } = row.value;
    if (!quoteAmount || !itemAmount) continue;

    const forward = quoteAmount / itemAmount;
    const reverse = itemAmount / quoteAmount;
    addEdge(graph, quoteCurrencySlug, itemCurrencySlug || row.slug, forward);
    addEdge(graph, itemCurrencySlug || row.slug, quoteCurrencySlug, reverse);
  }

  const chaosRow = allRows.find((r) => r.name.toLowerCase() === "chaos orb");
  const chaosSlug = chaosRow ? chaosRow.slug : "chaos";
  const rates = { [chaosSlug]: 1 };
  const queue = [chaosSlug];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const base = rates[current];
    const edges = graph.get(current) || [];

    for (const edge of edges) {
      const nextValue = base * edge.factor;
      if (!Number.isFinite(nextValue) || nextValue <= 0) continue;
      if (!(edge.to in rates)) {
        rates[edge.to] = nextValue;
        queue.push(edge.to);
      }
    }
  }

  return { rates, chaosSlug };
}

async function fetchSegment(segmentId) {
  const url = `${SOURCE_ROOT}/Economy_${segmentId}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; POE2CraftMentorBot/1.0)"
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on ${url}`);
  }

  const html = await res.text();
  const rows = extractRows(html, segmentId);
  return {
    id: segmentId,
    label: toLabel(segmentId),
    url,
    rows
  };
}

function enrichRows(segments, rates, divineChaos) {
  for (const segment of segments) {
    for (const row of segment.rows) {
      const chaosValue = rates[row.slug] || null;
      row.chaosValue = chaosValue;
      row.divineValue = chaosValue && divineChaos ? chaosValue / divineChaos : null;
    }
  }
}

async function main() {
  const errors = [];
  const segments = [];

  for (const segmentId of SEGMENTS) {
    try {
      const segment = await fetchSegment(segmentId);
      segments.push(segment);
      console.log(`[ok] ${segmentId}: ${segment.rows.length} rows`);
    } catch (error) {
      errors.push({ segmentId, message: String(error.message || error) });
      console.error(`[error] ${segmentId}: ${error.message || error}`);
    }
  }

  const allRows = segments.flatMap((s) => s.rows);
  if (allRows.length === 0) {
    if (fs.existsSync(OUTPUT_FILE)) {
      console.warn("[warn] no new economy rows fetched, keeping existing economy.json");
      return;
    }
    throw new Error("No economy rows fetched and no existing output file.");
  }

  const { rates, chaosSlug } = buildRates(allRows);
  const divineRow = allRows.find((r) => r.name.toLowerCase() === "divine orb");
  const divineSlug = divineRow ? divineRow.slug : "divine";
  const divineChaos = rates[divineSlug] || null;

  enrichRows(segments, rates, divineChaos);

  const payload = {
    source: {
      provider: "PoE2DB",
      page: SOURCE_PAGE,
      realm: "US"
    },
    fetchedAt: new Date().toISOString(),
    chaosReference: chaosSlug,
    divineReference: divineSlug,
    rates,
    segments,
    stats: {
      segmentCount: segments.length,
      rowCount: allRows.length
    },
    errors
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[done] wrote ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
