import {
  Agent,
  Task,
  SubTask,
  TaskEvent,
  Artifact,
  AgentMessage,
  DelegationRequest,
  TaskWorkspace,
  MemoryCandidate,
  MemoryItem,
  Project
} from '../../types';
import { MemoryManager } from '../memory/memoryManager';
import { CapabilityDirectory } from '../agents/agentCompiler';

export interface OrchestrationStepCallback {
  (event: TaskEvent): void;
}

export class MultiAgentOrchestrator {
  private memoryManager: MemoryManager;
  private agents: Map<string, Agent> = new Map();
  private projects: Map<string, Project> = new Map();
  private tasks: Map<string, Task> = new Map();
  private artifacts: Map<string, Artifact> = new Map();
  private events: TaskEvent[] = [];
  private onEvent?: OrchestrationStepCallback;

  // Safety limits (Section 55)
  private readonly MAX_DELEGATION_DEPTH = 3;
  private readonly MAX_AGENT_ITERATIONS = 10;
  private readonly MAX_AGENTS_PER_TASK = 10;

  constructor(
    agents: Agent[],
    projects: Project[],
    memoryManager: MemoryManager,
    initialArtifacts: Artifact[] = [],
    onEvent?: OrchestrationStepCallback
  ) {
    this.memoryManager = memoryManager;
    this.onEvent = onEvent;
    agents.forEach((a) => this.agents.set(a.id, a));
    projects.forEach((p) => this.projects.set(p.id, p));
    initialArtifacts.forEach((art) => this.artifacts.set(art.id, art));
  }

  public setEventCallback(cb: OrchestrationStepCallback) {
    this.onEvent = cb;
  }

  public getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public getAllEvents(): TaskEvent[] {
    return [...this.events];
  }

  public getEventsForTask(taskId: string): TaskEvent[] {
    return this.events.filter((e) => e.taskId === taskId);
  }

  private emitEvent(
    taskId: string,
    eventType: TaskEvent['eventType'],
    agentId?: string,
    payload: Record<string, any> = {},
    targetAgentId?: string
  ): TaskEvent {
    const event: TaskEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskId,
      eventType,
      agentId,
      targetAgentId,
      payload,
      createdAt: new Date().toISOString()
    };
    this.events.push(event);
    if (this.onEvent) {
      this.onEvent(event);
    }
    return event;
  }

  /**
   * EXECUTE MULTI-AGENT SCENARIO (Section 54, 61)
   * Lead Agent creates plan, delegates to specialists, aggregates findings on shared blackboard,
   * synthesizes disagreements, creates artifacts, and promotes decisions to project memory.
   */
  public async executeCollaborativeTask(params: {
    userInstruction: string;
    leadAgentId: string;
    projectId?: string;
    onProgressUpdate?: (task: Task) => void;
  }): Promise<{ task: Task; finalSummary: string; promotedMemories: MemoryItem[] }> {
    const leadAgent = this.agents.get(params.leadAgentId);
    if (!leadAgent) {
      throw new Error(`Lead agent ${params.leadAgentId} not found`);
    }

    const project = params.projectId ? this.projects.get(params.projectId) : undefined;
    const taskId = `task-${Date.now()}`;
    const now = new Date().toISOString();

    // 1. Initialize Shared Task Blackboard (Section 44)
    const initialWorkspace: TaskWorkspace = {
      taskId,
      objective: params.userInstruction,
      plan: [],
      assumptions: [
        'Team must respect EU data residency compliance if customer data is involved.',
        'Architecture choices must support rapid indexing and relational integrity.',
        'Cost estimates must account for staging periods and dual-run cloud resources.'
      ],
      findings: [],
      decisions: [],
      openQuestions: ['What is the acceptable migration maintenance window?'],
      artifacts: [],
      contributors: [leadAgent.id]
    };

    const task: Task = {
      id: taskId,
      workspaceId: 'ws-default',
      projectId: params.projectId,
      leadAgentId: leadAgent.id,
      title: params.userInstruction.length > 60 ? `${params.userInstruction.slice(0, 57)}...` : params.userInstruction,
      description: params.userInstruction,
      status: 'planning',
      priority: 'high',
      workspace: initialWorkspace,
      subtasks: [],
      createdAt: now,
      startedAt: now
    };

    this.tasks.set(taskId, task);
    leadAgent.runtimeState.status = 'thinking';
    leadAgent.runtimeState.currentTaskId = taskId;
    leadAgent.runtimeState.statusMessage = 'Analyzing objective & retrieving 4-layer memory';

    this.emitEvent(taskId, 'TASK_CREATED', leadAgent.id, {
      title: task.title,
      objective: task.description,
      leadAgent: leadAgent.displayName
    });
    params.onProgressUpdate?.(task);

    // 2. Memory Retrieval Priority (Section 37)
    // 1. conversation / 2. project / 3. agent / 4. organization
    const retrieved = this.memoryManager.retrieveContext({
      workspaceId: 'ws-default',
      projectId: params.projectId,
      agentId: leadAgent.id,
      topic: params.userInstruction
    });

    await this.delay(600);

    // 3. Lead Agent creates Plan & Selects Specialists using Capability Directory (Section 48, 49)
    this.emitEvent(taskId, 'TASK_PLANNED', leadAgent.id, {
      leadAgent: leadAgent.displayName,
      strategy: 'Dispatching specialist subtasks to Marcus (Architecture), Emma (Research), and Daniel (Finance).'
    });

    const specialistMap: Array<{
      agentId: string;
      objective: string;
      expectedOutput: string;
      constraints: string[];
      role: string;
    }> = [
      {
        agentId: 'agent-marcus',
        objective: 'Evaluate technical architecture for migration from Firebase to PostgreSQL.',
        expectedOutput: 'Recommended architecture, data schema transition, indexing strategy, and technical risks.',
        constraints: ['Must accommodate existing legacy schemas', 'Support pgvector for search', 'EU residency requirement'],
        role: 'Staff Software Architect'
      },
      {
        agentId: 'agent-emma',
        objective: 'Research market ecosystem, adoption benchmarks, and migration concerns for PostgreSQL.',
        expectedOutput: 'Vendor comparison grid, tooling maturity (Drizzle/Prisma), and common pitfalls.',
        constraints: ['Use primary documentation and verified benchmarks'],
        role: 'Senior Research Analyst'
      },
      {
        agentId: 'agent-daniel',
        objective: 'Estimate total financial impact, cloud infrastructure TCO, and budget feasibility.',
        expectedOutput: 'Total cost of migration, dual-run infrastructure delta, and ROI timeline.',
        constraints: ['Include 15-20% engineering buffer', 'Compare Q4 vs Q1 timing'],
        role: 'Lead Financial Analyst'
      }
    ];

    task.workspace.plan = specialistMap.map((s, idx) => ({
      step: idx + 1,
      agentId: s.agentId,
      action: s.objective,
      status: 'pending',
      expectedOutput: s.expectedOutput
    }));

    task.status = 'working';
    leadAgent.runtimeState.status = 'working';
    leadAgent.runtimeState.statusMessage = 'Coordinating specialists';
    params.onProgressUpdate?.(task);

    await this.delay(500);

    // 4. Dispatch Delegations (Section 43) with Compact Context Packets (Section 50)
    const executedArtifacts: Artifact[] = [];

    for (const spec of specialistMap) {
      const specialist = this.agents.get(spec.agentId);
      if (!specialist) continue;

      if (!task.workspace.contributors.includes(specialist.id)) {
        task.workspace.contributors.push(specialist.id);
      }

      const subtaskId = `subtask-${taskId}-${specialist.id}`;
      const delegation: DelegationRequest = {
        taskId: subtaskId,
        parentTaskId: taskId,
        fromAgentId: leadAgent.id,
        toAgentId: specialist.id,
        objective: spec.objective,
        contextSummary: `Project ${project?.name || 'General'}: Rebuilding platform backend.`,
        expectedOutput: spec.expectedOutput,
        constraints: spec.constraints,
        projectId: params.projectId
      };

      const subtask: SubTask = {
        id: subtaskId,
        parentTaskId: taskId,
        assignedAgentId: specialist.id,
        fromAgentId: leadAgent.id,
        title: `${specialist.firstName}: ${spec.objective.slice(0, 45)}...`,
        description: spec.objective,
        status: 'working',
        expectedOutput: spec.expectedOutput,
        constraints: spec.constraints,
        startedAt: new Date().toISOString()
      };
      task.subtasks.push(subtask);

      // Build compact context packet for this specific specialist (Section 50)
      const packet = this.memoryManager.buildContextPacket({
        taskId: subtaskId,
        taskTitle: subtask.title,
        taskObjective: spec.objective,
        delegation,
        projectId: params.projectId,
        agentId: specialist.id,
        topic: spec.objective,
        projectSummary: project?.description
      });

      // Update specialist runtime state (Section 52)
      specialist.runtimeState.status = 'working';
      specialist.runtimeState.currentTaskId = taskId;
      specialist.runtimeState.statusMessage = `Working on: ${spec.objective.slice(0, 35)}...`;

      this.emitEvent(taskId, 'SUBTASK_CREATED', leadAgent.id, {
        assignedTo: specialist.displayName,
        role: spec.role,
        objective: spec.objective,
        subtaskId
      }, specialist.id);

      this.emitEvent(taskId, 'AGENT_STARTED', specialist.id, {
        agent: specialist.displayName,
        action: 'Initialized ContextPacket with 4-layer memory priority',
        retrievedMemoriesCount: packet.relevantProjectMemories.length + packet.relevantAgentMemories.length + packet.relevantOrganizationMemories.length
      });

      params.onProgressUpdate?.(task);
      await this.delay(900);

      // Execute Specialist Subtask & produce Reusable Artifact (Section 45)
      let specialistFinding = '';
      let specialistArtifact: Artifact | null = null;

      if (specialist.id === 'agent-marcus') {
        specialistFinding = 'PostgreSQL strongly superior: provides native ACID foreign-keys, relational joins, and pgvector. Solves legacy Firestore document coupling. Zero compliance risk for EU Frankfurt data residency.';
        specialistArtifact = {
          id: `art-${Date.now()}-marcus`,
          workspaceId: 'ws-default',
          projectId: params.projectId || 'proj-phoenix',
          taskId,
          createdByAgentId: specialist.id,
          type: 'architecture',
          title: 'PostgreSQL Architecture RFC & Migration Blueprint',
          filename: 'phoenix-architecture-rfc.md',
          content: `# PostgreSQL Architecture RFC & Migration Blueprint
**Author**: Marcus (Staff Software Architect)
**Status**: Proposal for Project Phoenix

### 1. Engine Recommendation
- Adopt managed **PostgreSQL 16** with \`pgvector\` extension.
- Isolate legacy Firestore through a repository adapter pattern to ensure safe zero-downtime dual-writes.

### 2. EU Data Residency
- PostgreSQL instances can be deployed strictly within AWS eu-central-1 (Frankfurt) or GCP europe-west3, satisfying Customer Acme's compliance requirements.

### 3. Verdict
Strongly recommend migration. Architectural confidence: 96%.`,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else if (specialist.id === 'agent-emma') {
        specialistFinding = 'PostgreSQL ecosystem is extraordinarily rich: Drizzle ORM offers end-to-end type safety, PgBouncer resolves connection scaling, and developer hiring pool is 4.2x larger than proprietary document DBs.';
        specialistArtifact = {
          id: `art-${Date.now()}-emma`,
          workspaceId: 'ws-default',
          projectId: params.projectId || 'proj-phoenix',
          taskId,
          createdByAgentId: specialist.id,
          type: 'report',
          title: 'PostgreSQL Market & Tooling Benchmark',
          filename: 'postgresql-tooling-benchmark.md',
          content: `# PostgreSQL Market & Tooling Benchmark
**Author**: Emma (Senior Research Analyst)
**Scope**: Ecosystem validation for Project Phoenix

### Key Findings
1. **Tooling Maturity**: Drizzle ORM provides sub-millisecond query generation with strict TypeScript compile-time safety.
2. **Community Adoption**: 74% enterprise preference for relational persistence in analytical workloads.
3. **Operational Risk**: Managed connection pooling (PgBouncer/Supabase Pooler) is required to handle peak serverless connection spikes.`,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else if (specialist.id === 'agent-daniel') {
        // DANIEL DISAGREES ON IMMEDIATE TIMING! (Demonstrating Section 46 Agent Disagreement)
        specialistFinding = 'Total migration cost estimated at $38,400 (labor + 3-month dual-run infrastructure). This exceeds our current Q4 unallocated capital. Recommends staging execution into Q1.';
        specialistArtifact = {
          id: `art-${Date.now()}-daniel`,
          workspaceId: 'ws-default',
          projectId: params.projectId || 'proj-phoenix',
          taskId,
          createdByAgentId: specialist.id,
          type: 'spreadsheet',
          title: 'Database Migration TCO & Runway Impact Model',
          filename: 'migration-cost-tco.md',
          content: `# Database Migration TCO & Runway Impact Model
**Author**: Daniel (Lead Financial Analyst)

### Cost Breakdown
- Senior Engineering hours (180 hrs @ $140/hr): $25,200
- Dual-run cloud infrastructure (3 months): $6,800
- Contingency buffer (20%): $6,400
- **Total Projected Cost**: **$38,400**

### Financial Position
Our Q4 discretionary capital is capped at $20,000. Committing to an immediate full migration right now will trigger a budget overage.
**Recommendation**: Delay production cutover to Q1 2027 or phase the backend adapter in Q4 with dual-write deferred.`,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Record finding onto Shared Blackboard (Section 44)
      task.workspace.findings.push({
        agentId: specialist.id,
        finding: specialistFinding,
        timestamp: new Date().toISOString(),
        confidence: specialist.id === 'agent-daniel' ? 0.95 : 0.92
      });

      if (specialistArtifact) {
        executedArtifacts.push(specialistArtifact);
        task.workspace.artifacts.push(specialistArtifact);
        this.artifacts.set(specialistArtifact.id, specialistArtifact);

        this.emitEvent(taskId, 'ARTIFACT_CREATED', specialist.id, {
          title: specialistArtifact.title,
          filename: specialistArtifact.filename,
          type: specialistArtifact.type
        });
      }

      subtask.status = 'completed';
      subtask.result = specialistFinding;
      subtask.completedAt = new Date().toISOString();

      // Emit Subtask completion & internal agent-to-lead message (Section 8)
      this.emitEvent(taskId, 'SUBTASK_COMPLETED', specialist.id, {
        agent: specialist.displayName,
        finding: specialistFinding
      }, leadAgent.id);

      specialist.runtimeState.status = 'idle';
      specialist.runtimeState.statusMessage = undefined;
      params.onProgressUpdate?.(task);
      await this.delay(600);
    }

    // 5. Expose & Synthesize Agent Disagreement (Section 46)
    // Marcus & Emma urge immediate migration; Daniel flags financial overage in Q4!
    const disagreement = {
      topic: 'Migration Timing & Capital Allocation',
      agentA: {
        agentId: 'agent-marcus',
        position: 'Migrate immediately in Q4 to eliminate technical debt and fulfill EU residency before launch.'
      },
      agentB: {
        agentId: 'agent-daniel',
        position: 'Delay production cutover to Q1 2027 because $38.4k migration cost exceeds Q4 discretionary budget ($20k).'
      },
      synthesis:
        'Technically PostgreSQL is overwhelmingly preferable, but Daniel’s cost analysis indicates committing fully in Q4 creates budget distress. I therefore recommend a staged migration: Marcus and Ava will implement the repository abstraction layer in Q4 under existing engineering allocation, with database provisioning and final data cutover scheduled for Q1 budget rollout.',
      resolved: true
    };

    task.disagreements = [disagreement];
    this.emitEvent(taskId, 'DISAGREEMENT_SYNTHESIZED', leadAgent.id, {
      topic: disagreement.topic,
      perspectiveA: `Marcus: ${disagreement.agentA.position}`,
      perspectiveB: `Daniel: ${disagreement.agentB.position}`,
      synthesis: disagreement.synthesis
    });

    leadAgent.runtimeState.status = 'thinking';
    leadAgent.runtimeState.statusMessage = 'Synthesizing recommendations & preparing decision RFC';
    params.onProgressUpdate?.(task);
    await this.delay(1000);

    // 6. Lead Agent Final Synthesis & Artifact Generation
    const synthesisDecision = {
      id: `dec-${Date.now()}`,
      decision: 'Approved phased migration to PostgreSQL: develop repository adapter layer in Q4; execute data cutover in Q1 2027 to satisfy financial limits.',
      rationale:
        'Balances Marcus’s architectural imperative for relational data and EU residency with Daniel’s Q4 budget constraints. Eliminates technical debt without exceeding financial runway.',
      leadAgentId: leadAgent.id,
      timestamp: new Date().toISOString(),
      status: 'approved' as const
    };
    task.workspace.decisions.push(synthesisDecision);

    const masterSynthesisArtifact: Artifact = {
      id: `art-${Date.now()}-sarah`,
      workspaceId: 'ws-default',
      projectId: params.projectId || 'proj-phoenix',
      taskId,
      createdByAgentId: leadAgent.id,
      type: 'specification',
      title: 'Executive Recommendation: Phased PostgreSQL Migration Plan',
      filename: 'executive-migration-recommendation.md',
      content: `# Executive Recommendation: Phased PostgreSQL Migration Plan
**Lead**: Sarah (Chief of Staff)
**Contributors**: Marcus (Engineering), Emma (Research), Daniel (Finance)
**Project**: Project Phoenix

## 1. Executive Summary & Recommendation
**Conclusion First**: We recommend migrating the Project Phoenix backend from Firebase to PostgreSQL via a **phased two-stage rollout**.
- Stage 1 (Q4): Engineer repository abstraction boundaries and schema DDLs within existing headcount.
- Stage 2 (Q1): Provision managed EU-Frankfurt PostgreSQL instances, execute dual-write synchronization, and finalize cutover.

## 2. Multi-Agent Synthesis
- **Software Architecture (Marcus)**: Confirmed PostgreSQL is mandatory for relational data integrity, pgvector embeddings, and EU compliance.
- **Ecosystem Benchmark (Emma)**: Validated mature tooling (Drizzle ORM, PgBouncer) and overwhelming industry adoption.
- **Financial Review (Daniel)**: Identified that an immediate $38.4k cutover in Q4 exceeds the $20k runway cap. Phasing cutover into Q1 resolves this without added interest or risk.

## 3. Approved Next Steps
1. Marcus to submit PR for Database Repository Interface.
2. Emma to document migration checklist.
3. Daniel to incorporate Stage 2 cloud allocation into Q1 operating budget.`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    task.workspace.artifacts.push(masterSynthesisArtifact);
    this.artifacts.set(masterSynthesisArtifact.id, masterSynthesisArtifact);

    // 7. Memory Promotion (Section 38, 39, 40)
    // Promote important decisions into Project Phoenix Memory!
    const promotedMemories: MemoryItem[] = [];

    // Candidate 1: Official Architecture Decision -> Project Memory
    const candidate1: MemoryCandidate = {
      content: 'Approved migration plan: Phoenix will adopt PostgreSQL using a phased two-stage rollout (Stage 1 abstraction in Q4, Stage 2 production cutover in Q1 2027).',
      summary: 'Phased PostgreSQL migration approved for Project Phoenix.',
      proposedScope: 'project',
      importance: 10,
      confidence: 0.98,
      reason: 'Official cross-functional architecture decision synthesized by Lead Agent',
      type: 'decision',
      projectId: params.projectId || 'proj-phoenix'
    };

    const savedMem1 = this.memoryManager.evaluateAndPersistCandidate(candidate1, leadAgent.id, taskId);
    if (savedMem1) {
      promotedMemories.push(savedMem1);
      this.emitEvent(taskId, 'MEMORY_CREATED', leadAgent.id, {
        scope: savedMem1.scope,
        type: savedMem1.type,
        content: savedMem1.content,
        summary: savedMem1.summary
      });
    }

    // Candidate 2: Technical Discovery by Marcus -> Project Memory
    const candidate2: MemoryCandidate = {
      content: 'PostgreSQL meets Project Phoenix EU data residency requirements via EU-Frankfurt pinning; legacy Firestore had heavy client-side coupling.',
      summary: 'PostgreSQL meets EU residency for Project Phoenix; requires adapter boundary.',
      proposedScope: 'project',
      importance: 9,
      confidence: 0.95,
      reason: 'Durable technical constraint discovered during architecture review',
      type: 'technical_discovery',
      projectId: params.projectId || 'proj-phoenix'
    };
    const savedMem2 = this.memoryManager.evaluateAndPersistCandidate(candidate2, 'agent-marcus', taskId);
    if (savedMem2) {
      promotedMemories.push(savedMem2);
    }

    // Update Project recent decisions if project exists (Section 41)
    if (project) {
      project.recentDecisions.unshift({
        id: synthesisDecision.id,
        title: 'Phased PostgreSQL Migration',
        decision: synthesisDecision.decision,
        decidedAt: new Date().toISOString(),
        agentId: leadAgent.id
      });
    }

    // 8. Finalize Task
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.result = masterSynthesisArtifact.content;

    leadAgent.runtimeState.status = 'idle';
    leadAgent.runtimeState.statusMessage = undefined;

    this.emitEvent(taskId, 'TASK_COMPLETED', leadAgent.id, {
      title: task.title,
      summary: 'Collaborative task successfully synthesized with all findings and project memories updated.'
    });

    params.onProgressUpdate?.(task);

    return {
      task,
      finalSummary: masterSynthesisArtifact.content,
      promotedMemories
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
