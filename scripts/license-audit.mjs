import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(root, 'docs/evaluations/2026-09-24-license-inventory.json');
const vendorCommit = '19392f7a08264ed00486a251f5b2098321771f94';
const localImportCommit = '3b5322f6375157a91b4a56274fac0e06e4f8bf2a';
const allowedLicenses = new Set(['0BSD', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'CC-BY-4.0', 'ISC', 'MIT', 'MPL-2.0']);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const trackedPayload = file => {
  const absolute = path.join(root, file);
  return fs.lstatSync(absolute).isSymbolicLink() ? Buffer.from(fs.readlinkSync(absolute)) : fs.readFileSync(absolute);
};
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

function vendorFiles() {
  return git(['ls-files', '-z', '--', 'claude-skills']).split('\0').filter(Boolean);
}

function licenseFiles(files) {
  return files.filter(file => /\/(?:license|licence|copying|notice)(?:\.[^/]*)?$/i.test(file)).map(file => ({
    path: file,
    sha256: hash(read(file)),
    bytes: read(file).byteLength,
  }));
}

function packageName(packagePath) {
  const parts = packagePath.split('/node_modules/').at(-1).split('/');
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

function packages() {
  const lock = JSON.parse(read('package-lock.json'));
  return Object.entries(lock.packages)
    .filter(([packagePath]) => packagePath.startsWith('node_modules/'))
    .map(([packagePath, value]) => ({
      path: packagePath,
      name: packageName(packagePath),
      version: value.version,
      license: value.license,
      developmentOnly: value.dev === true,
      optional: value.optional === true,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function installedLicenseFiles(packagePath) {
  const directory = path.join(root, packagePath);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter(name => /^(?:license|licence|copying|notice)(?:\.|$)/i.test(name))
    .sort()
    .map(name => {
      const file = path.join(packagePath, name);
      return { path: file, sha256: hash(read(file)), bytes: read(file).byteLength };
    });
}

function currentInventory() {
  const files = vendorFiles();
  const dependencies = packages();
  const project = JSON.parse(read('package.json'));
  const directNames = [...new Set([...Object.keys(project.dependencies || {}), ...Object.keys(project.devDependencies || {})])].sort();
  const licenseSet = [...new Set(dependencies.map(entry => entry.license))].sort();
  const unknown = dependencies.filter(entry => !entry.license || !allowedLicenses.has(entry.license));
  const portraitSource = read('src/lib/avatarCatalog.ts').toString('utf8');
  const portraitIds = [...portraitSource.matchAll(/"(\d{10,}-[a-f0-9]+)"/g)].map(match => match[1]);
  const notices = licenseFiles(files);
  const directPackageLicenseTexts = directNames.map(name => {
    const entry = dependencies.find(candidate => candidate.path === `node_modules/${name}`);
    return { name, version: entry?.version, license: entry?.license, licenseFiles: installedLicenseFiles(`node_modules/${name}`) };
  });
  return {
    publication: {
      kind: 'sanitized-summary',
      note: 'Repository and dependency metadata only. No runtime data, credentials, private paths or user content.',
    },
    date: '2026-09-24',
    workItem: 'VAC-40',
    result: unknown.length ? 'blocked' : 'pass',
    legalBoundary: 'Engineering inventory and redistribution gate; not legal advice or legal certification.',
    projectLicense: { spdx: 'Apache-2.0', text: 'LICENSE', notice: 'NOTICE' },
    vendoredSources: [{
      name: 'alirezarezvani/claude-skills',
      origin: 'https://github.com/alirezarezvani/claude-skills',
      upstreamCommit: vendorCommit,
      localImportCommit,
      trackedFiles: files.length,
      treeSha256: hash(files.map(file => `${file}:${hash(trackedPayload(file))}`).join('\n')),
      licenseTexts: notices,
      distribution: 'excluded from the runtime release except the separately qualified meeting-cost-v1 source and its complete MIT notice embedded in src/server/importedMeetingCost.json',
    }],
    externalAssets: [{
      source: 'Unsplash',
      origin: 'https://images.unsplash.com',
      license: 'Unsplash License',
      licenseText: 'https://unsplash.com/license',
      exactPhotoIds: portraitIds,
      redistributed: false,
      note: 'Runtime stores URL templates only; no portrait image bytes are included in the source or release.',
    }],
    dependencies: {
      lockfile: 'package-lock.json',
      packageCount: dependencies.length,
      productionPackageCount: dependencies.filter(entry => !entry.developmentOnly).length,
      developmentOnlyPackageCount: dependencies.filter(entry => entry.developmentOnly).length,
      licenses: licenseSet,
      unknownOrDisallowed: unknown,
      packages: dependencies,
      directPackageLicenseTexts,
      transitiveLicenseTextPolicy: 'npm installs exact lockfile packages with their package-level notices; platform companion packages inherit the source package license declared in the lockfile',
      obligations: {
        noticeRetention: ['MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Apache-2.0'],
        attribution: ['CC-BY-4.0'],
        fileLevelSourceTerms: ['MPL-2.0'],
      },
    },
    releaseGate: {
      requiredFiles: ['LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'package.json', 'package-lock.json'],
      runtimeAllowlistSource: 'scripts/release.mjs',
      vendoredLibraryExcluded: true,
      unknownLicenseCount: unknown.length,
      restrictedMaterialCount: 0,
    },
  };
}

function verifyRepositoryClaims(inventory) {
  const failures = [];
  const dirtyVendor = git(['status', '--porcelain', '--', 'claude-skills']).trim();
  if (dirtyVendor) failures.push('claude-skills has changes outside the pinned imported snapshot');
  for (const file of inventory.releaseGate.requiredFiles) if (!fs.existsSync(path.join(root, file))) failures.push(`required release notice missing: ${file}`);
  const release = read('scripts/release.mjs').toString('utf8');
  for (const file of inventory.releaseGate.requiredFiles) if (!release.includes(`'${file}'`)) failures.push(`release allowlist omits ${file}`);
  const notices = read('THIRD_PARTY_NOTICES.md').toString('utf8');
  for (const value of [vendorCommit, localImportCommit, 'Unsplash License', 'MCP TypeScript SDK']) if (!notices.includes(value)) failures.push(`THIRD_PARTY_NOTICES.md omits ${value}`);
  if (inventory.vendoredSources[0].trackedFiles !== 5417) failures.push(`unexpected claude-skills file count: ${inventory.vendoredSources[0].trackedFiles}`);
  if (inventory.vendoredSources[0].licenseTexts.length !== 10) failures.push(`unexpected vendored license-text count: ${inventory.vendoredSources[0].licenseTexts.length}`);
  if (inventory.externalAssets[0].exactPhotoIds.length !== 40) failures.push(`unexpected Unsplash portrait count: ${inventory.externalAssets[0].exactPhotoIds.length}`);
  for (const entry of inventory.dependencies.directPackageLicenseTexts) if (!entry.licenseFiles.length) failures.push(`direct dependency license text missing: ${entry.name}@${entry.version}`);
  if (inventory.result !== 'pass') failures.push(`unknown or disallowed dependency licenses: ${inventory.dependencies.unknownOrDisallowed.map(value => `${value.name}@${value.version}:${value.license}`).join(', ')}`);
  return failures;
}

const inventory = currentInventory();
const failures = verifyRepositoryClaims(inventory);
if (process.argv.includes('--write')) {
  if (failures.length) throw new Error(failures.join('\n'));
  fs.writeFileSync(manifestPath, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, manifestPath)} with ${inventory.dependencies.packageCount} packages and ${inventory.vendoredSources[0].trackedFiles} vendored files.`);
} else {
  if (!fs.existsSync(manifestPath)) failures.push(`missing frozen inventory: ${path.relative(root, manifestPath)}`);
  else if (JSON.stringify(JSON.parse(fs.readFileSync(manifestPath, 'utf8'))) !== JSON.stringify(inventory)) failures.push('license inventory drift; inspect the change and regenerate deliberately with npm run license:inventory');
  if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
  console.log(`License gate passed: ${inventory.dependencies.packageCount} exact package entries, ${inventory.vendoredSources[0].trackedFiles} pinned vendor files, ${inventory.vendoredSources[0].licenseTexts.length} vendor license texts, ${inventory.externalAssets[0].exactPhotoIds.length} remote-only portraits, zero unknown/restricted items.`);
}
