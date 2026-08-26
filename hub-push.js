// hub-push.js — drop this file into each client repo next to index.js.
//
// It posts one run to the Citation Hub. Failures are logged, never thrown:
// the hub is a nice-to-have, and a WordPress hiccup must not fail the agent
// run or block the email.
'use strict';

async function pushToHub({ slug, runDate, summary, results, agentVersion }) {
  const endpoint = process.env.CCH_ENDPOINT;
  const token = process.env.CCH_TOKEN;

  if (!endpoint || !token) {
    console.log('⚠ Hub not configured (CCH_ENDPOINT / CCH_TOKEN unset) — skipping push.');
    return false;
  }

  const body = {
    client_slug: slug,
    run_date: runDate,                    // YYYY-MM-DD
    agent_version: agentVersion || '1.0.0',
    summary: {
      citation_rate: summary.citationRate,
      visibility_rate: summary.visibilityRate ?? null,
      cited: summary.cited,
      mentioned: summary.mentioned,
      absent: summary.absent,
      errors: summary.errors ?? 0,
      total: summary.total,
      owned_sources: summary.ownedSourceCount ?? 0,
    },
    results,
    competitors: summary.competitorCounts || {},
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CCH-Token': token,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(`⚠ Hub push failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
      return false;
    }

    console.log(`✓ Pushed to hub: ${text.slice(0, 200)}`);
    return true;
  } catch (err) {
    console.error(`⚠ Hub push error: ${err.message}`);
    return false;
  }
}

module.exports = { pushToHub };
