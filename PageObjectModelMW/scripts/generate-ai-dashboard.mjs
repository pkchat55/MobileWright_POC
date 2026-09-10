import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const resultsDirectory = 'test-results';
const dashboardDirectory = 'ai-dashboard';
const outputFile = 'test-output.log';
const screenshotFile = 'emulator-final-state.png';

const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

async function findFiles(directory) {
  if (!existsSync(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? findFiles(file) : [file];
  }))).flat();
}

function classifyFailure(details) {
  const text = details.toLowerCase();
  if (/security|auth|credential|unauthori[sz]ed|data loss/.test(text)) {
    return { priority: 'P0', severity: 'Critical' };
  }
  if (/websocket|device|emulator|install app|app crash|fatal|timeout/.test(text)) {
    return { priority: 'P1', severity: 'High' };
  }
  if (/locator|not visible|element|assertion/.test(text)) {
    return { priority: 'P2', severity: 'Medium' };
  }
  return { priority: 'P3', severity: 'Low' };
}

function fallbackAnalysis(details) {
  if (/websocket|device|emulator/.test(details.toLowerCase())) {
    return 'Automation service lost its device connection. Check emulator boot state, ADB availability, and MobileWright service logs before rerunning.';
  }
  if (/timeout/.test(details.toLowerCase())) {
    return 'The flow did not reach its expected state before timeout. Check the preceding UI action and replace fixed waits with a state-based assertion.';
  }
  return 'Review the failure context and the preceding test step. Reproduce on the emulator, then fix the failing locator or application behavior.';
}

async function getAiAnalysis(failure) {
  const fallback = fallbackAnalysis(failure.details);
  if (!process.env.GITHUB_TOKEN) return fallback;

  try {
    const response = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        temperature: 0.1,
        max_tokens: 180,
        messages: [{
          role: 'system',
          content: 'You analyze mobile test failures. Give concise root cause, evidence, and one concrete next action. Do not invent facts.',
        }, {
          role: 'user',
          content: `Test: ${failure.name}\nFailure context:\n${failure.details.slice(0, 5000)}`,
        }],
      }),
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

const output = existsSync(outputFile) ? await readFile(outputFile, 'utf8') : '';
const contextFiles = (await findFiles(resultsDirectory)).filter((file) => file.endsWith('error-context.md'));
const failures = [];

for (const file of contextFiles) {
  const details = await readFile(file, 'utf8');
  const pathName = file.replace(/^test-results\//, '').replace('/error-context.md', '').replaceAll('-', ' ');
  failures.push({ name: pathName, details });
}

if (!failures.length && /\bfailed\b/i.test(output)) {
  failures.push({ name: 'Android test run', details: output.slice(-6000) });
}

for (const failure of failures) {
  Object.assign(failure, classifyFailure(failure.details));
  failure.analysis = await getAiAnalysis(failure);
}

await mkdir(dashboardDirectory, { recursive: true });
const status = failures.length ? 'Failed' : 'Passed';
const generatedAt = new Date().toISOString().replace('T', ' ').replace('.000Z', ' UTC');
const highCount = failures.filter((failure) => failure.severity === 'High' || failure.severity === 'Critical').length;
const rows = failures.length
  ? failures.map((failure) => `| ${failure.priority} | ${failure.severity} | ${failure.name} | ${failure.analysis.replaceAll('\n', ' ')} |`).join('\n')
  : '| P3 | Info | Android test run | No test failures detected. |';
const runUrl = `${process.env.GITHUB_SERVER_URL ?? ''}/${process.env.GITHUB_REPOSITORY ?? ''}/actions/runs/${process.env.GITHUB_RUN_ID ?? ''}`;
const markdown = `# Android Test AI Dashboard\n\n| Status | Failures | High / Critical | Generated |\n| --- | ---: | ---: | --- |\n| ${status} | ${failures.length} | ${highCount} | ${generatedAt} |\n\n**Run:** ${runUrl}\n\n| Priority | Severity | Failure | AI analysis |\n| --- | --- | --- | --- |\n${rows}\n\nThe downloadable dashboard artifact includes the final emulator screenshot when capture succeeds.\n`;
const htmlRows = failures.length
  ? failures.map((failure) => `<tr><td>${escapeHtml(failure.priority)}</td><td>${escapeHtml(failure.severity)}</td><td>${escapeHtml(failure.name)}</td><td>${escapeHtml(failure.analysis)}</td></tr>`).join('')
  : '<tr><td>P3</td><td>Info</td><td>Android test run</td><td>No test failures detected.</td></tr>';
const screenshot = existsSync(join(dashboardDirectory, screenshotFile))
  ? `<section class="panel screenshot"><div class="section-heading"><div><p class="eyebrow">Evidence</p><h2>Final emulator state</h2></div><span class="badge">PNG attached</span></div><img src="${screenshotFile}" alt="Final Android emulator screen after the test run"></section>`
  : '<section class="panel empty"><h2>Final emulator state</h2><p>Screenshot capture was unavailable for this run.</p></section>';
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Android Test AI Dashboard</title><style>:root{--ink:#101828;--muted:#667085;--line:#e4e7ec;--canvas:#f8fafc;--panel:#fff;--blue:#175cd3;--red:#b42318;--green:#027a48}*{box-sizing:border-box}body{margin:0;background:var(--canvas);font:15px/1.55 Inter,ui-sans-serif,system-ui,sans-serif;color:var(--ink)}.hero{padding:46px max(24px,calc((100% - 1120px)/2));background:radial-gradient(circle at top right,#2e90fa 0,transparent 35%),linear-gradient(135deg,#0b1f44,#101828);color:#fff}.eyebrow{margin:0 0 5px;text-transform:uppercase;letter-spacing:.11em;font-size:11px;font-weight:800;color:#98caff}.hero h1{margin:0;font-size:32px;letter-spacing:-.03em}.hero p{margin:8px 0 0;color:#d0d5dd}.container{width:min(1120px,calc(100% - 48px));margin:28px auto 48px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}.card,.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 3px #1018280d}.card{padding:18px}.card p{margin:0;color:var(--muted);font-size:13px;font-weight:650}.card strong{display:block;font-size:26px;margin-top:6px}.failed{color:var(--red)}.passed{color:var(--green)}.panel{padding:24px;margin-top:24px;overflow:hidden}.section-heading{display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:18px}.section-heading .eyebrow{color:var(--blue)}h2{margin:0;font-size:19px}.badge{background:#eff8ff;color:#175cd3;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:750;white-space:nowrap}table{width:100%;border-collapse:collapse}th,td{padding:14px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:#f9fafb;color:#475467;font-size:12px;text-transform:uppercase;letter-spacing:.04em}td:first-child{font-weight:800;color:#175cd3}td:nth-child(2){font-weight:700}tr:last-child td{border:0}.screenshot img{display:block;width:min(100%,540px);border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 24px #1018281a}.empty p{color:var(--muted)}.run-link{color:#98caff}@media(max-width:760px){.cards{grid-template-columns:repeat(2,1fr)}.hero{padding:32px 24px}.container{width:calc(100% - 32px)}table{min-width:720px}.panel{overflow:auto}}@media(max-width:430px){.cards{grid-template-columns:1fr}}</style></head><body><header class="hero"><p class="eyebrow">Continuous quality report</p><h1>Android Test AI Dashboard</h1><p>Run: <a class="run-link" href="${escapeHtml(runUrl)}">${escapeHtml(process.env.GITHUB_RUN_ID ?? 'local')}</a></p></header><main class="container"><section class="cards"><article class="card"><p>Run status</p><strong class="${failures.length ? 'failed' : 'passed'}">${status}</strong></article><article class="card"><p>Failures</p><strong>${failures.length}</strong></article><article class="card"><p>High / Critical</p><strong>${highCount}</strong></article><article class="card"><p>Generated</p><strong>${generatedAt}</strong></article></section><section class="panel"><div class="section-heading"><div><p class="eyebrow">AI triage</p><h2>Failure findings</h2></div><span class="badge">GitHub Models analysis</span></div><table><thead><tr><th>Priority</th><th>Severity</th><th>Failure</th><th>AI analysis and next action</th></tr></thead><tbody>${htmlRows}</tbody></table></section>${screenshot}</main></body></html>`;

await writeFile(join(dashboardDirectory, 'index.md'), markdown);
await writeFile(join(dashboardDirectory, 'index.html'), html);
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, markdown, { flag: 'a' });