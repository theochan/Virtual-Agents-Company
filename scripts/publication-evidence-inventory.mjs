import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'docs/evaluations/2026-09-24-frozen-publication-inventory.json');
const files = [
  'docs/evaluations/2026-09-22-fresh-review-02-summary.json',
  'docs/evaluations/2026-09-22-fresh-review-answer-key.json',
  'docs/evaluations/2026-09-22-fresh-review-human-adjudication.json',
  'docs/evaluations/2026-09-22-fresh-review-preparation.json',
  'docs/evaluations/2026-09-22-human-accounting-adjudication.json',
  'docs/evaluations/2026-09-22-review-citation-regressions-summary.json',
  'docs/evaluations/2026-09-22-reviewer-models-summary.json',
  'docs/evaluations/2026-09-23-advantage-prior-failures.json',
  'docs/evaluations/2026-09-23-change-log-frozen-confirmation.json',
  'docs/evaluations/2026-09-23-change-log-v2-summary.json',
  'docs/evaluations/2026-09-23-change-log-v3-summary.json',
  'docs/evaluations/2026-09-23-e2e-accounting-summary.json',
  'docs/evaluations/2026-09-23-e2e-ai-verification.json',
  'docs/evaluations/2026-09-23-e2e-oracle.json',
  'docs/evaluations/2026-09-23-e2e-owner-mapping.json',
  'docs/evaluations/2026-09-23-e2e-owner-packet/A.json',
  'docs/evaluations/2026-09-23-e2e-owner-packet/B.json',
  'docs/evaluations/2026-09-23-e2e-owner-packet/C.json',
  'docs/evaluations/2026-09-23-e2e-preparation.json',
  'docs/evaluations/2026-09-23-rubric-review-03-summary.json',
  'docs/evaluations/2026-09-23-rubric-review-answer-key.json',
  'docs/evaluations/2026-09-23-rubric-review-human-adjudication.json',
  'docs/evaluations/2026-09-23-rubric-review-preparation.json',
  'docs/evaluations/2026-09-23-swarm-advantage-evidence.json',
];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const forbidden = [
  /\/(?:Users|home)\/[A-Za-z0-9_.-]+\//,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
];
const classify = file => file.includes('owner-packet/') ? 'synthetic-source-packet'
  : /human-adjudication|answer-key/.test(file) ? 'synthetic-adjudication-record'
  : file.endsWith('swarm-advantage-evidence.json') ? 'synthetic-evaluation-evidence'
  : 'synthetic-evaluation-summary';

const artifacts = files.map(file => {
  const value = fs.readFileSync(path.join(root, file));
  const text = value.toString('utf8');
  const match = forbidden.find(pattern => pattern.test(text));
  if (match) throw new Error(`${file}: forbidden private or credential pattern`);
  JSON.parse(text);
  return { path: file, sha256: sha256(value), bytes: value.byteLength, classification: classify(file) };
});
const inventory = {
  publication: {
    kind: 'sanitized-summary',
    note: 'Exact-hash admission list for frozen synthetic evaluation artifacts. No real customer data, credentials, private paths or production provider payloads are included.',
  },
  date: '2026-09-24',
  policy: 'Listed artifacts are immutable synthetic evidence. Any byte change requires explicit regeneration and publication review.',
  artifacts,
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(output, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, output)} for ${artifacts.length} frozen synthetic artifacts.`);
} else {
  if (!fs.existsSync(output) || JSON.stringify(JSON.parse(fs.readFileSync(output, 'utf8'))) !== JSON.stringify(inventory)) {
    console.error('Frozen publication evidence inventory is missing or has drifted; inspect and regenerate deliberately.');
    process.exit(1);
  }
  console.log(`Frozen publication evidence verified: ${artifacts.length} exact synthetic artifacts.`);
}
