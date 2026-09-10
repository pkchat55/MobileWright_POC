import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const resultsDirectory = 'test-results';
const dashboardDirectory = 'ai-dashboard';
const outputFile = 'test-output.log';

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
const rows = failures.length
  ? failures.map((failure) => `| ${failure.priority} | ${failure.severity} | ${failure.name} | ${failure.analysis.replaceAll('\n', ' ')} |`).join('\n')
  : '| P3 | Info | Android test run | No test failures detected. |';
const markdown = `# Android Test AI Dashboard\n\n**Status:** ${status}  \n**Run:** ${process.env.GITHUB_SERVER_URL ?? ''}/${process.env.GITHUB_REPOSITORY ?? ''}/actions/runs/${process.env.GITHUB_RUN_ID ?? ''}\n\n| Priority | Severity | Failure | AI analysis |\n| --- | --- | --- | --- |\n${rows}\n`;
const htmlRows = failures.length
  ? failures.map((failure) => `<tr><td>${escapeHtml(failure.priority)}</td><td>${escapeHtml(failure.severity)}</td><td>${escapeHtml(failure.name)}</td><td>${escapeHtml(failure.analysis)}</td></tr>`).join('')
  : '<tr><td>P3</td><td>Info</td><td>Android test run</td><td>No test failures detected.</td></tr>';
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Android Test AI Dashboard</title><style>body{font:16px system-ui;margin:40px;color:#172033}h1{margin-bottom:4px}.status{font-weight:700;color:${failures.length ? '#b42318' : '#027a48'}}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #d0d5dd;padding:12px;text-align:left;vertical-align:top}th{background:#f2f4f7}td:first-child{font-weight:700}</style></head><body><h1>Android Test AI Dashboard</h1><p class="status">Status: ${status}</p><table><thead><tr><th>Priority</th><th>Severity</th><th>Failure</th><th>AI analysis</th></tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;

await writeFile(join(dashboardDirectory, 'index.md'), markdown);
await writeFile(join(dashboardDirectory, 'index.html'), html);
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, markdown, { flag: 'a' });