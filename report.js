// report.js — 1000 Boulevard of the Arts weekly citation HTML email report
// Brand palette pulled from the 1000 BOTA style guide.
'use strict';

const PRIMARY = "#074F71";   // aqua blue
const DARK = "#414042";      // dark grey
const ACCENT = "#3C5F56";    // pale green
const LIGHT = "#E8F1F5";     // light aqua callout
const HIGHLIGHT = "#F2B705"; // gold from mosaic artwork (restrained)
const GRAY = "#7A7A78";
const LIGHT_GRAY = "#F5F5F3";
const WHITE = "#FFFFFF";
const BORDER = "#DDDDDA";
const GREEN = "#1D7A4F";
const LIGHT_GREEN = "#E5F4EC";
const RED = "#B4423A";

function statusBadge(status) {
  const styles = {
    cited: `background:${LIGHT_GREEN};color:#0B4A2E;border:1px solid #74C29A;`,
    mentioned: `background:${LIGHT};color:${PRIMARY};border:1px solid ${PRIMARY};`,
    absent: `background:${LIGHT_GRAY};color:#55554F;border:1px solid #B9B9B2;`,
    error: `background:#FBEBEA;color:#7A2620;border:1px solid #E7A19B;`,
  };
  const labels = { cited: 'Cited', mentioned: 'Mentioned', absent: 'Absent', error: 'Error' };
  return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;${styles[status] || styles.absent}">${labels[status] || status}</span>`;
}

function deltaArrow(delta) {
  if (delta === null || delta === undefined) return '<span style="color:' + GRAY + ';">first run — baseline week</span>';
  if (delta > 0) return `<span style="color:${GREEN};font-weight:600;">▲ +${delta}pp vs last week</span>`;
  if (delta < 0) return `<span style="color:${RED};font-weight:600;">▼ ${delta}pp vs last week</span>`;
  return `<span style="color:${GRAY};">→ no change vs last week</span>`;
}

function generateReport({ brand, brandDomain, results, summary, runDate }) {
  const { total, cited, mentioned, absent, citationRate, visibilityRate, sourceCounts, clusters, compScores, delta } = summary;

  const order = { cited: 0, mentioned: 1, absent: 2, error: 3 };
  const sorted = [...results].sort((a, b) => (order[a.brand_status] ?? 2) - (order[b.brand_status] ?? 2));

  const promptRows = sorted.map((r) => `
    <tr>
      <td style="padding:10px 12px;font-size:13px;color:${DARK};border-bottom:1px solid ${BORDER};line-height:1.45;">
        ${r.prompt}
        <div style="font-size:11px;color:${GRAY};margin-top:4px;">${r.cluster} · ${r.brand_context || ''}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};white-space:nowrap;vertical-align:top;">${statusBadge(r.brand_status)}</td>
    </tr>`).join('');

  const sourceRows = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([src, count]) => {
      const owned = src.includes(brandDomain);
      return `<tr>
        <td style="padding:8px 12px;font-size:13px;color:${DARK};border-bottom:1px solid ${BORDER};">
          ${owned ? `<strong style="color:${GREEN};">${src} ✓ owned</strong>` : src}
        </td>
        <td style="padding:8px 12px;font-size:13px;text-align:right;border-bottom:1px solid ${BORDER};">${count}×</td>
      </tr>`;
    }).join('') || `<tr><td style="padding:8px 12px;font-size:13px;color:${GRAY};">No sources captured this week.</td><td></td></tr>`;

  const clusterRows = Object.entries(clusters).map(([name, cl]) => {
    const rate = cl.total > 0 ? Math.round((cl.cited / cl.total) * 100) : 0;
    return `<tr>
      <td style="padding:8px 12px;font-size:13px;color:${DARK};border-bottom:1px solid ${BORDER};">${name}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right;border-bottom:1px solid ${BORDER};">${cl.cited}/${cl.total} cited</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right;border-bottom:1px solid ${BORDER};font-weight:600;color:${PRIMARY};">${rate}%</td>
    </tr>`;
  }).join('');

  const compRows = Object.entries(compScores).sort((a, b) => b[1] - a[1]).map(([name, score]) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:${DARK};border-bottom:1px solid ${BORDER};">${name}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right;border-bottom:1px solid ${BORDER};">${score} appearance${score === 1 ? '' : 's'}</td>
    </tr>`).join('');

  const stat = (value, label) => `
    <td style="width:33%;padding:16px 8px;text-align:center;background:${LIGHT};border-radius:8px;">
      <div style="font-size:30px;font-weight:700;color:${PRIMARY};letter-spacing:-0.5px;">${value}</div>
      <div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:${DARK};margin-top:4px;">${label}</div>
    </td>`;

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F2F2F0;">
<div style="max-width:680px;margin:0 auto;background:${WHITE};font-family:Georgia,'Times New Roman',serif;">

  <div style="background:${WHITE};padding:36px 36px 24px;border-top:6px solid ${PRIMARY};">
    <div style="font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:${ACCENT};font-family:Arial,sans-serif;">Weekly AI Citation Report</div>
    <div style="font-size:30px;color:${DARK};margin-top:8px;font-weight:400;">${brand}</div>
    <div style="font-size:13px;color:${GRAY};margin-top:6px;font-family:Arial,sans-serif;">${runDate} · ${brandDomain} · ChatGPT, Perplexity, Gemini & Claude visibility</div>
    <div style="height:3px;width:64px;background:${HIGHLIGHT};margin-top:16px;"></div>
  </div>

  <div style="padding:8px 36px 4px;">
    <table width="100%" cellpadding="0" cellspacing="8"><tr>
      ${stat(citationRate + '%', 'Citation rate')}
      ${stat(visibilityRate + '%', 'Visibility rate')}
      ${stat(cited + ' / ' + total, 'Prompts cited')}
    </tr></table>
    <div style="font-size:13px;color:${DARK};padding:10px 4px 0;font-family:Arial,sans-serif;">${deltaArrow(delta)} · ${mentioned} mentioned · ${absent} absent</div>
  </div>

  <div style="padding:24px 36px;">
    <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${PRIMARY};font-family:Arial,sans-serif;border-bottom:2px solid ${PRIMARY};padding-bottom:6px;">Performance by prompt cluster</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;font-family:Arial,sans-serif;">${clusterRows}</table>
  </div>

  <div style="padding:0 36px 24px;">
    <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${PRIMARY};font-family:Arial,sans-serif;border-bottom:2px solid ${PRIMARY};padding-bottom:6px;">Competitive share of voice</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;font-family:Arial,sans-serif;">${compRows}</table>
  </div>

  <div style="padding:0 36px 24px;">
    <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${PRIMARY};font-family:Arial,sans-serif;border-bottom:2px solid ${PRIMARY};padding-bottom:6px;">Source authority</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;font-family:Arial,sans-serif;">${sourceRows}</table>
  </div>

  <div style="padding:0 36px 32px;">
    <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${PRIMARY};font-family:Arial,sans-serif;border-bottom:2px solid ${PRIMARY};padding-bottom:6px;">All ${total} prompts this week</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;font-family:Arial,sans-serif;">${promptRows}</table>
  </div>

  <div style="padding:18px 36px;background:${LIGHT_GRAY};border-top:1px solid ${BORDER};text-align:center;font-family:Arial,sans-serif;">
    <div style="font-size:11px;color:${GRAY};">Prepared by Cotton & Company Digital Department · Proprietary AI Citation Measurement System</div>
    <div style="font-size:10px;color:#AAAAA5;margin-top:4px;">Confidential — for internal and client reporting use</div>
  </div>

</div></body></html>`;
}

module.exports = { generateReport };
