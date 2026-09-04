export type MemoryScope = 'conversation' | 'agent' | 'project' | 'organization';

export type MemoryStatus = 'active' | 'superseded' | 'disputed' | 'expired';

export interface MemoryProvenance {
  originalSource: string;
  originalAgentId: string;
  originalTaskId?: string;
  timestamp: string;
  projectId?: string;
  promotionHistory: Array<{
    fromScope: MemoryScope;
    toScope: MemoryScope;
    promotedAt: string;
    promotedByAgentId: string;
    reason: string;
  }>;
}

export interface MemoryItem {
  id: string;
  workspaceId: string;
  agentId?: string; // set if agent scope
  projectId?: string; // set if project scope
  scope: MemoryScope;
  type: 'decision' | 'preference' | 'lesson' | 'fact' | 'policy' | 'technical_discovery' | 'constraint' | 'insight';
  content: string;
  summary: string;
  importance: number; // 1-10
  confidence: number; // 0.0 - 1.0
  status: MemoryStatus;
  supersededBy?: string; // id of memory that superseded this
  sourceType?: 'conversation' | 'task_output' | 'agent_reflection' | 'user_instruction' | 'promotion';
  sourceId?: string;
  provenance?: MemoryProvenance;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  accessCount?: number;
  durabilityScore?: number;
  expiresAt?: string;
  tags: string[];
}

export interface MemoryCandidate {
  content: string;
  summary: string;
  proposedScope: MemoryScope;
  importance: number;
  confidence: number;
  reason: string;
  type: MemoryItem['type'];
  projectId?: string;
  agentId?: string;
}

export interface MemoryRetrievalQuery {
  workspaceId: string;
  projectId?: string;
  agentId?: string;
  topic?: string;
  scopes?: MemoryScope[];
  limit?: number;
}

export interface AgentCapability {
  agentId: string;
  capability: string;
  proficiency: number; // 0 - 100
  description: string;
}

export type AgentStatus = 'offline' | 'idle' | 'thinking' | 'working' | 'waiting' | 'blocked' | 'needs_approval' | 'error';

export interface AgentRuntimeState {
  agentId?: string;
  status: AgentStatus;
  currentStatus?: AgentStatus;
  currentActivity?: string;
  currentTaskId?: string;
  currentProjectId?: string;
  statusMessage?: string;
  lastActiveAt?: string;
}

export interface PersonalityDimensions {
  introversionExtroversion?: number; // 0 (Introverted) - 100 (Extroverted)
  analyticalIntuitive?: number; // 0 (Intuitive) - 100 (Analytical)
  conservativeExperimental?: number; // 0 (Conservative) - 100 (Experimental)
  formalCasual?: number; // 0 (Casual) - 100 (Formal)
  diplomaticDirect?: number; // 0 (Diplomatic) - 100 (Direct)
  independentCollaborative?: number; // 0 (Independent) - 100 (Collaborative)
  reactiveDeliberate?: number; // 0 (Reactive) - 100 (Deliberate)
  detailBigPicture?: number; // 0 (Detail) - 100 (Big Picture)
  skepticalTrusting?: number; // 0 (Skeptical) - 100 (Trusting)
  seriousPlayful?: number; // 0 (Playful) - 100 (Serious)
  analyticalVsIntuitive?: number;
  formalVsCasual?: number;
  verboseVsConcise?: number;
  cautiousVsFast?: number;
  independentVsCollaborative?: number;
  assertiveVsDeferential?: number;
  detailVsBigPicture?: number;
  theoreticalVsPragmatic?: number;
  optimisticVsSkeptical?: number;
  methodicalVsExperimental?: number;
}

export type Temperament = 'Calm' | 'Assertive' | 'Energetic' | 'Patient' | 'Competitive' | 'Curious' | 'Empathetic' | 'Pragmatic' | 'Perfectionistic' | 'calm' | 'energetic' | 'serious' | 'warm' | 'direct' | 'methodical' | 'analytical';

export type CommunicationMode = 'Executive concise' | 'Technical expert' | 'Friendly colleague' | 'Consultant' | 'Teacher' | 'Critical reviewer' | 'conclusion_first' | 'step_by_step' | 'socratic' | 'conversational' | 'technical_spec';

export interface CommunicationStyle {
  mode: 'conclusion_first' | 'step_by_step' | 'socratic' | 'conversational' | 'technical_spec' | string;
  verbosity: 'concise' | 'balanced' | 'thorough' | string;
  jargonLevel: 'low' | 'moderate' | 'expert' | string;
  humorLevel: 'none' | 'subtle' | 'dry' | 'light' | string;
  challengesUserDecisions: boolean;
  proactivelySuggestsImprovements: boolean;
}

export type ModelProvider =
  | 'google'
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'huggingface'
  | 'openrouter'
  | 'qwen'
  | 'local'
  | 'Gemini'
  | 'OpenAI'
  | 'Anthropic'
  | 'Ollama'
  | 'HuggingFace'
  | 'OpenRouter';

export interface LLMConfig {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  contextLimit?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
  // Local models downloaded via Ollama or Hugging Face
  isLocal?: boolean;
  localSource?: 'ollama' | 'huggingface' | 'vllm' | 'custom';
  localEndpoint?: string; // e.g. "http://localhost:11434" or "http://localhost:8000/v1"
  hfRepoId?: string; // e.g. "meta-llama/Llama-3.2-3B-Instruct"
  quantization?: string; // e.g. "Q4_K_M", "Q8_0", "FP16"
}

export type AutonomyLevel = 1 | 2 | 3 | 4; // 1: Advisory, 2: Delegation, 3: Tool Exec, 4: Autonomous

export interface Agent {
  id: string;
  workspaceId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  gender: 'female' | 'male' | 'non-binary';
  approxAge: number;
  age?: number;
  nationality: string;
  language?: string;
  timezone?: string;
  avatarUrl: string;
  jobTitle: string;
  department: string;
  departmentRole?: 'lead' | 'member';
  reportsTo?: string; // ID of the manager agent
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Staff / Principal' | 'Lead / Executive' | string;
  primaryResponsibility: string;
  secondaryResponsibilities: string[];
  expertise: string[];
  skills?: string[];
  personalityDimensions: PersonalityDimensions;
  temperament: Temperament;
  personalityDescription: string;
  communicationMode: CommunicationMode;
  communicationStyle?: CommunicationStyle;
  communicationTraits?: {
    verbosity: number; // 0-100
    jargon: number; // 0-100
    humor: number; // 0-100
    emotionalExpressiveness: number; // 0-100
    challengesUser: boolean;
    proactiveSuggestions: boolean;
  };
  llmConfig: LLMConfig;
  autonomyLevel: AutonomyLevel;
  toolIds: string[];
  tools?: string[];
  capabilities?: AgentCapability[];
  runtimeState: AgentRuntimeState;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number; // USD
  };
  memoryAccess?: {
    allowedScopes: MemoryScope[];
    projectIds: string[];
  };
  defaultModel?: string;
  createdAt: string;
}

export interface ProjectMember {
  projectId: string;
  agentId: string;
  role: string;
  permissions: 'lead' | 'contributor' | 'reviewer' | 'viewer';
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: 'active' | 'planning' | 'paused' | 'completed' | 'archived';
  objective?: string;
  ownerAgentId?: string;
  leadAgentId?: string;
  assignedAgentIds?: string[];
  members: ProjectMember[];
  recentDecisions: Array<{
    id: string;
    title: string;
    decision: string;
    decidedAt: string;
    agentId: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  workspaceId: string;
  projectId: string;
  taskId: string;
  createdByAgentId: string;
  type: 'markdown' | 'code' | 'architecture' | 'spreadsheet' | 'report' | 'specification';
  title: string;
  filename: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWorkspaceFinding {
  agentId: string;
  finding: string;
  timestamp: string;
  confidence: number;
  category?: string;
}

export interface TaskWorkspace {
  taskId: string;
  objective: string;
  plan: Array<{
    step: number;
    agentId: string;
    action: string;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    expectedOutput: string;
  }>;
  assumptions: string[];
  findings: TaskWorkspaceFinding[];
  decisions: Array<{
    id: string;
    decision: string;
    rationale: string;
    leadAgentId: string;
    timestamp: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
  openQuestions: string[];
  artifacts: Artifact[];
  contributors: string[]; // agent IDs
}

export type TaskStatus = 'queued' | 'planning' | 'working' | 'waiting' | 'blocked' | 'reviewing' | 'completed' | 'failed' | 'cancelled';

export type WorkItemStatus = 'backlog' | 'todo' | 'in_progress' | 'done';

export interface WorkItemUpdateLog {
  id: string;
  agentId?: string;
  authorName: string;
  timestamp: string;
  previousStatus?: WorkItemStatus;
  newStatus?: WorkItemStatus;
  comment: string;
  artifactCreated?: string;
  progressPercent?: number;
}

export interface WorkItem {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string;
  status: WorkItemStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedAgentId?: string;
  createdByAgentId?: string;
  createdByName?: string;
  lastUpdatedByAgentId?: string;
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
  progressPercent?: number;
  history: WorkItemUpdateLog[];
  artifacts?: Array<{
    id: string;
    title: string;
    type: string;
    filename: string;
  }>;
  parentTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubTask {
  id: string;
  parentTaskId: string;
  assignedAgentId: string;
  fromAgentId: string;
  title: string;
  description: string;
  status: TaskStatus;
  expectedOutput: string;
  constraints: string[];
  result?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  workspaceId: string;
  parentTaskId?: string;
  projectId?: string;
  leadAgentId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  workspace: TaskWorkspace;
  subtasks: SubTask[];
  disagreements?: Array<{
    topic: string;
    agentA: { agentId: string; position: string };
    agentB: { agentId: string; position: string };
    synthesis?: string;
    resolved: boolean;
  }>;
  result?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DelegationRequest {
  taskId: string;
  parentTaskId?: string;
  fromAgentId: string;
  toAgentId: string;
  objective: string;
  contextSummary: string;
  expectedOutput: string;
  constraints: string[];
  projectId?: string;
  deadline?: string;
}

export interface ContextPacket {
  task: {
    id: string;
    title: string;
    objective: string;
  };
  delegation?: DelegationRequest;
  projectSummary?: string;
  relevantProjectMemories: MemoryItem[];
  relevantOrganizationMemories: MemoryItem[];
  relevantAgentMemories: MemoryItem[];
  relevantArtifacts: Artifact[];
  availableTools: string[];
}

export type TaskEventType =
  | 'TASK_CREATED'
  | 'TASK_PLANNED'
  | 'SUBTASK_CREATED'
  | 'AGENT_ASSIGNED'
  | 'AGENT_STARTED'
  | 'TOOL_STARTED'
  | 'TOOL_COMPLETED'
  | 'AGENT_MESSAGE_SENT'
  | 'MEMORY_CREATED'
  | 'ARTIFACT_CREATED'
  | 'SUBTASK_COMPLETED'
  | 'REVIEW_REQUESTED'
  | 'APPROVAL_REQUIRED'
  | 'TASK_COMPLETED'
  | 'DISAGREEMENT_SYNTHESIZED';

export interface TaskEvent {
  id: string;
  taskId: string;
  eventType: TaskEventType;
  agentId?: string;
  targetAgentId?: string;
  payload: Record<string, any>;
  createdAt: string;
}

export interface AgentMessage {
  id: string;
  taskId?: string;
  projectId?: string;
  fromAgentId: string;
  toAgentId?: string; // undefined means broadcast to task blackboard
  messageType: 'request' | 'response' | 'update' | 'question' | 'handoff' | 'review' | 'approval' | 'disagreement';
  content: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  workspaceId?: string;
  conversationId?: string;
  senderType: 'user' | 'agent' | 'system';
  agentId?: string;
  content: string;
  timestamp: string;
  taskId?: string;
  attachments?: Artifact[];
  metadata?: {
    isMultiAgentExecution?: boolean;
    internalActivities?: Array<{ text: string; time?: string; type?: string }>;
    taskPlan?: any;
    disagreements?: any[];
    promotedMemories?: MemoryItem[];
    autoCreatedWorkItems?: WorkItem[];
    executionStatus?: 'completed' | 'in_progress';
    linkedProjectId?: string;
    linkedProjectName?: string;
    isDelegated?: boolean;
    delegationChain?: {
      delegatorId: string;
      delegatorName: string;
      subordinateId: string;
      subordinateName: string;
      subordinateRole?: string;
      toolUsed: string;
      status: 'pending' | 'in_progress' | 'completed';
      workItemId?: string;
      query?: string;
    };
    pendingWorkItemId?: string;
    isBacklogPipeline?: boolean;
    backlogPipeline?: {
      pipelineId: string;
      leadAgentId: string;
      leadAgentName: string;
      status: 'holding_busy' | 'staged_todo' | 'executing' | 'completed';
      step: number; // 1: Decomposed to Backlog, 2: Cross-Project Busy Check, 3: Staged to Todo Queue, 4: Sequential Execution, 5: Completed
      busyAgentsNotice?: Array<{
        agentId: string;
        agentName: string;
        otherProjectId: string;
        otherProjectName: string;
        activeWorkItemTitle: string;
      }>;
      totalItems: number;
      completedItems: number;
      assignedAgents: string[];
    };
    localInference?: {
      provider: string;
      model: string;
      status: string;
      endpoint?: string;
      latencyMs?: number;
      localSource?: string;
    };
  };
}

export type ToolPermission = 'READ' | 'WRITE' | 'EXECUTE' | 'DESTRUCTIVE';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'Research' | 'Engineering' | 'Finance' | 'Communication' | 'Productivity';
  permission: ToolPermission;
  requiresApproval: boolean;
  schema: Record<string, any>;
  parameters?: Array<{ name: string; type: string; description?: string; required?: boolean }> | Record<string, any>;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  agentId: string;
  toolId: string;
  actionSummary: string;
  details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}
