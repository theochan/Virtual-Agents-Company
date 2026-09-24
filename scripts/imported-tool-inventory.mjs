import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const approved=JSON.parse(fs.readFileSync('src/server/importedMeetingCost.json','utf8'));
if(hash(fs.readFileSync(approved.path))!==approved.sha256 || hash(approved.source)!==approved.sha256)
  throw new Error('Reviewed imported source drift: requalification required');
if(fs.readFileSync('claude-skills/LICENSE','utf8')!==approved.licenseText)
  throw new Error('Reviewed license drift');
const paths=execFileSync('git',['ls-files','-z','--','claude-skills'],{encoding:'utf8'}).split('\0')
  .filter(p=>/\.(py|sh|js|mjs|cjs|ts)$/.test(p)).sort();
const scripts=paths.map(path=>({path,sha256:hash(fs.readFileSync(path)),upstreamRevision:approved.upstreamRevision,
  admission:path===approved.path?'qualified':'denied-unreviewed',
  license:path===approved.path?'MIT; bundled complete notice':'unreviewed; no admission',
  inputs:path===approved.path?'Strict numeric and boolean schema in importedTools.ts':'unreviewed',
  outputs:path===approved.path?'meeting-cost.json; validated input echo, arithmetic and verdict':'unreviewed',
  dependencies:path===approved.path?['Python stdlib argparse, json, sys, typing']:['unreviewed'],
  sideEffects:path===approved.path?['Sandbox-local output file only']:['unreviewed'],
}));
const result={schemaVersion:1,sourceRevisionMeaning:'Vendored snapshot recorded by existing skill inventory; per-file hashes identify exact bytes',
  policy:'Deny by default. Only literal tool IDs and bundled reviewed bytes can enter the imported-tool adapter. General owner-granted code sandbox remains separately available.',
  qualifiedTools:[approved.id],scripts};
const target='docs/imported-tool-inventory.json';
if(process.argv.includes('--check')) {
  if(fs.readFileSync(target,'utf8')!==JSON.stringify(result,null,2)+'\n')throw new Error('Imported tool inventory stale');
} else fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
console.log(`${scripts.length} scripts inventoried; 1 qualified, ${scripts.length-1} denied`);
