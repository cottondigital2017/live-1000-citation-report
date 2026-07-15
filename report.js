// report.js — 1000 Boulevard of the Arts weekly citation HTML email report
// Exact structural match to the original Cotton & Company / Boca West report:
// Header bar → KPI row → Source alert → Citation rate by topic cluster →
// Competitor comparison → Sources AI cited → All prompt results (with
// Position column, Source line, and per-competitor "Also:" line) → Footer.
// Palette swapped to the 1000 BOTA style guide.
'use strict';

// NOTE: the "Position" column renders r.position when the agent captures it
// (e.g. "#1 of 5"); to enable that, add "position" to the analysis JSON in
// agent.js — see the swap-in instructions in chat.

// ── 1000 Boulevard of the Arts brand palette ──
const NAVY = "#074F71";        // header bar / table headers (aqua blue)
const GOLD = "#F2B705";        // header eyebrow + table header text (mosaic gold)
const HEADER_SUB = "#B8D9E8";  // light aqua for header subtitle
const INK = "#2C2C2A";
const NOTE = "#444441";
const GRAY = "#888780";
const PAGE_BG = "#F5F4F1";
const CARD_BG = "#F5F4F1";
const TRACK = "#F1EFE8";
const BAR = "#CDE4EF";         // light aqua bar fill
const TABLE_BORDER = "#E8E7E3";
const ROW_BORDER = "#F1EFE8";
const WHITE = "#ffffff";
const GREEN = "#1D9E75";
const GREEN_DARK = "#085041";
const GREEN_BG = "#E1F5EE";
const GREEN_BORDER = "#5DCAA5";
const BLUE = "#378ADD";
const BLUE_DARK = "#0C447C";
const BLUE_BG = "#E6F1FB";
const BLUE_BORDER = "#85B7EB";
const RED = "#E24B4A";
const RED_DARK = "#791F1F";
const RED_BG = "#FCEBEB";
const RED_BORDER = "#F09595";
const ABSENT_TEXT = "#444441";
const ABSENT_BORDER = "#B4B2A9";

function statusBadge(status) {
  const styles = {
    cited:     `background:${GREEN_BG}; color:${GREEN_DARK}; border:1px solid ${GREEN_BORDER};`,
    mentioned: `background:${BLUE_BG}; color:${BLUE_DARK}; border:1px solid ${BLUE_BORDER};`,
    absent:    `background:${PAGE_BG}; color:${ABSENT_TEXT}; border:1px solid ${ABSENT_BORDER};`,
    error:     `background:${RED_BG}; color:${RED_DARK}; border:1px solid ${RED_BORDER};`,
  };
  const labels = { cited:'Cited', mentioned:'Mentioned', absent:'Absent', error:'Error' };
  return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;${styles[status] || styles.absent}">${labels[status] || status}</span>`;
}

function th(text, align = 'left', width = '') {
  return `<th style="padding:8px 12px;font-size:11px;font-weight:600;color:${GOLD};text-align:${align};${width ? 'width:' + width + ';' : ''}">${text}</th>`;
}

function sectionTitle(text) {
  return `<div style="font-size:13px;font-weight:700;color:${NAVY};margin-bottom:12px;">${text}</div>`;
}

function generateReport({ brand, brandDomain, results, summary, runDate }) {
  const { total, cited, mentioned, absent, citationRate, sourceCounts, clusters, compScores, delta } = summary;

  // ── KPI row (4 cards: rate / cited / mentioned / absent) ──
  const rateColor = citationRate >= 40 ? GREEN : citationRate >= 20 ? BLUE : RED;
  const trend = (delta === null || delta === undefined) ? ''
    : delta > 0 ? `<div style="font-size:11px;color:${GREEN};margin-top:2px;font-weight:600;">▲ +${delta}pp vs last week</div>`
    : delta < 0 ? `<div style="font-size:11px;color:${RED};margin-top:2px;font-weight:600;">▼ ${delta}pp vs last week</div>`
    : `<div style="font-size:11px;color:${GRAY};margin-top:2px;">→ no change vs last week</div>`;

  const kpi = (value, label, color, extra = '') => `
          <td width="25%" style="padding-right:8px;">
            <div style="background:${CARD_BG};border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:${color};">${value}</div>
              <div style="font-size:11px;color:${GRAY};margin-top:3px;">${label}</div>
              ${extra}
            </div>
          </td>`;

  // ── Source alert callout ──
  const ownedCount = Object.entries(sourceCounts)
    .filter(([s]) => s.includes(brandDomain))
    .reduce((n, [, c]) => n + c, 0);
  const thirdPartyCount = Object.entries(sourceCounts)
    .filter(([s]) => !s.includes(brandDomain))
    .reduce((n, [, c]) => n + c, 0);
  const sourceAlert = ownedCount > 0
    ? `<div style="background:${GREEN_BG};border-radius:8px;padding:14px 16px;font-size:13px;color:${INK};">
        <strong style="color:${GREEN_DARK};">✓ Source authority improving</strong>
        &nbsp;—&nbsp; ${brandDomain} cited ${ownedCount}x (owned).
        ${thirdPartyCount > 0 ? `Aggregators cited ${thirdPartyCount}x — content plan is designed to replace these.` : `No aggregator citations this week.`}
      </div>`
    : `<div style="background:${RED_BG};border-radius:8px;padding:14px 16px;font-size:13px;color:${INK};">
        <strong style="color:${RED_DARK};">⚠ No owned-source citations yet</strong>
        &nbsp;—&nbsp; AI is not yet crediting ${brandDomain} directly.
        ${thirdPartyCount > 0 ? `Third-party sources cited ${thirdPartyCount}x — the content plan targets replacing these with owned pages.` : `Publishing authority content on ${brandDomain} is the priority.`}
      </div>`;

  // ── Citation rate by topic cluster ──
  const clusterRows = Object.entries(clusters).map(([name, cl]) => {
    const rate = cl.total > 0 ? Math.round((cl.cited / cl.total) * 100) : 0;
    return `<tr>
      <td style="padding:8px 12px;font-size:13px;color:${INK};">${name}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:center;">${cl.cited}/${cl.total}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:center;">${rate}%</td>
      <td style="padding:8px 12px;width:100px;"><div style="background:${TRACK};height:6px;border-radius:3px;"><div style="background:${BAR};height:6px;border-radius:3px;width:${rate}%;min-width:4px;"></div></div></td>
    </tr>`;
  }).join('');

  // ── Competitor comparison ──
  // compScores may be simple counts (appearances) or objects {cited, mentioned}.
  const compRows = Object.entries(compScores)
    .map(([name, v]) => {
      const c = typeof v === 'object' ? (v.cited || 0) : v;
      const m = typeof v === 'object' ? (v.mentioned || 0) : 0;
      const appeared = c + m;
      const rate = appeared > 0 ? Math.round((c / appeared) * 100) : 0;
      return { name, c, m, rate };
    })
    .sort((a, b) => (b.c + b.m) - (a.c + a.m))
    .map((r) => `<tr>
      <td style="padding:8px 12px;font-size:13px;color:${INK};">${r.name}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:center;">${r.c}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:center;">${r.m}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:center;">${r.rate}%</td>
    </tr>`).join('');

  // ── Sources AI cited ──
  const sourceRows = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])
    .map(([src, count]) => {
      const owned = src.includes(brandDomain);
      return `<tr>
        <td style="padding:8px 12px;font-size:13px;color:${INK};">
          ${owned ? `<strong style="color:${GREEN};">${src} ✓ owned</strong>` : src}
        </td>
        <td style="padding:8px 12px;font-size:13px;text-align:right;">${count}x</td>
      </tr>`;
    }).join('') || `<tr><td style="padding:8px 12px;font-size:13px;color:${GRAY};">No sources captured this week.</td><td></td></tr>`;

  // ── All prompt results ──
  const order = { cited: 0, mentioned: 1, absent: 2, error: 3 };
  const sorted = [...results].sort((a, b) => (order[a.brand_status] ?? 2) - (order[b.brand_status] ?? 2));

  const promptRows = sorted.map((r) => {
    const position = r.position && r.position !== ''
      ? r.position
      : (r.brand_status === 'absent' ? 'not present' : '—');
    const srcLine = (r.cited_sources && r.cited_sources.length)
      ? `<div style="font-size:11px;color:${GRAY};margin-top:3px;font-style:italic;">Source: ${r.cited_sources.join(', ')} ${r.owned_source ? `<strong style="color:${GREEN};">← owned ✓</strong>` : ''}</div>`
      : '';
    const alsoLine = (r.competitors_named && r.competitors_named.length)
      ? `<div style="font-size:11px;color:${GRAY};margin-top:3px;">Also: ${r.competitors_named.join(', ')}</div>`
      : '';
    return `<tr style="border-bottom:1px solid ${ROW_BORDER};">
      <td style="padding:10px 12px;vertical-align:top;">
        <div style="font-size:13px;color:${INK};margin-bottom:4px;">${r.prompt}</div>
        <div style="font-size:11px;color:${GRAY};">${r.cluster}</div>
      </td>
      <td style="padding:10px 12px;vertical-align:top;text-align:center;">${statusBadge(r.brand_status)}</td>
      <td style="padding:10px 12px;vertical-align:top;font-size:12px;color:${GRAY};">${position}</td>
      <td style="padding:10px 12px;vertical-align:top;">
        <div style="font-size:12px;color:${NOTE};line-height:1.5;">${r.brand_context || ''}</div>
        ${srcLine}
        ${alsoLine}
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};padding:24px 0;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:${WHITE};border-radius:12px;overflow:hidden;">

  <!-- Header -->
  <tr>
    <td style="background:${NAVY};padding:28px 32px 24px;">
      <div style="font-size:11px;font-weight:600;color:${GOLD};letter-spacing:1.5px;margin-bottom:6px;">WEEKLY AI CITATION REPORT</div>
      <div style="font-size:24px;font-weight:700;color:${WHITE};margin-bottom:4px;">${brand}</div>
      <div style="font-size:13px;color:${HEADER_SUB};">${runDate} &nbsp;·&nbsp; ${total} prompts tested across AI search</div>
    </td>
  </tr>

  <!-- KPI row -->
  <tr>
    <td style="padding:24px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${kpi(citationRate + '%', 'citation rate', rateColor, trend)}
          ${kpi(String(cited), 'cited (with link)', GREEN)}
          ${kpi(String(mentioned), 'mentioned', BLUE)}
          ${kpi(String(absent), 'absent', GRAY)}
        </tr>
      </table>
    </td>
  </tr>

  <!-- Source alert -->
  <tr>
    <td style="padding:20px 32px 0;">
      ${sourceAlert}
    </td>
  </tr>

  <!-- By cluster -->
  <tr>
    <td style="padding:24px 32px 0;">
      ${sectionTitle('Citation rate by topic cluster')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${TABLE_BORDER};border-radius:8px;overflow:hidden;">
        <tr style="background:${NAVY};">
          ${th('Cluster')}
          ${th('Cited/Total', 'center')}
          ${th('Rate', 'center')}
          ${th('')}
        </tr>
        ${clusterRows}
      </table>
    </td>
  </tr>

  <!-- Competitors -->
  <tr>
    <td style="padding:24px 32px 0;">
      ${sectionTitle('Competitor comparison')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${TABLE_BORDER};border-radius:8px;overflow:hidden;">
        <tr style="background:${NAVY};">
          ${th('Competitor')}
          ${th('Cited', 'center')}
          ${th('Mentioned', 'center')}
          ${th('Citation rate', 'center')}
        </tr>
        ${compRows}
      </table>
    </td>
  </tr>

  <!-- Citation sources -->
  <tr>
    <td style="padding:24px 32px 0;">
      ${sectionTitle('Sources AI cited for ' + brand)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${TABLE_BORDER};border-radius:8px;overflow:hidden;">
        <tr style="background:${NAVY};">
          ${th('Source domain')}
          ${th('Times cited', 'right')}
        </tr>
        ${sourceRows}
      </table>
    </td>
  </tr>

  <!-- Full prompt results -->
  <tr>
    <td style="padding:24px 32px 0;">
      ${sectionTitle('All prompt results')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${TABLE_BORDER};border-radius:8px;overflow:hidden;">
        <tr style="background:${NAVY};">
          ${th('Prompt', 'left', '40%')}
          ${th('Status', 'center', '10%')}
          ${th('Position', 'left', '10%')}
          ${th('Notes', 'left', '40%')}
        </tr>
        ${promptRows}
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 32px 32px;">
      <div style="border-top:2px solid ${GOLD};padding-top:16px;font-size:11px;color:${GRAY};text-align:center;">
        ${brand} &nbsp;·&nbsp; AI Citation Monitoring &nbsp;·&nbsp; ${brandDomain}<br>
        Report generated automatically by the ${brand} Citation Agent &nbsp;·&nbsp; ${runDate}
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = { generateReport };
