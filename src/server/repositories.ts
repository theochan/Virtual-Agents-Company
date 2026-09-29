import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import type { Store } from './store';
import { now, uid } from './security';

const label = z.string().trim().min(1).max(120);
const identifier = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const baseRef = z.string().trim().min(1).max(200).refine(value =>
  !value.startsWith('-') && !/[\s~^:?*[\\]/.test(value) && !value.includes('..') && !value.includes('@{'),
  'Use a simple Git branch, tag, or commit ref');

export const repositoryRegistrationSchema = z.object({ name: label, rootPath: z.string().trim().min(1).max(4000) }).strict();
export const worktreeCreateSchema = z.object({ runId: identifier, nodeId: identifier, baseRef: baseRef.default('HEAD') }).strict();
export const worktreeGcSchema = z.object({ expectedHead: z.string().regex(/^[0-9a-f]{40}$/) }).strict();

export type RegisteredRepository = {
  id: string; workspaceId: string; name: string; rootPath: string; rootRealPath: string;
  registeredHead: string; dirtyAtRegistration: boolean; status: 'active'|'disabled';
  createdAt: string; updatedAt: string;
};

export type RepositoryWorktree = {
  id: string; workspaceId: string; repositoryId: string; runId: string; nodeId: string;
  path: string; branch: string; baseRef: string; baseCommit: string; headCommit: string;
  status: 'active'|'retained'|'ready_for_gc'|'removed'; dirty: boolean;
  createdAt: string; updatedAt: string; removedAt?: string;
};

type WorktreeInspection = RepositoryWorktree & {
  changedPaths: string[]; porcelain: string; patch: string; patchSha256: string;
};

const gitEnvironment = () => ({
  PATH: process.env.PATH || '/usr/bin:/bin',
  HOME: os.tmpdir(),
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: '/usr/bin/false',
  SSH_ASKPASS: '/usr/bin/false',
});

function git(cwd: string, args: string[], maxBuffer = 2_000_000) {
  return execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'protocol.file.allow=never', ...args], {
    cwd, env: gitEnvironment(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer,
  }).trim();
}

function isWithin(parent: string, candidate: string) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function rejectUnsafeRepositoryConfiguration(root: string) {
  if (fs.existsSync(path.join(root, '.gitmodules'))) throw new Error('Repositories with submodules are not supported');
  for (const key of ['core.hooksPath', 'core.worktree', 'core.fsmonitor', 'include.path']) {
    try {
      const value = git(root, ['config', '--local', '--get', key]);
      if (value) throw new Error(`Unsafe local Git configuration: ${key}`);
    } catch (error: any) {
      if (String(error?.message || '').startsWith('Unsafe local Git configuration:')) throw error;
      if (error?.status !== 1) throw error;
    }
  }
  try {
    const conditional = git(root, ['config', '--local', '--get-regexp', '^includeIf\\.']);
    if (conditional) throw new Error('Unsafe conditional Git include configuration');
  } catch (error: any) {
    if (String(error?.message || '').startsWith('Unsafe conditional')) throw error;
    if (error?.status !== 1) throw error;
  }
}

export class RepositoryWorkspaceManager {
  worktreeRoot: string;
  constructor(readonly store: Store, worktreeRoot = process.env.VAC_WORKTREE_ROOT || path.join(os.homedir(), '.vac', 'worktrees')) {
    this.worktreeRoot = prospectiveRealPath(path.resolve(worktreeRoot));
  }

  repositories() { return this.store.all<RegisteredRepository>('git-repositories').filter(value => value.workspaceId === 'ws-default'); }
  worktrees(repositoryId?: string) { return this.store.all<RepositoryWorktree>('git-worktrees').filter(value => value.workspaceId === 'ws-default' && (!repositoryId || value.repositoryId === repositoryId)); }

  repository(id: string) {
    const value = this.store.get<RegisteredRepository>('git-repositories', id);
    if (!value || value.workspaceId !== 'ws-default') throw new Error('Repository not found');
    return value;
  }

  worktree(id: string) {
    const value = this.store.get<RepositoryWorktree>('git-worktrees', id);
    if (!value || value.workspaceId !== 'ws-default') throw new Error('Repository worktree not found');
    return value;
  }

  register(raw: unknown) {
    const input = repositoryRegistrationSchema.parse(raw);
    if (!path.isAbsolute(input.rootPath)) throw new Error('Repository path must be absolute');
    const stat = fs.lstatSync(input.rootPath);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Repository root must be a real directory, not a symlink');
    const rootRealPath = fs.realpathSync.native(input.rootPath);
    const topLevel = fs.realpathSync.native(git(rootRealPath, ['rev-parse', '--show-toplevel']));
    if (topLevel !== rootRealPath) throw new Error('Register the exact Git top-level directory');
    if (isWithin(rootRealPath, this.worktreeRoot) || isWithin(this.worktreeRoot, rootRealPath)) throw new Error('VAC worktree storage and registered repositories must not overlap');
    rejectUnsafeRepositoryConfiguration(rootRealPath);
    if (this.repositories().some(value => value.rootRealPath === rootRealPath)) throw new Error('Repository is already registered');
    const value: RegisteredRepository = {
      id: uid(), workspaceId: 'ws-default', name: input.name, rootPath: input.rootPath,
      rootRealPath, registeredHead: git(rootRealPath, ['rev-parse', 'HEAD']),
      dirtyAtRegistration: Boolean(git(rootRealPath, ['status', '--porcelain=v1', '--untracked-files=all'])),
      status: 'active', createdAt: now(), updatedAt: now(),
    };
    this.store.put('git-repositories', value.id, value);
    return value;
  }

  createWorktree(repositoryId: string, raw: unknown) {
    fs.mkdirSync(this.worktreeRoot, { recursive: true, mode: 0o700 });
    fs.chmodSync(this.worktreeRoot, 0o700);
    const canonicalRoot = fs.realpathSync.native(this.worktreeRoot);
    if (canonicalRoot !== this.worktreeRoot) throw new Error('Managed worktree root resolved to an unexpected location');
    const repository = this.repository(repositoryId);
    if (repository.status !== 'active') throw new Error('Repository is disabled');
    rejectUnsafeRepositoryConfiguration(repository.rootRealPath);
    const input = worktreeCreateSchema.parse(raw);
    if (this.worktrees(repositoryId).some(value => value.runId === input.runId && value.nodeId === input.nodeId && value.status !== 'removed')) throw new Error('This run node already owns a worktree');
    const baseCommit = git(repository.rootRealPath, ['rev-parse', '--verify', `${input.baseRef}^{commit}`]);
    const id = uid();
    const branch = `vac/${input.runId}/${input.nodeId}/${id.slice(0, 8)}`;
    git(repository.rootRealPath, ['check-ref-format', '--branch', branch]);
    const repositoryDirectory = path.join(this.worktreeRoot, repository.id);
    fs.mkdirSync(repositoryDirectory, { recursive: true, mode: 0o700 });
    const target = path.join(repositoryDirectory, id);
    if (!isWithin(this.worktreeRoot, target) || fs.existsSync(target)) throw new Error('Unsafe or occupied worktree target');
    try {
      git(repository.rootRealPath, ['worktree', 'add', '--no-track', '-b', branch, target, baseCommit]);
      const realTarget = fs.realpathSync.native(target);
      if (!isWithin(this.worktreeRoot, realTarget)) throw new Error('Created worktree escaped managed storage');
      const value: RepositoryWorktree = {
        id, workspaceId: 'ws-default', repositoryId, runId: input.runId, nodeId: input.nodeId,
        path: realTarget, branch, baseRef: input.baseRef, baseCommit, headCommit: git(realTarget, ['rev-parse', 'HEAD']),
        status: 'active', dirty: false, createdAt: now(), updatedAt: now(),
      };
      this.store.put('git-worktrees', id, value);
      return value;
    } catch (error) {
      try { if (fs.existsSync(target)) git(repository.rootRealPath, ['worktree', 'remove', target]); } catch {}
      try { git(repository.rootRealPath, ['branch', '-D', branch]); } catch {}
      throw error;
    }
  }

  inspect(id: string): WorktreeInspection {
    const value = this.worktree(id);
    if (value.status === 'removed') return { ...value, changedPaths: [], porcelain: '', patch: '', patchSha256: crypto.createHash('sha256').update('').digest('hex') };
    const realPath = fs.realpathSync.native(value.path);
    if (realPath !== value.path || !isWithin(this.worktreeRoot, realPath)) throw new Error('Worktree path no longer matches its managed identity');
    const headCommit = git(realPath, ['rev-parse', 'HEAD']);
    const porcelain = git(realPath, ['status', '--porcelain=v1', '--untracked-files=all', '-z']);
    const entries = parsePorcelain(porcelain);
    const changedPaths = entries.map(entry => entry.path).sort();
    const trackedPatch = git(realPath, ['diff', '--binary', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', 'HEAD']);
    const untracked = entries.filter(entry => entry.status === '??');
    const untrackedSummary = untracked.map(entry => {
      const candidate = path.resolve(realPath, entry.path);
      if (!isWithin(realPath, candidate)) throw new Error('Git reported a path outside the worktree');
      const stat = fs.lstatSync(candidate);
      if (stat.isSymbolicLink()) throw new Error('Untracked symbolic links are not accepted as evidence');
      if (!stat.isFile()) return `UNTRACKED ${entry.path} type=non-file`;
      if (stat.size > 1_000_000) return `UNTRACKED ${entry.path} size=${stat.size} sha256=not-read-over-limit`;
      return `UNTRACKED ${entry.path} size=${stat.size} sha256=${crypto.createHash('sha256').update(fs.readFileSync(candidate)).digest('hex')}`;
    }).join('\n');
    const patch = [trackedPatch, untrackedSummary].filter(Boolean).join('\n');
    const updated = { ...value, headCommit, dirty: Boolean(porcelain), updatedAt: now() };
    this.store.put('git-worktrees', id, updated);
    return { ...updated, changedPaths, porcelain, patch, patchSha256: crypto.createHash('sha256').update(patch).digest('hex') };
  }

  retain(id: string) {
    const inspected = this.inspect(id);
    if (inspected.status === 'removed') throw new Error('Removed worktrees cannot be retained');
    const value: RepositoryWorktree = { ...inspected, status: 'retained', updatedAt: now() };
    this.store.put('git-worktrees', id, value);
    return value;
  }

  markReadyForGc(id: string) {
    const inspected = this.inspect(id);
    if (inspected.dirty) throw new Error('Dirty worktrees must be retained; cleanup is refused');
    if (inspected.status === 'removed') throw new Error('Worktree is already removed');
    const value: RepositoryWorktree = { ...inspected, status: 'ready_for_gc', updatedAt: now() };
    this.store.put('git-worktrees', id, value);
    return value;
  }

  gc(id: string, raw: unknown) {
    const input = worktreeGcSchema.parse(raw);
    const inspected = this.inspect(id);
    if (inspected.status !== 'ready_for_gc') throw new Error('Worktree is not approved for garbage collection');
    if (inspected.dirty) throw new Error('Dirty worktrees cannot be removed');
    if (inspected.headCommit !== input.expectedHead) throw new Error('Worktree head changed; review it again');
    const repository = this.repository(inspected.repositoryId);
    git(repository.rootRealPath, ['worktree', 'remove', inspected.path]);
    const value: RepositoryWorktree = { ...inspected, status: 'removed', dirty: false, removedAt: now(), updatedAt: now() };
    this.store.put('git-worktrees', id, value);
    return value;
  }
}

function prospectiveRealPath(candidate: string) {
  const suffix: string[] = [];
  let parent = candidate;
  while (!fs.existsSync(parent)) { suffix.unshift(path.basename(parent)); const next = path.dirname(parent); if (next === parent) break; parent = next; }
  return path.join(fs.realpathSync.native(parent), ...suffix);
}

function parsePorcelain(porcelain: string) {
  const records = porcelain.split('\0').filter(Boolean);
  const entries: {status:string;path:string}[] = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    const status = record.slice(0, 2);
    const filePath = record.slice(3);
    if (!filePath || path.isAbsolute(filePath) || filePath.split(/[\\/]/).includes('..')) throw new Error('Git returned an unsafe worktree path');
    entries.push({status,path:filePath});
    if (status.includes('R') || status.includes('C')) index++;
  }
  return entries;
}
