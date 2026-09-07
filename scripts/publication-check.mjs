import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const failures = [];
for (const file of files) {
 if (/^(data|releases|node_modules|test-results|playwright-report)\//.test(file) || /^\.env(?!\.example$)/.test(file) || /\.(sqlite|pem|key)$/.test(file)) failures.push(`${file}: private/runtime file tracked`);
 if (file.startsWith('claude-skills/')) continue; // Unmodified upstream examples are separately inventoried and scanned.
 const content = fs.readFileSync(file, 'utf8');
 if (/\/(?:Users|home)\/[a-zA-Z0-9_.-]+\//.test(content)) failures.push(`${file}: operator-specific home path`);
 if (file.startsWith('docs/evaluations/2026-') && file.endsWith('.json') && JSON.parse(content).publication?.kind !== 'sanitized-summary') failures.push(`${file}: operational evidence requires a public summary`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Publication inventory checked: ${files.length} tracked files; no private runtime paths or unsanitized operational dumps. Run the separate full-history secret scan too.`);
