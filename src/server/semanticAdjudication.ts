import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { Store } from './store';
import type { Workspace } from './workspace';
import type { SwarmJob } from '../swarmTypes';
import { hash, HttpError, now, uid } from './security';

const decisionSchema = z.object({
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  checks: z.array(z.object({
    criterion: z.number().int().min(0).max(5),
    verdict: z.enum(['pass', 'fail', 'inconclusive']),
    reason: z.string().trim().min(10).max(2000),
  }).strict()).min(1).max(6),
}).strict();

// Owner judgments are an append-only assessment of the exact reviewed versions.
// They never change machine verdicts, run status, execution authority or budgets.
export class SemanticAdjudication {
  constructor(private store: Store, private workspace: Workspace) {}

  context(runId: string) {
    const job = this.store.get<SwarmJob>('swarms', runId);
    if (!job) throw new HttpError(404, 'Swarm not found');
    if (['queued', 'working', 'waiting_children', 'waiting_approval'].includes(job.status)) throw new HttpError(409, 'Stop the run before owner review');
    if (!job.semanticReview || !job.semanticReviewResult?.evidence?.length) throw new HttpError(409, 'No recorded semantic review evidence is available');
    const policy = job.semanticReview;
    const expected = [...new Set([...policy.inputNames, ...policy.outputNames])];
    const evidence = job.semanticReviewResult.evidence as Array<{ name: string; fileId: string; version: number; sha256: string; role: string }>;
    if (evidence.length !== expected.length || new Set(evidence.map(f => f.name)).size !== expected.length || evidence.some(f => !expected.includes(f.name))) throw new HttpError(409, 'Review evidence coverage is invalid');
    let bytes = 0;
    const files = evidence.map(ref => {
      if (!Number.isSafeInteger(ref.version) || ref.version < 1) throw new HttpError(409, 'Invalid review evidence version');
      const file = this.workspace.file(job.projectId, ref.name, ref.version);
      const body = Buffer.from(file.base64, 'base64');
      const output = policy.outputNames.includes(ref.name);
      if (file.id !== ref.fileId || file.sha256 !== ref.sha256 || createHash('sha256').update(body).digest('hex') !== ref.sha256 || ref.role !== (output ? 'output' : 'input') || (output && file.runId !== job.id)) throw new HttpError(409, 'Review evidence identity mismatch');
      bytes += body.length;
      if (bytes > 14336 || !(file.mime.startsWith('text/') || file.mime === 'application/json')) throw new HttpError(409, 'Review evidence cannot be displayed safely');
      return { ...ref, text: body.toString('utf8'), latestVersion: this.workspace.file(job.projectId, ref.name).version };
    });
    const history = this.store.matching<any>('semantic-adjudications', 'rootId', [runId], 101);
    const snapshot = { runId, projectId: job.projectId, objective: job.objective, status: job.status, policy, machineReview: job.semanticReviewResult, files };
    return { ...snapshot, revision: hash({ snapshot, previous: history.at(-1)?.id ?? null }), history };
  }

  record(runId: string, raw: unknown) {
    const input = decisionSchema.parse(raw);
    return this.store.transaction(() => {
      const context = this.context(runId);
      if (input.revision !== context.revision) throw new HttpError(409, 'Review changed; reload evidence before recording a judgment');
      if (context.history.length >= 100) throw new HttpError(409, 'Owner review history limit reached');
      if (input.checks.length !== context.policy.criteria.length || new Set(input.checks.map(c => c.criterion)).size !== context.policy.criteria.length || input.checks.some(c => c.criterion >= context.policy.criteria.length)) throw new HttpError(400, 'Judge every criterion exactly once');
      const { history, ...snapshot } = context;
      const record = { id: uid(), rootId: runId, projectId: context.projectId, actor: 'owner', createdAt: now(), previousId: history.at(-1)?.id ?? null, snapshot, checks: input.checks, verdict: input.checks.some(c => c.verdict === 'fail') ? 'fail' : input.checks.some(c => c.verdict === 'inconclusive') ? 'inconclusive' : 'pass' };
      this.store.put('semantic-adjudications', record.id, record);
      return record;
    });
  }
}
