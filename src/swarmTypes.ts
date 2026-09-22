export type SwarmStatus = 'queued' | 'working' | 'waiting_children' | 'waiting_approval' | 'completed' | 'partial' | 'blocked' | 'failed' | 'cancelled' | 'budget_exhausted';
export interface SwarmLimits {
  maxSandboxRuns?: number; maxDepth: number; maxBrowserSteps: number; maxBrowserRequests: number; maxAgents: number; concurrency: number; maxModelCalls: number; maxCallsPerAgent: number;
  maxInputTokens: number; maxOutputTokens: number; maxTokensPerCall: number;
  maxToolCalls: number; maxSearchAttempts: number; maxMinutes: number;
}
export interface SwarmBudget {
  sandboxRuns?: number; browserSteps?: number; browserRequests?: number; modelCalls: number; reservedInputTokens: number; reservedOutputTokens: number;
  toolCalls: number; searchAttempts: number; spawned: number; deadline: number;
  reportedInputTokens: number; reportedOutputTokens: number; unknownUsageCalls: number;
}
export interface SwarmEvent { at: string; type: string; nodeId?: string; detail: string }
export interface SwarmJob {
  workflowBriefs?: Record<string,{name:string;sha256:string;text:string}>;
  workflowRequirements?: import('./server/workflowRequirements').WorkflowRequirements;
  semanticReview?: import('./server/semanticReview').SemanticReview; semanticReviewer?: import('./server/providers').ProviderConfig; semanticReviewResult?: Record<string, any>;
  harness?: 'native'|'deepagents'; harnessResult?:Record<string,any>;
  id: string; workspaceId: string; projectId: string; coordinatorId: string; objective: string;
  mode: 'manual' | 'dynamic' | 'hybrid'; status: SwarmStatus; createdAt: string; completedAt?: string;
  toolSequence?:string[]; plan?:Array<Record<string,any>>; connectorIds?: string[]; contracts?: import('./server/workspace').Contract[]; requiredDepth?: number; browserPolicy?: { allowedOrigins: string[]; allowActions: boolean; requireDiscoveredUrls?: boolean; documentOnly?: boolean; profileId?: string }; limits: SwarmLimits; requiredToolIds?: string[]; allowedToolIds: string[]; rootNodeId: string; nodeIds: string[];
  verificationResults?: Array<Record<string,any>>; result?: string; interrupted?: boolean; events: SwarmEvent[];
}
export interface SwarmNodeView {
  assignmentId?:string;
  toolSequence?:string[]; requiredToolIds?:string[]; dependencies?: string[]; receivedMessages?: string[]; requiredChildDepth?: number; depth?: number; id: string; rootId: string; parentId?: string; sourceAgentId?: string; name: string; role: string;
  instructions: string; objective: string; acceptanceCriteria: string[]; toolIds: string[];
  status: SwarmStatus; calls: number; result?: string; receipts: Array<Record<string, any>>;
  promptHash: string; createdAt: string; completedAt?: string;
}
export interface SwarmView extends SwarmJob { connectorOperations?: Array<Record<string,any>>; verification?: Array<Record<string,any>>; approvals?: Array<Record<string,any>>; budget: SwarmBudget; nodes: SwarmNodeView[] }
