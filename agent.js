// agent.js — 1000 Boulevard of the Arts citation research engine
// Runs each prompt through Claude with live web search, then analyzes
// the response for brand citations, mentions, sources, and competitors.
'use strict';

const MODEL = 'claude-haiku-4-5-20251001';
const DELAY_MS = 5000; // pause between prompts to respect rate limits

const BRAND = "1000 Boulevard of the Arts";
const BRAND_DOMAIN = "live1000.com";
const COMPETITORS = [
  "The Ritz-Carlton Residences Sarasota Bay",
  "One Park Sarasota",
  "Adagio Sarasota",
  "Bayso Sarasota"
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callClaude(apiKey, body) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

// Step 1 — ask the question the way a real buyer would, with web search on
async function runSearchPrompt(apiKey, promptText) {
  const data = await callClaude(apiKey, {
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: promptText }],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  });
  const answer = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  const sources = [];
  (data.content || []).forEach((b) => {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      b.content.forEach((r) => { if (r.url) sources.push(r.url); });
    }
    if (Array.isArray(b.citations)) {
      b.citations.forEach((c) => { if (c.url) sources.push(c.url); });
    }
  });
  return { answer, sources };
}

// Step 2 — analyze the answer for brand status + competitors
async function analyzeAnswer(apiKey, promptText, answer, sources) {
  const analysisPrompt = `You are a brand-visibility analyst. Analyze the AI search answer below.

BRAND: ${BRAND} (domain: ${BRAND_DOMAIN})
COMPETITORS: ${COMPETITORS.join(', ')}

QUESTION ASKED: ${promptText}

ANSWER:
${answer}

SOURCE URLS: ${sources.join(', ') || 'none captured'}

Respond ONLY with JSON, no markdown fences, in exactly this shape:
{"brand_status":"cited|mentioned|absent","brand_context":"one sentence on how the brand appeared or why it was absent","competitors_named":["names actually appearing in the answer"],"cited_sources":["domains credited in the answer"],"owned_source":true_or_false}
"cited" = brand named AND a source link/domain credits it. "mentioned" = named with no source. "absent" = not named. owned_source = any cited source is on ${BRAND_DOMAIN}.`;

  const data = await callClaude(apiKey, {
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: analysisPrompt }],
  });
  const raw = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .replace(/```json|```/g, '')
    .trim();
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {
      brand_status: 'error',
      brand_context: 'Analysis response could not be parsed.',
      competitors_named: [],
      cited_sources: [],
      owned_source: false,
    };
  }
}

async function runCitationResearch({ apiKey, prompts, onProgress }) {
  const results = [];
  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    if (onProgress) onProgress(i + 1, prompts.length, p.text);
    try {
      const { answer, sources } = await runSearchPrompt(apiKey, p.text);
      await sleep(DELAY_MS);
      const analysis = await analyzeAnswer(apiKey, p.text, answer, sources);
      results.push({
        prompt: p.text,
        cluster: p.cluster,
        brand_status: analysis.brand_status || 'absent',
        brand_context: analysis.brand_context || '',
        competitors_named: analysis.competitors_named || [],
        cited_sources: analysis.cited_sources || [],
        owned_source: !!analysis.owned_source,
        raw_sources: sources,
      });
    } catch (err) {
      console.error(`  ✗ Prompt ${i + 1} failed: ${err.message}`);
      results.push({
        prompt: p.text, cluster: p.cluster, brand_status: 'error',
        brand_context: err.message, competitors_named: [],
        cited_sources: [], owned_source: false, raw_sources: [],
      });
    }
    await sleep(DELAY_MS);
  }
  return results;
}

function summarizeResults(results, prevResults) {
  const total = results.length;
  const cited = results.filter((r) => r.brand_status === 'cited').length;
  const mentioned = results.filter((r) => r.brand_status === 'mentioned').length;
  const absent = results.filter((r) => r.brand_status === 'absent').length;
  const citationRate = total ? Math.round((cited / total) * 100) : 0;
  const visibilityRate = total ? Math.round(((cited + mentioned) / total) * 100) : 0;

  const sourceCounts = {};
  results.forEach((r) => (r.cited_sources || []).forEach((s) => {
    sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  }));

  const clusters = {};
  results.forEach((r) => {
    if (!clusters[r.cluster]) clusters[r.cluster] = { total: 0, cited: 0, mentioned: 0 };
    clusters[r.cluster].total++;
    if (r.brand_status === 'cited') clusters[r.cluster].cited++;
    if (r.brand_status === 'mentioned') clusters[r.cluster].mentioned++;
  });

  const compScores = {};
  COMPETITORS.forEach((c) => { compScores[c] = 0; });
  results.forEach((r) => (r.competitors_named || []).forEach((c) => {
    const match = COMPETITORS.find((k) => c.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(c.toLowerCase()));
    if (match) compScores[match]++;
  }));

  let delta = null;
  if (prevResults && prevResults.length) {
    const prevCited = prevResults.filter((r) => r.brand_status === 'cited').length;
    const prevRate = Math.round((prevCited / prevResults.length) * 100);
    delta = citationRate - prevRate;
  }

  return { total, cited, mentioned, absent, citationRate, visibilityRate, sourceCounts, clusters, compScores, delta };
}

module.exports = { runCitationResearch, summarizeResults, BRAND, BRAND_DOMAIN, COMPETITORS };
