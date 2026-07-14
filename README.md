# live-1000-citation-report
AI Citation report
Weekly AI visibility tracker for 1000 Boulevard of the Arts (live1000.com), built and maintained by the Cotton & Company Digital Department.

Every Monday at 8:00 AM ET, this agent runs 25 buyer-realistic prompts through Claude with live web search, measures whether 1000 Boulevard of the Arts is cited (named with a source link), mentioned (named without a source), or absent from each AI answer, and emails a branded HTML report.

What the report measures


Citation rate — % of prompts where the brand was named and credited to a source
Visibility rate — % of prompts where the brand appeared at all (cited + mentioned)
Source authority — which domains AI answers credit, and whether any are owned (live1000.com)
Competitive share of voice — appearances by The Ritz-Carlton Residences Sarasota Bay, One Park Sarasota, Adagio Sarasota, and Bayso Sarasota
Week-over-week trend — change in citation rate vs. the prior run (stored in history.json)


Files

FilePurposeprompts.jsThe 25-prompt library, organized in 5 clusters (community identity, buyer intent, competitive, location & lifestyle, developer & credibility)agent.jsResearch engine — runs each prompt with web search, then analyzes the answer for brand status, sources, and competitorsreport.jsGenerates the branded HTML email (1000 BOTA palette: aqua #074F71, dark grey #414042, pale green #3C5F56)index.jsRunner — orchestrates the run, saves history, writes the report file, sends the emailpackage.jsonNode dependencies (dotenv, nodemailer).github/workflows/citation.ymlSchedules the Monday run; also allows manual runs. No push trigger — commits do not start runs

Required secrets

Set under Settings → Secrets and variables → Actions:

SecretValueANTHROPIC_API_KEYAnthropic API key (console.anthropic.com)GMAIL_APP_PASSWORD16-character app password created while signed into the sending Gmail account (2-Step Verification required)EMAIL_FROMangelene.mccullough@gmail.comEMAIL_TOcottonclients@gmail.com

Running it manually

Actions → "Weekly AI citation report — 1000 Boulevard of the Arts" → Run workflow.
A full run takes roughly 5–8 minutes (25 prompts × 2 API calls with a 5-second delay between calls).

Even if email delivery fails, the report is always saved as a downloadable Artifact on the workflow run page (citation-report).

Editing the prompts

Edit prompts.js directly on GitHub (pencil icon) and commit. Changes take effect on the next run — remember, commits do not trigger runs, so nothing fires until Monday or a manual run.

History

history.json keeps the last 52 weekly runs and powers the week-over-week delta in the report. Deleting it resets the trend baseline (the next run becomes a new "first week").


Confidential — Cotton & Company proprietary AI Citation Measurement System.
