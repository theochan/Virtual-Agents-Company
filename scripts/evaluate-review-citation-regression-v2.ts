import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Store } from '../src/server/store';
import { infer } from '../src/server/providers';
import { reserveRequest, remainingRequestBudget, RequestBudgetError } from '../src/server/operations';
import { semanticReviewSchema, reviewPacket, reviewConfirmationPacket, reviewToolFor, validateReview } from '../src/server/semanticReview';

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const packetPath = 'docs/test-plans/fresh-review-packet-02.md';
const labelsPath = 'docs/evaluations/2026-09-22-fresh-review-human-adjudication.json';
const baselineSummaryPath = 'docs/evaluations/2026-09-22-fresh-review-02-summary.json';
const preparationPath = 'docs/evaluations/2026-09-22-fresh-review-preparation.json';
const model = 'qwen3.5:9b';
const endpoint = 'http://127.0.0.1:11434';
const [mode, filename] = process.argv.slice(2);
if (!['--prepare', '--run'].includes(mode) || !filename?.endsWith('.json')) throw Error('Use --prepare new-manifest.json or --run manifest.json');
function sourceHashes() {
  const files: string[] = [];
  const visit = (dir: string) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) visit(f); else files.push(f); } };
  visit('src');
  files.push('server.ts', 'package.json', 'package-lock.json', 'scripts/evaluate-human-reviewed-packet.ts', 'scripts/evaluate-review-citation-regression-v2.ts');
  return Object.fromEntries(files.sort().map(f => [f, sha(fs.readFileSync(f))]));
}
async function modelIdentity() {
  const res = await fetch(endpoint + '/api/tags', { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw Error('Model discovery failed');
  const tags: any = await res.json();
  const item = tags.models?.find((m: any) => m.name === model);
  if (!item?.digest) throw Error('Existing model unavailable');
  return { name: model, digest: item.digest };
}
function intake() {
  const prep = JSON.parse(fs.readFileSync(preparationPath, 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(baselineSummaryPath, 'utf8'));
  if (sha(fs.readFileSync(baseline.manifestPath)) !== baseline.manifestSha256 || sha(fs.readFileSync(baseline.rawResultsPath)) !== baseline.rawResultsSha256) throw Error('Original evidence changed');
  for (const [f, hash] of Object.entries(prep.sourceHashesBeforeCaseCreation)) if (!['src/server/semanticReview.ts','src/server/providers.ts','src/server/swarm.ts'].includes(f) && sha(fs.readFileSync(f)) !== hash) throw Error('Unrelated pre-authoring source changed: ' + f);
  for (const [f, hash] of Object.entries(prep.artifactHashes)) if (sha(fs.readFileSync(f)) !== hash) throw Error('Prepared artifact changed: ' + f);
  const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
  if (labels.status !== 'HUMAN_LABELS_RECORDED' || labels.packet.sha256 !== sha(fs.readFileSync(packetPath))) throw Error('Human adjudication not bound to packet');
  const sections = fs.readFileSync(packetPath, 'utf8').split(/^## /m).slice(1);
  const cases = sections.map(section => {
    const match = /^(F\d{2})\n\nSource: ([\s\S]*?)\n\nReport: ([\s\S]*?)\n\nCriterion: ([\s\S]*?)\n\nJudgment:/.exec(section);
    if (!match) throw Error('Invalid case section');
    const [, id, source, report, criterion] = match;
    const matches = labels.judgments.filter((j: any) => j.caseId === id);
    if (matches.length !== 1 || !['supported', 'unsupported'].includes(matches[0].verdict) || !matches[0].reason?.trim()) throw Error('Incomplete or ambiguous human label');
    return { id, source, report, criterion, expected: matches[0].verdict === 'supported' };
  });
  if (cases.length !== 6 || new Set(cases.map(c => c.id)).size !== 6 || labels.judgments.length !== 6 || cases.filter(c => c.expected).length !== 3) throw Error('Require six unique cases and three supported controls');
  return cases;
}
function makePacket(c: ReturnType<typeof intake>[number]) {
  const policy = semanticReviewSchema.parse({ reviewerId: 'reviewer', criteria: [c.criterion], inputNames: ['source.txt'], outputNames: ['report.txt'] });
  const files = [['source.txt', c.source], ['report.txt', c.report]].map(([name, text]) => ({ name, id: `${c.id}-${name}`, mime: 'text/plain', version: 1, sha256: sha(text), base64: Buffer.from(text).toString('base64'), runId: 'review-run' }));
  const workspace = { file: (_project: string, name: string) => files.find(f => f.name === name) } as any;
  const packet = reviewPacket(workspace, { id: 'review-run', projectId: 'p', objective: 'Assess source support', semanticReview: policy } as any, 'Review the report.');
  return { policy, packet };
}
const cases = intake();
if (mode === '--prepare') {
  const declaration = { sourceHashes: sourceHashes(), artifactHashes: Object.fromEntries([packetPath, labelsPath, preparationPath, baselineSummaryPath].map(f => [f, sha(fs.readFileSync(f))])), model: await modelIdentity(), endpoint, temperature: 0, maxTokens: 1536, timeoutMs: 90000, maximumCalls: 12,
    cases: cases.map(c => ({ ...c, ...makePacket(c) })),
    acceptance: { maximumFalseAcceptances: 0, requiredTrueAcceptances: 3, maximumErrors: 0 },
    scope: 'Citation-responsibility plus required submit_review candidate; six exposed Codex-authored, owner-adjudicated cases. Development regression only, NOT unseen qualification. Only semanticReview.ts, providers.ts and swarm.ts may differ from the pre-authoring candidate snapshot; all current source and this driver frozen before inference. Original failed run hash-verified and preserved. No retries or tuning within this campaign.' };
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, JSON.stringify({ createdAt: new Date().toISOString(), declarationHash: sha(JSON.stringify(declaration)), declaration }, null, 2), { flag: 'wx' });
  console.log('Frozen ' + filename);
} else {
  const manifest = JSON.parse(fs.readFileSync(filename, 'utf8')), d = manifest.declaration;
  const frozen = async () => {
    if (sha(JSON.stringify(d)) !== manifest.declarationHash || JSON.stringify(sourceHashes()) !== JSON.stringify(d.sourceHashes)) throw Error('Frozen source/declaration drift');
    for (const [f, hash] of Object.entries(d.artifactHashes)) if (sha(fs.readFileSync(f)) !== hash) throw Error('Frozen artifact drift');
    if (JSON.stringify(await modelIdentity()) !== JSON.stringify(d.model)) throw Error('Model digest changed');
  };
  await frozen();
  const output = filename.replace(/\.json$/, '-results.json');
  const report: any = { startedAt: new Date().toISOString(), manifestHash: sha(fs.readFileSync(filename)), model: d.model, scope: d.scope, calls: 0, trials: [], status: 'preflight' };
  fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2));
  const store = new Store(path.resolve('data'));
  try {
    report.admission = remainingRequestBudget(store, 'inference'); save();
    if (report.admission.remaining !== null && report.admission.remaining < d.maximumCalls) throw Error('Insufficient shared inference allowance');
    report.status = 'running'; save();
    for (const c of d.cases) {
      await frozen();
      const start = Date.now(), trial: any = { id: c.id, expected: c.expected, packetHash: c.packet.packetHash, stages: [] };
      report.trials.push(trial); save();
      try {
        for (const stage of ['assessment', 'confirmation']) {
          if (stage === 'confirmation' && !trial.stages[0].validated.passed) break;
          await frozen();
          const packet = stage === 'assessment' ? c.packet : reviewConfirmationPacket(c.packet, c.policy, trial.stages[0].validated);
          if (report.calls >= d.maximumCalls) throw Error('Campaign allowance exhausted');
          const reservation = reserveRequest(store, 'inference');
          const item: any = { stage, packetHash: packet.packetHash, reservation, status: 'dispatched', startedAt: new Date().toISOString() };
          trial.stages.push(item); report.calls++; save();
          const response = await infer({ provider: 'ollama', model, endpoint, temperature: d.temperature, maxTokens: d.maxTokens, allowFinal: false, requiredTool: 'submit_review' }, packet.messages, AbortSignal.timeout(d.timeoutMs), [reviewToolFor(c.policy, c.packet.files)]);
          item.receipt = response.receipt; item.decision = response.decision; item.status = 'received'; save();
          if (response.decision.action !== 'tool' || response.decision.toolId !== 'submit_review') throw Error('No structured review');
          item.validated = validateReview(response.decision.parameters, c.policy, c.packet.files); item.status = 'validated'; save();
        }
        trial.accepted = trial.stages.length === 2 && trial.stages.every((s: any) => s.validated?.passed);
        trial.correct = trial.accepted === c.expected;
      } catch (e) {
        trial.error = e instanceof Error ? e.message : String(e); trial.correct = false;
        if (e instanceof RequestBudgetError) throw e;
      } finally {
        trial.durationMs = Date.now() - start; save();
        console.log(JSON.stringify({ id: trial.id, expected: trial.expected, accepted: trial.accepted, error: trial.error, durationMs: trial.durationMs }));
      }
    }
    await frozen();
    const falseAcceptances = report.trials.filter((t: any) => !t.expected && t.accepted).length;
    const trueAcceptances = report.trials.filter((t: any) => t.expected && t.accepted).length;
    const errors = report.trials.filter((t: any) => t.error).length;
    report.summary = { total: report.trials.length, falseAcceptances, trueAcceptances, errors, passed: report.trials.length === 6 && falseAcceptances === 0 && trueAcceptances === 3 && errors === 0 };
    report.status = 'finished'; report.completedAt = new Date().toISOString(); report.budgetAfter = remainingRequestBudget(store, 'inference'); save();
    console.log(JSON.stringify(report.summary));
  } catch (e) { report.status = 'blocked'; report.error = e instanceof Error ? e.message : String(e); save(); throw e; }
  finally { store.close(); }
}
