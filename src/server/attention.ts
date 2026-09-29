import type { Store } from './store';
import type { Approval, Run } from './runs';
import type { SwarmJob } from '../swarmTypes';
import { HttpError, now } from './security';

export type AttentionItem = {
  id: string;
  kind: 'approval' | 'swarm_approval' | 'blocked_run' | 'swarm_outcome' | 'semantic_review' | 'skill_draft' | 'terminal_outcome';
  sourceId: string;
  projectId?: string;
  title: string;
  detail: string;
  severity: 'urgent' | 'action' | 'info';
  createdAt: string;
  read: boolean;
  dismissible: boolean;
  sourceTab: 'runs' | 'swarm' | 'skills';
};

type AttentionState = { workspaceId: string; itemId: string; readAt?: string; dismissedAt?: string };

export class AttentionInbox {
  constructor(private readonly store: Store, private readonly workspaceId = 'ws-default') {}

  list(input: { unreadOnly?: boolean; kind?: string } = {}) {
    const state = new Map(this.store.all<AttentionState>('attention-state').filter(item => item.workspaceId === this.workspaceId).map(item => [item.itemId, item]));
    const raw: Omit<AttentionItem, 'read'>[] = [];
    for (const approval of this.store.matching<Approval>('approvals', 'status', ['pending'], 200, true)) {
      const expired = Date.parse(approval.expiresAt) < Date.now();
      raw.push({ id: `approval:${approval.id}`, kind: 'approval', sourceId: approval.id, title: expired ? 'Expired operation approval' : 'Operation approval required', detail: approval.actionSummary, severity: 'urgent', createdAt: approval.createdAt, dismissible: false, sourceTab: 'runs' });
    }
    for (const approval of this.store.matching<any>('swarm-approvals', 'status', ['pending'], 200, true)) {
      const expired = Number(approval.expiresAt) < Date.now();
      raw.push({ id: `swarm-approval:${approval.id}`, kind: 'swarm_approval', sourceId: approval.id, title: expired ? 'Expired swarm approval' : 'Swarm operation approval required', detail: `${approval.toolId} is paused before its side effect.`, severity: 'urgent', createdAt: approval.createdAt, dismissible: false, sourceTab: 'swarm' });
    }
    for (const run of this.store.matching<Run>('runs', 'status', ['blocked', 'failed'], 100, true).filter(item => item.workspaceId === this.workspaceId)) {
      raw.push({ id: `run:${run.id}:${run.status}`, kind: 'blocked_run', sourceId: run.id, projectId: run.projectId, title: `Run ${run.status}`, detail: (run.result || run.title || 'Review retained evidence.').slice(0, 500), severity: 'action', createdAt: run.completedAt || run.createdAt, dismissible: true, sourceTab: 'runs' });
    }
    for (const job of this.store.matching<SwarmJob>('swarms', 'status', ['blocked', 'partial', 'failed', 'budget_exhausted', 'completed', 'cancelled'], 100, true).filter(item => item.workspaceId === this.workspaceId)) {
      if (['blocked', 'partial', 'failed', 'budget_exhausted', 'completed'].includes(job.status)) raw.push({ id: `swarm:${job.id}:${job.status}`, kind: 'swarm_outcome', sourceId: job.id, projectId: job.projectId, title: `Swarm ${job.status.replace('_', ' ')}`, detail: (job.result || job.objective).slice(0, 500), severity: job.status === 'completed' ? 'info' : 'action', createdAt: job.completedAt || job.createdAt, dismissible: true, sourceTab: 'swarm' });
      const reviewed = this.store.matching<any>('semantic-adjudications', 'rootId', [job.id], 1).length > 0;
      if (!reviewed && !['queued', 'working', 'waiting_children', 'waiting_approval'].includes(job.status) && job.semanticReviewResult?.evidence?.length) raw.push({ id: `semantic-review:${job.id}`, kind: 'semantic_review', sourceId: job.id, projectId: job.projectId, title: 'Owner semantic review required', detail: 'Machine review evidence is ready for an independent owner judgment.', severity: 'action', createdAt: job.completedAt || job.createdAt, dismissible: false, sourceTab: 'swarm' });
    }
    for (const draft of this.store.matching<any>('swarm-skill-drafts', 'status', ['draft'], 100, true)) raw.push({ id: `skill-draft:${draft.id}`, kind: 'skill_draft', sourceId: draft.id, projectId: draft.projectId, title: 'Skill draft needs review', detail: `${draft.name} was captured from a completed run and has no execution authority.`, severity: 'action', createdAt: draft.createdAt, dismissible: false, sourceTab: 'swarm' });
    for (const run of this.store.matching<any>('terminal-agent-runs', 'status', ['completed', 'failed', 'cancelled'], 100, true)) raw.push({ id: `terminal:${run.id}:${run.status}`, kind: 'terminal_outcome', sourceId: run.id, title: `Terminal agent ${run.status.replace('_', ' ')}`, detail: `${run.changedPaths?.length || 0} changed path(s); inspect the retained worktree before any merge.`, severity: run.status === 'completed' ? 'info' : 'action', createdAt: run.completedAt || run.createdAt, dismissible: true, sourceTab: 'runs' });

    const rank = { urgent: 0, action: 1, info: 2 } as const;
    const items = raw.map(item => ({ ...item, read: Boolean(state.get(item.id)?.readAt) }))
      .filter(item => !state.get(item.id)?.dismissedAt && (!input.unreadOnly || !item.read) && (!input.kind || item.kind === input.kind))
      .sort((a, b) => rank[a.severity] - rank[b.severity] || Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 200);
    return { items, counts: { total: items.length, unread: items.filter(item => !item.read).length, urgent: items.filter(item => item.severity === 'urgent').length } };
  }

  setState(itemId: string, action: 'read' | 'unread' | 'dismiss') {
    const item = this.list().items.find(candidate => candidate.id === itemId);
    if (!item) throw new HttpError(404, 'Attention item not found');
    if (action === 'dismiss' && !item.dismissible) throw new HttpError(409, 'Resolve this required review at its source');
    const existing = this.store.get<AttentionState>('attention-state', itemId) || { workspaceId: this.workspaceId, itemId };
    const value = { ...existing, readAt: action === 'unread' ? undefined : existing.readAt || now(), dismissedAt: action === 'dismiss' ? now() : existing.dismissedAt };
    this.store.put('attention-state', itemId, value);
    return value;
  }
}
