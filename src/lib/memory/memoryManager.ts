import {
  MemoryItem,
  MemoryScope,
  MemoryRetrievalQuery,
  MemoryCandidate,
  ContextPacket,
  DelegationRequest,
  Artifact
} from '../../types';

export class MemoryManager {
  private memories: MemoryItem[] = [];

  constructor(initialMemories: MemoryItem[] = []) {
    this.memories = initialMemories.map(m => ({ ...m, provenance: m.provenance || {
      originalSource: m.sourceId || 'Legacy import; source unverified', originalAgentId: m.agentId || 'unknown',
      timestamp: m.createdAt, promotionHistory: [],
    } }));
  }

  public getAllMemories(): MemoryItem[] {
    return [...this.memories];
  }

  public getMemoriesByScope(scope: MemoryScope, filterId?: string): MemoryItem[] {
    return this.memories.filter((m) => {
      if (m.scope !== scope) return false;
      if (scope === 'agent' && filterId && m.agentId !== filterId) return false;
      if (scope === 'project' && filterId && m.projectId !== filterId) return false;
      return true;
    });
  }

  public getMemoriesForProject(projectId: string): MemoryItem[] {
    return this.memories.filter((m) => m.scope === 'project' && m.projectId === projectId);
  }

  public getMemoriesForAgent(agentId: string): MemoryItem[] {
    return this.memories.filter((m) => m.scope === 'agent' && m.agentId === agentId);
  }

  public getOrganizationMemories(): MemoryItem[] {
    return this.memories.filter((m) => m.scope === 'organization');
  }

  /**
   * MEMORY RETRIEVAL PRIORITY (Section 37)
   * When an agent executes work, retrieve context in this order:
   * 1. current task / conversation
   * 2. relevant project memory (filtered by assigned project)
   * 3. relevant agent memory (belonging to executing agent)
   * 4. relevant organization memory (global standards & user preferences)
   */
  public retrieveContext(query: MemoryRetrievalQuery): {
    projectMemories: MemoryItem[];
    agentMemories: MemoryItem[];
    organizationMemories: MemoryItem[];
    allRanked: MemoryItem[];
  } {
    const eligible = this.memories.filter(m => m.workspaceId === query.workspaceId && m.status === 'active'
      && m.reviewStatus === 'reviewed' && (!m.expiresAt || Date.parse(m.expiresAt) > Date.now())
      && (!query.scopes || query.scopes.includes(m.scope)));
    const topic = (query.topic || '').toLowerCase();
    const keywords = topic.split(/\s+/).filter((w) => w.length > 2);

    const scoreMemory = (m: MemoryItem): number => {
      // Disqualify or heavily penalize superseded or expired memories
      if (m.status === 'superseded') return 0.05;
      if (m.status === 'expired') return 0.01;

      let score = m.importance * 0.1 * m.confidence;
      const text = `${m.content} ${m.summary} ${m.tags.join(' ')}`.toLowerCase();

      for (const kw of keywords) {
        if (text.includes(kw)) {
          score += 1.5;
        }
      }

      // Boost recent decisions
      if (m.type === 'decision') score += 1.0;
      if (m.status === 'active') score += 0.5;

      return score;
    };

    // 1. Relevant Project Memories (Strict isolation: only current project!)
    let projectMemories: MemoryItem[] = [];
    if (query.projectId) {
      projectMemories = eligible
        .filter((m) => m.scope === 'project' && m.projectId === query.projectId && m.status !== 'superseded')
        .map((m) => ({ item: m, score: scoreMemory(m) }))
        .filter((entry) => (keywords.length > 0 ? entry.score > 0.5 : true))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((entry) => entry.item);
    }

    // 2. Relevant Agent Memories
    let agentMemories: MemoryItem[] = [];
    if (query.agentId) {
      agentMemories = eligible
        .filter((m) => m.scope === 'agent' && m.agentId === query.agentId && m.status !== 'superseded')
        .map((m) => ({ item: m, score: scoreMemory(m) }))
        .filter((entry) => (keywords.length > 0 ? entry.score > 0.4 : true))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((entry) => entry.item);
    }

    // 3. Relevant Organization Memories
    const organizationMemories = eligible
      .filter((m) => m.scope === 'organization' && m.status !== 'superseded')
      .map((m) => ({ item: m, score: scoreMemory(m) }))
      .filter((entry) => (keywords.length > 0 ? entry.score > 0.4 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((entry) => entry.item);

    const allRanked = [...projectMemories, ...agentMemories, ...organizationMemories];

    return {
      projectMemories,
      agentMemories,
      organizationMemories,
      allRanked
    };
  }

  /**
   * CONSTRUCT COMPACT CONTEXT PACKET (Section 50)
   * Never inject entire databases into prompts. Construct a precise, compact packet.
   */
  public buildContextPacket(params: {
    workspaceId?: string;
    taskId: string;
    taskTitle: string;
    taskObjective: string;
    delegation?: DelegationRequest;
    projectId?: string;
    agentId: string;
    topic: string;
    artifacts?: Artifact[];
    tools?: string[];
    projectSummary?: string;
  }): ContextPacket {
    const retrieved = this.retrieveContext({
      workspaceId: params.workspaceId || 'ws-default',
      projectId: params.projectId,
      agentId: params.agentId,
      topic: `${params.topic} ${params.taskObjective}`
    });

    return {
      task: {
        id: params.taskId,
        title: params.taskTitle,
        objective: params.taskObjective
      },
      delegation: params.delegation,
      projectSummary: params.projectSummary,
      relevantProjectMemories: retrieved.projectMemories,
      relevantAgentMemories: retrieved.agentMemories,
      relevantOrganizationMemories: retrieved.organizationMemories,
      relevantArtifacts: params.artifacts || [],
      availableTools: params.tools || []
    };
  }

  /**
   * MEMORY WRITE / CANDIDATE EVALUATION POLICY (Section 38)
   * Agents do NOT save every word. MemoryManager validates candidates.
   */
  public evaluateAndPersistCandidate(candidate: MemoryCandidate, authorAgentId: string, taskId?: string): MemoryItem | null {
    // Minimum threshold for durability
    if (candidate.importance < 4 || candidate.confidence < 0.6) {
      // Ephemeral only - reject durable storage
      return null;
    }

    const now = new Date().toISOString();
    const newMemory: MemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      workspaceId: 'ws-default',
      scope: candidate.proposedScope,
      agentId: candidate.proposedScope === 'agent' ? candidate.agentId || authorAgentId : undefined,
      projectId: candidate.proposedScope === 'project' ? candidate.projectId : undefined,
      type: candidate.type,
      content: candidate.content,
      summary: candidate.summary,
      importance: candidate.importance,
      confidence: candidate.confidence,
      status: 'active',
      reviewStatus: 'candidate',
      sourceType: 'task_output',
      sourceId: taskId,
      provenance: {
        originalSource: taskId ? `Task: ${taskId}` : 'Conversation evaluation',
        originalAgentId: authorAgentId,
        originalTaskId: taskId,
        timestamp: now,
        projectId: candidate.projectId,
        promotionHistory: []
      },
      createdAt: now,
      updatedAt: now,
      tags: this.extractKeywords(candidate.content)
    };

    // Check conflict / superseding
    // Model confidence does not authorize policy replacement.

    this.memories.unshift(newMemory);
    return newMemory;
  }

  /**
   * MEMORY PROMOTION WITH PROVENANCE (Section 39)
   * Conversation -> Agent -> Project -> Organization
   */
  public promoteMemory(params: {
    memoryId: string;
    targetScope: MemoryScope;
    promotedByAgentId: string;
    reason: string;
    targetProjectId?: string;
  }): MemoryItem | null {
    const original = this.memories.find((m) => m.id === params.memoryId && m.workspaceId === 'ws-default');
    if (!original) return null;
    if (!params.reason?.trim()) throw new Error('A review reason is required');
    if (params.targetScope === 'project' && !(params.targetProjectId || original.projectId)) throw new Error('Project scope requires a project');
    if (params.targetScope === 'agent' && !original.agentId) throw new Error('Agent scope requires an agent');
    const mem: MemoryItem = structuredClone(original);
    mem.id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    mem.scope = params.targetScope;
    mem.reviewStatus = 'reviewed';
    if (params.targetScope === 'project') {
      mem.projectId = params.targetProjectId || mem.projectId;
      mem.agentId = undefined;
    } else if (params.targetScope === 'organization') {
      mem.projectId = undefined; mem.agentId = undefined;
    }
    mem.provenance!.promotionHistory.push({ fromScope: original.scope, toScope: params.targetScope,
      promotedAt: new Date().toISOString(), promotedByAgentId: 'workspace-owner', reason: params.reason });
    mem.updatedAt = new Date().toISOString();
    original.status = 'superseded'; original.supersededBy = mem.id;
    this.memories.unshift(mem);
    return mem;
  }

  /**
   * MEMORY CONFLICT HANDLING (Section 40)
   * Superseeded decisions pointer without deleting history
   */
  public detectAndApplyConflict(newMemory: MemoryItem) {
    // Deliberately no automatic superseding based on tag overlap or model scores.
    // Only an explicit owner review may replace a version.
  }

  private extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const keyTopics = ['postgresql', 'firebase', 'architecture', 'database', 'auth', 'auth.js', 'migration', 'backend', 'cost', 'timeline', 'eu', 'residency', 'security', 'react', 'nextjs'];
    const matched = keyTopics.filter((k) => text.toLowerCase().includes(k));

    return Array.from(new Set([...matched, ...words.slice(0, 6)]));
  }
}
