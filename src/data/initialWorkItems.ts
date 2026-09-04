import { WorkItem } from '../types';

export const INITIAL_WORK_ITEMS: WorkItem[] = [
  // 1. BACKLOGS
  {
    id: 'wi-1',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'Audit OAuth 2.0 PKCE Flow for Mobile & Edge Clients',
    description: 'Evaluate authorization code exchange with PKCE against strict European banking standards and ensure token lifetimes align with security compliance rules.',
    status: 'backlog',
    priority: 'medium',
    assignedAgentId: 'agent-sarah',
    createdByAgentId: 'agent-sarah',
    createdByName: 'Sarah',
    lastUpdatedByAgentId: 'agent-sarah',
    tags: ['Security', 'Auth', 'Compliance'],
    estimatedHours: 16,
    actualHours: 0,
    progressPercent: 0,
    history: [
      {
        id: 'hist-1',
        agentId: 'agent-sarah',
        authorName: 'Sarah (Chief of Staff)',
        timestamp: '2026-08-22T09:30:00.000Z',
        newStatus: 'backlog',
        comment: 'Captured as roadmap prerequisite during Q4 architecture triage.',
        progressPercent: 0
      }
    ],
    createdAt: '2026-08-22T09:30:00.000Z',
    updatedAt: '2026-08-22T09:30:00.000Z'
  },
  {
    id: 'wi-2',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'Automated Vector Index Partitioning (pgvector HNSW vs IVFFlat)',
    description: 'Benchmark cosine and L2 similarity query latency under high write throughput for agent memory embeddings stored inside PostgreSQL.',
    status: 'backlog',
    priority: 'high',
    assignedAgentId: 'agent-marcus',
    createdByAgentId: 'agent-marcus',
    createdByName: 'Marcus',
    lastUpdatedByAgentId: 'agent-marcus',
    tags: ['Database', 'pgvector', 'Performance'],
    estimatedHours: 24,
    actualHours: 0,
    progressPercent: 0,
    history: [
      {
        id: 'hist-2',
        agentId: 'agent-marcus',
        authorName: 'Marcus (Staff Software Architect)',
        timestamp: '2026-08-24T14:15:00.000Z',
        newStatus: 'backlog',
        comment: 'Proposed following initial pgvector memory retrieval testing. HNSW builds faster but requires memory overhead.',
        progressPercent: 0
      }
    ],
    createdAt: '2026-08-24T14:15:00.000Z',
    updatedAt: '2026-08-24T14:15:00.000Z'
  },
  {
    id: 'wi-3',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'Competitor Multi-Tenant Latency & SLA Comparison Matrix',
    description: 'Compile an exhaustive survey of multi-tenant enterprise isolation patterns, maximum latency guarantees, and downtime SLAs across top SaaS peers.',
    status: 'backlog',
    priority: 'low',
    assignedAgentId: 'agent-emma',
    createdByAgentId: 'agent-emma',
    createdByName: 'Emma',
    lastUpdatedByAgentId: 'agent-emma',
    tags: ['Research', 'Market Analysis', 'SLA'],
    estimatedHours: 12,
    actualHours: 0,
    progressPercent: 0,
    history: [
      {
        id: 'hist-3',
        agentId: 'agent-emma',
        authorName: 'Emma (Senior Research Analyst)',
        timestamp: '2026-08-25T11:00:00.000Z',
        newStatus: 'backlog',
        comment: 'Queued for subsequent analyst deep dive after Phoenix database migration milestone.',
        progressPercent: 0
      }
    ],
    createdAt: '2026-08-25T11:00:00.000Z',
    updatedAt: '2026-08-25T11:00:00.000Z'
  },

  // 2. TODO
  {
    id: 'wi-4',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'Draft PostgreSQL Migration DDL with Foreign Key Cascades',
    description: 'Produce the initial SQL migration script defining tables for organizations, teams, projects, tasks, audit logs, and agent memory vectors with strict relational integrity.',
    status: 'todo',
    priority: 'urgent',
    assignedAgentId: 'agent-marcus',
    createdByAgentId: 'agent-sarah',
    createdByName: 'Sarah',
    lastUpdatedByAgentId: 'agent-marcus',
    tags: ['Migration', 'PostgreSQL', 'DDL'],
    estimatedHours: 18,
    actualHours: 0,
    progressPercent: 0,
    history: [
      {
        id: 'hist-4',
        agentId: 'agent-sarah',
        authorName: 'Sarah (Chief of Staff)',
        timestamp: '2026-08-26T08:45:00.000Z',
        previousStatus: 'backlog',
        newStatus: 'todo',
        comment: 'Promoted to Todo based on executive consensus to proceed with relational database.',
        progressPercent: 0
      }
    ],
    createdAt: '2026-08-26T08:45:00.000Z',
    updatedAt: '2026-08-26T08:45:00.000Z'
  },
  {
    id: 'wi-5',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'Financial Runway Stress Test for Cloud SQL Enterprise Tier',
    description: 'Model cash flow impact and margin sensitivity for 12 months under dual-write hosting (Firebase + managed PostgreSQL) with automatic HA failover.',
    status: 'todo',
    priority: 'high',
    assignedAgentId: 'agent-daniel',
    createdByAgentId: 'agent-sarah',
    createdByName: 'Sarah',
    lastUpdatedByAgentId: 'agent-daniel',
    tags: ['Finance', 'Runway', 'Cloud SQL'],
    estimatedHours: 10,
    actualHours: 0,
    progressPercent: 0,
    history: [
      {
        id: 'hist-5',
        agentId: 'agent-sarah',
        authorName: 'Sarah (Chief of Staff)',
        timestamp: '2026-08-27T10:20:00.000Z',
        newStatus: 'todo',
        comment: 'Assigned to Daniel to lock down exact hosting expense caps before migration cutover.',
        progressPercent: 0
      }
    ],
    createdAt: '2026-08-27T10:20:00.000Z',
    updatedAt: '2026-08-27T10:20:00.000Z'
  },
  {
    id: 'wi-6',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'EU GDPR Data Residency & Frankfurt Physical Pinning Spec',
    description: 'Verify all persistent storage volumes and read replicas comply with European customer contractual requirements, specifically physical datacenter isolation in Frankfurt.',
    status: 'todo',
    priority: 'urgent',
    assignedAgentId: 'agent-sarah',
    createdByAgentId: 'agent-sarah',
    createdByName: 'Sarah',
    lastUpdatedByAgentId: 'agent-sarah',
    tags: ['Compliance', 'GDPR', 'Residency'],
    estimatedHours: 14,
    actualHours: 0,
    progressPercent: 0,
    history: [
      {
        id: 'hist-6',
        agentId: 'agent-sarah',
        authorName: 'Sarah (Chief of Staff)',
        timestamp: '2026-08-28T13:00:00.000Z',
        newStatus: 'todo',
        comment: 'Crucial requirement from Organization Policy (mem-org-3). Must accompany architecture sign-off.',
        progressPercent: 0
      }
    ],
    createdAt: '2026-08-28T13:00:00.000Z',
    updatedAt: '2026-08-28T13:00:00.000Z'
  },

  // 3. IN-PROGRESS
  {
    id: 'wi-atlas-sync',
    workspaceId: 'ws-default',
    projectId: 'proj-atlas',
    title: 'Field SQLite Offline Delta Sync Protocol Engine',
    description: 'Active engineering task on Project Atlas: Marcus is testing SQLite local delta merge protocol and vector cache replication before field mobile release.',
    status: 'in_progress',
    priority: 'urgent',
    assignedAgentId: 'agent-marcus',
    createdByAgentId: 'agent-marcus',
    createdByName: 'Marcus',
    lastUpdatedByAgentId: 'agent-marcus',
    tags: ['Mobile', 'SQLite', 'Offline-First'],
    estimatedHours: 24,
    actualHours: 19,
    progressPercent: 80,
    history: [
      {
        id: 'hist-atlas-1',
        agentId: 'agent-marcus',
        authorName: 'Marcus (Staff Software Architect)',
        timestamp: '2026-09-02T10:00:00.000Z',
        previousStatus: 'todo',
        newStatus: 'in_progress',
        comment: 'Actively profiling vector cache replication on Project Atlas mobile client.',
        progressPercent: 80
      }
    ],
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z'
  },
  {
    id: 'wi-7',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'PostgreSQL Repository Abstraction Layer & Dual-Write Bridge',
    description: 'Implement an interchangeable database adapter interface (IRepository) allowing zero-downtime dual writes and read verification between Firestore and PostgreSQL.',
    status: 'in_progress',
    priority: 'urgent',
    assignedAgentId: 'agent-marcus',
    createdByAgentId: 'agent-marcus',
    createdByName: 'Marcus',
    lastUpdatedByAgentId: 'agent-marcus',
    tags: ['Architecture', 'Dual-Write', 'TypeScript'],
    estimatedHours: 32,
    actualHours: 21,
    progressPercent: 65,
    history: [
      {
        id: 'hist-7a',
        agentId: 'agent-marcus',
        authorName: 'Marcus (Staff Software Architect)',
        timestamp: '2026-08-29T09:00:00.000Z',
        previousStatus: 'todo',
        newStatus: 'in_progress',
        comment: 'Picked up task. Scaffolding IUserRepository and ITaskRepository abstractions.',
        progressPercent: 15
      },
      {
        id: 'hist-7b',
        agentId: 'agent-marcus',
        authorName: 'Marcus (Staff Software Architect)',
        timestamp: '2026-08-30T16:30:00.000Z',
        comment: 'Completed dual-write retry buffer with exponential backoff. Validating idempotency keys across async write queues.',
        progressPercent: 65
      }
    ],
    createdAt: '2026-08-29T09:00:00.000Z',
    updatedAt: '2026-08-30T16:30:00.000Z'
  },
  {
    id: 'wi-8',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'Enterprise Customer SLA & Data Residency Comparison Report',
    description: 'Compiling structured analyst report benchmarking contractual data residency clauses of top tier European fintech platforms against our proposed PostgreSQL configuration.',
    status: 'in_progress',
    priority: 'high',
    assignedAgentId: 'agent-emma',
    createdByAgentId: 'agent-emma',
    createdByName: 'Emma',
    lastUpdatedByAgentId: 'agent-emma',
    tags: ['Research', 'Compliance', 'Benchmark'],
    estimatedHours: 16,
    actualHours: 8,
    progressPercent: 45,
    history: [
      {
        id: 'hist-8a',
        agentId: 'agent-emma',
        authorName: 'Emma (Senior Research Analyst)',
        timestamp: '2026-08-30T10:15:00.000Z',
        previousStatus: 'todo',
        newStatus: 'in_progress',
        comment: 'Commenced analyst deep-dive. Extracted contractual clauses from 5 public enterprise case studies.',
        progressPercent: 20
      },
      {
        id: 'hist-8b',
        agentId: 'agent-emma',
        authorName: 'Emma (Senior Research Analyst)',
        timestamp: '2026-08-31T14:40:00.000Z',
        comment: 'Drafted Section 2 (BaFin & GDPR Article 28 compliance). Reviewing SLA penalty models with Daniel.',
        progressPercent: 45
      }
    ],
    createdAt: '2026-08-30T10:15:00.000Z',
    updatedAt: '2026-08-31T14:40:00.000Z'
  },

  // 4. DONE
  {
    id: 'wi-9',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'Architecture Assessment: Firebase to PostgreSQL Migration',
    description: 'Comprehensive technical evaluation comparing Firebase document references against relational PostgreSQL schema, ACID transactions, and pgvector performance.',
    status: 'done',
    priority: 'urgent',
    assignedAgentId: 'agent-marcus',
    createdByAgentId: 'agent-marcus',
    createdByName: 'Marcus',
    lastUpdatedByAgentId: 'agent-marcus',
    tags: ['Architecture', 'PostgreSQL', 'Migration'],
    estimatedHours: 20,
    actualHours: 18,
    progressPercent: 100,
    artifacts: [
      {
        id: 'art-arch-1',
        title: 'Architecture Assessment: Firebase to PostgreSQL',
        type: 'architecture',
        filename: 'architecture.md'
      }
    ],
    history: [
      {
        id: 'hist-9a',
        agentId: 'agent-marcus',
        authorName: 'Marcus (Staff Software Architect)',
        timestamp: '2026-08-20T08:00:00.000Z',
        previousStatus: 'todo',
        newStatus: 'in_progress',
        comment: 'Initiated technical evaluation and query complexity benchmarks.',
        progressPercent: 25
      },
      {
        id: 'hist-9b',
        agentId: 'agent-marcus',
        authorName: 'Marcus (Staff Software Architect)',
        timestamp: '2026-08-20T14:00:00.000Z',
        previousStatus: 'in_progress',
        newStatus: 'done',
        comment: 'Finalized architecture assessment deliverable. Published architecture.md with 94% confidence rating.',
        artifactCreated: 'architecture.md',
        progressPercent: 100
      }
    ],
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T14:00:00.000Z'
  },
  {
    id: 'wi-10',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'PostgreSQL Ecosystem & Market Adoption Benchmark',
    description: 'Empirical research synthesized across developer surveys, tooling maturity (Drizzle, Prisma, PgBouncer), and enterprise enterprise migration case studies.',
    status: 'done',
    priority: 'high',
    assignedAgentId: 'agent-emma',
    createdByAgentId: 'agent-emma',
    createdByName: 'Emma',
    lastUpdatedByAgentId: 'agent-emma',
    tags: ['Research', 'Ecosystem', 'Benchmark'],
    estimatedHours: 15,
    actualHours: 14,
    progressPercent: 100,
    artifacts: [
      {
        id: 'art-res-1',
        title: 'PostgreSQL Ecosystem & Market Adoption Research',
        type: 'report',
        filename: 'research.md'
      }
    ],
    history: [
      {
        id: 'hist-10a',
        agentId: 'agent-emma',
        authorName: 'Emma (Senior Research Analyst)',
        timestamp: '2026-08-20T09:30:00.000Z',
        previousStatus: 'todo',
        newStatus: 'in_progress',
        comment: 'Gathered empirical telemetry from developer sentiment indices.',
        progressPercent: 30
      },
      {
        id: 'hist-10b',
        agentId: 'agent-emma',
        authorName: 'Emma (Senior Research Analyst)',
        timestamp: '2026-08-20T13:45:00.000Z',
        previousStatus: 'in_progress',
        newStatus: 'done',
        comment: 'Completed research report. Confirmed 74% enterprise preference for PostgreSQL data tiers. Attached research.md.',
        artifactCreated: 'research.md',
        progressPercent: 100
      }
    ],
    createdAt: '2026-08-20T09:30:00.000Z',
    updatedAt: '2026-08-20T13:45:00.000Z'
  },
  {
    id: 'wi-11',
    workspaceId: 'ws-default',
    projectId: 'proj-phoenix',
    title: 'Dual-Run Infrastructure Budget Allocation Strategy',
    description: 'Financial feasibility study establishing a conservative $15,000 dual-run staging budget with hard circuit breakers to protect project operating margin.',
    status: 'done',
    priority: 'medium',
    assignedAgentId: 'agent-daniel',
    createdByAgentId: 'agent-daniel',
    createdByName: 'Daniel',
    lastUpdatedByAgentId: 'agent-daniel',
    tags: ['Finance', 'Budget', 'Runway'],
    estimatedHours: 8,
    actualHours: 7,
    progressPercent: 100,
    history: [
      {
        id: 'hist-11a',
        agentId: 'agent-daniel',
        authorName: 'Daniel (Finance & Operations)',
        timestamp: '2026-08-21T11:00:00.000Z',
        previousStatus: 'in_progress',
        newStatus: 'done',
        comment: 'Set hard spending cap and alert webhooks. Allocated $15k staging buffer from contingency reserve.',
        progressPercent: 100
      }
    ],
    createdAt: '2026-08-21T09:00:00.000Z',
    updatedAt: '2026-08-21T11:00:00.000Z'
  }
];
