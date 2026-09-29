import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import claudeSkills from '../data/claudeSkills.json';
import inventory from '../../docs/skill-inventory.json';
import { Store } from './store';
import { HttpError, now, uid } from './security';

type SourceSkill = (typeof claudeSkills)[number];
type InventorySkill = (typeof inventory.skills)[number];

export type SkillCatalogDecision = {
  id: string;
  workspaceId: string;
  skillId: string;
  version: number;
  action: 'enabled' | 'disabled';
  reason: string;
  expectedSha256: string;
  decidedBy: 'workspace-owner';
  createdAt: string;
};

export type CatalogSkill = SourceSkill & {
  sha256: string;
  origin: string;
  upstreamRevision: string;
  licenseNotices: string[];
  inventoriedScripts: InventorySkill['scripts'];
  documentationStatus: 'enabled' | 'disabled';
  executableStatus: 'disabled';
  requiredCapabilities: string;
  validation: string;
  currentDecision?: SkillCatalogDecision;
};

const hexSha256 = /^[a-f0-9]{64}$/;

export class SkillCatalog {
  private readonly entries: Map<string, CatalogSkill>;

  constructor(private readonly store: Store, private readonly workspaceId = 'ws-default', private readonly repositoryRoot = process.cwd()) {
    const byPath = new Map((inventory.skills as InventorySkill[]).map(item => [item.path, item]));
    this.entries = new Map((claudeSkills as SourceSkill[]).flatMap(source => {
      const item = byPath.get(source.skillPath);
      if (!item) return [];
      const currentDecision = this.latestDecision(source.id);
      const value: CatalogSkill = {
        ...source,
        sha256: item.sha256,
        origin: item.origin,
        upstreamRevision: item.upstreamRevision,
        licenseNotices: item.licenseNotices,
        inventoriedScripts: item.scripts,
        documentationStatus: currentDecision?.action === 'enabled' ? 'enabled' : 'disabled',
        executableStatus: 'disabled',
        requiredCapabilities: item.requiredCapabilities,
        validation: item.validation,
        currentDecision,
      };
      return [[source.id, value] as const];
    }));
  }

  list(input: { search?: string; category?: string; status?: string; limit?: number; offset?: number } = {}) {
    const search = input.search?.trim().toLocaleLowerCase() || '';
    const category = input.category?.trim() || '';
    const status = input.status?.trim() || '';
    const limit = Math.min(Math.max(input.limit || 50, 1), 100);
    const offset = Math.max(input.offset || 0, 0);
    const decisions = new Map<string, SkillCatalogDecision>();
    for (const decision of this.store.all<SkillCatalogDecision>('skill-catalog-decisions').filter(item => item.workspaceId === this.workspaceId)) {
      if (!decisions.has(decision.skillId) || decisions.get(decision.skillId)!.version < decision.version) decisions.set(decision.skillId, decision);
    }
    const current = [...this.entries.values()].map(item => {
      const currentDecision = decisions.get(item.id);
      return { ...item, documentationStatus: (currentDecision?.action === 'enabled' ? 'enabled' : 'disabled') as 'enabled' | 'disabled', currentDecision };
    });
    const matches = current.filter(item =>
      (!search || `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase().includes(search)) &&
      (!category || item.category === category) &&
      (!status || item.documentationStatus === status)
    ).sort((a, b) => a.name.localeCompare(b.name));
    return {
      items: matches.slice(offset, offset + limit), total: matches.length, limit, offset,
      categories: [...new Set(current.map(item => item.category))].sort(),
      policy: {
        documentationActivationOnly: true,
        executableSkillsEnabled: 0,
        executablePolicy: 'Vendored scripts remain disabled. Activation does not grant execution authority.',
      },
    };
  }

  get(skillId: string): CatalogSkill & { content: string } {
    const item = this.entries.get(skillId);
    if (!item) throw new HttpError(404, 'Catalog skill not found');
    const currentDecision = this.latestDecision(skillId);
    return { ...item, documentationStatus: currentDecision?.action === 'enabled' ? 'enabled' : 'disabled', currentDecision, content: this.verifyVendoredContent(item) };
  }

  history(skillId: string): SkillCatalogDecision[] {
    this.getWithoutHistory(skillId);
    return this.store.all<SkillCatalogDecision>('skill-catalog-decisions')
      .filter(decision => decision.workspaceId === this.workspaceId && decision.skillId === skillId)
      .sort((a, b) => a.version - b.version);
  }

  decide(skillId: string, input: { action: 'enabled' | 'disabled'; expectedSha256: string; reason: string }) {
    const item = this.getWithoutHistory(skillId);
    const expected = input.expectedSha256?.trim().toLocaleLowerCase();
    const reason = input.reason?.trim();
    if (!hexSha256.test(expected || '')) throw new HttpError(422, 'A valid expected SHA-256 is required');
    if (expected !== item.sha256) throw new HttpError(409, 'Skill content changed; review the current hash before deciding');
    if (!reason || reason.length < 8 || reason.length > 1000) throw new HttpError(422, 'Decision reason must be 8 to 1000 characters');
    this.verifyVendoredContent(item);
    const previous = this.latestDecision(skillId);
    const decision: SkillCatalogDecision = {
      id: uid(), workspaceId: this.workspaceId, skillId, version: (previous?.version || 0) + 1,
      action: input.action, reason, expectedSha256: expected, decidedBy: 'workspace-owner', createdAt: now(),
    };
    this.store.put('skill-catalog-decisions', decision.id, decision);
    return this.get(skillId);
  }

  private getWithoutHistory(skillId: string) {
    const item = this.entries.get(skillId);
    if (!item) throw new HttpError(404, 'Catalog skill not found');
    return item;
  }

  private latestDecision(skillId: string) {
    return this.store.all<SkillCatalogDecision>('skill-catalog-decisions')
      .filter(decision => decision.workspaceId === this.workspaceId && decision.skillId === skillId)
      .sort((a, b) => b.version - a.version)[0];
  }

  private verifyVendoredContent(item: CatalogSkill) {
    const root = fs.realpathSync(this.repositoryRoot);
    const candidate = path.resolve(root, item.skillPath);
    if (!candidate.startsWith(`${root}${path.sep}`)) throw new HttpError(422, 'Catalog path escaped the repository');
    let stat: fs.Stats;
    try { stat = fs.lstatSync(candidate); } catch { throw new HttpError(409, 'Vendored skill file is missing'); }
    if (!stat.isFile() || stat.isSymbolicLink()) throw new HttpError(409, 'Vendored skill must be a regular non-symlink file');
    if (!fs.realpathSync(candidate).startsWith(`${root}${path.sep}`)) throw new HttpError(409, 'Vendored skill resolved outside the repository');
    if (stat.size > 100_000) throw new HttpError(409, 'Vendored skill document exceeds the review limit');
    const content = fs.readFileSync(candidate);
    const actual = crypto.createHash('sha256').update(content).digest('hex');
    if (actual !== item.sha256) throw new HttpError(409, 'Vendored skill bytes do not match the reviewed inventory');
    return content.toString('utf8');
  }
}
