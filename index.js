// index.js — 1000 Boulevard of the Arts citation agent runner
'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { PROMPTS } = require('./prompts');
const { runCitationResearch, summarizeResults, BRAND, BRAND_DOMAIN } = require('./agent');
const { generateReport } = require('./report');
const { pushToHub } = require('./hub-push');            // NEW
const CONFIG = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
  emailTo: process.env.EMAIL_TO,
  gmailPass: process.env.GMAIL_APP_PASSWORD,
};
const HISTORY_FILE = path.join(__dirname, 'history.json');
function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); }
  catch { return []; }
}
function saveHistory(entry) {
  const history = loadHistory();
  history.push(entry);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(-52), null, 2));
}
async function sendEmail(subject, html) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: CONFIG.emailFrom, pass: CONFIG.gmailPass },
  });
  await transporter.sendMail({
    from: `"1000 Boulevard of the Arts Citation Agent" <${CONFIG.emailFrom}>`,
    to: CONFIG.emailTo,
    subject, html,
  });
  console.log(`✓ Email sent to ${CONFIG.emailTo}`);
}
async function runWeeklyReport() {
  if (!CONFIG.apiKey) {
    console.error('✗ ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }
  const runDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  console.log(`\n1000 Boulevard of the Arts — Weekly AI Citation Run · ${runDate}\n`);
  const history = loadHistory();
  const prevEntry = history.length ? history[history.length - 1] : null;
  const prevResults = prevEntry ? prevEntry.results : null;
  const results = await runCitationResearch({
    apiKey: CONFIG.apiKey,
    prompts: PROMPTS,
    onProgress: (i, total, promptText) => console.log(`[${i}/${total}] ${promptText.slice(0, 70)}…`),
  });
  const summary = summarizeResults(results, prevResults);

  // NEW — refuse to record a run where every prompt errored, so a broken
  // API key can never land as a legitimate 0% week.
  const valid = results.filter(r =>
    ['cited', 'mentioned', 'absent'].includes(r.brand_status));
  if (valid.length === 0) {
    console.error(`✗ All ${results.length} prompts errored — not saving, not emailing.`);
    process.exit(1);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results for ${BRAND}:`);
  console.log(`  Citation rate : ${summary.citationRate}%`);
  console.log(`  Cited         : ${summary.cited}/${summary.total}`);
  console.log(`  Mentioned     : ${summary.mentioned}/${summary.total}`);
  console.log(`  Absent        : ${summary.absent}/${summary.total}`);
  if (summary.delta !== null) console.log(`  vs last week  : ${summary.delta >= 0 ? '+' : ''}${summary.delta}pp`);
  console.log(`${'─'.repeat(60)}\n`);
  saveHistory({ date: new Date().toISOString(), results, summary: {
    citationRate: summary.citationRate, cited: summary.cited,
    mentioned: summary.mentioned, absent: summary.absent, total: summary.total,
  }});
  const html = generateReport({ brand: BRAND, brandDomain: BRAND_DOMAIN, results, summary, runDate });
  const reportFile = path.join(__dirname, `report-${new Date().toISOString().slice(0, 10)}.html`);
  fs.writeFileSync(reportFile, html);
  console.log(`✓ Report saved to ${reportFile}`);

  // NEW — push to the Citation Hub. Never throws; a hub outage only warns.
  await pushToHub({
    slug: process.env.CCH_SLUG,
    runDate: new Date().toISOString().slice(0, 10),
    summary,
    results,
  });

  if (CONFIG.emailFrom && CONFIG.emailTo && CONFIG.gmailPass) {
    const subject = `${BRAND} AI Citation Report — ${summary.citationRate}% citation rate — ${runDate}`;
    await sendEmail(subject, html);
  } else {
    console.log('⚠ Email not configured — report saved locally only.');
    console.log('  Set EMAIL_FROM, EMAIL_TO, and GMAIL_APP_PASSWORD to enable email delivery.');
  }
  console.log('\n✓ Done.\n');
}
runWeeklyReport().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
