import { z } from 'zod';
import type { Agent, Project } from '../types';
import { HttpError } from './security';
export const DELEGATE_TOOL = 'tool-delegate';
export const READ_TOOLS = ['tool-read-project', 'tool-calculator', 'tool-web-search'] as const;
export const delegationSchema = z.object({
 subordinateId: z.string().min(1).max(100), objective: z.string().trim().min(1).max(4000),
 requiredToolIds: z.array(z.enum(READ_TOOLS)).min(1).max(3),
}).strict();
export const TREE_LIMITS = { children: 2, attempts: 12, reservedOutputTokens: 12000, searchToolAttempts: 4, wallMs: 600000 };
export const delegationEnabled = () => process.env.VAC_ENABLE_DELEGATION === '1';
export const canDelegate = (a: Agent) => delegationEnabled() && a.autonomyLevel >= 3 && a.toolIds.includes(DELEGATE_TOOL);
export function validateSubordinate(manager: Agent, child: Agent | undefined, project: Project, required: string[]) {
 if (!canDelegate(manager)) throw new HttpError(403, 'Delegation is disabled or not permitted for this manager');
 if (!child || child.id === manager.id || child.reportsTo !== manager.id || child.workspaceId !== manager.workspaceId || project.workspaceId !== manager.workspaceId) throw new HttpError(403, 'Delegation requires a direct subordinate in the same workspace and project');
 if ((project.members?.length || project.assignedAgentIds?.length || project.leadAgentId) && !project.members.some(m => m.agentId === child.id) && !project.assignedAgentIds?.includes(child.id) && project.leadAgentId !== child.id) throw new HttpError(403, 'Subordinate is not assigned to this project');
 if (!required.length || required.some(t => !(READ_TOOLS as readonly string[]).includes(t) || !child.toolIds.includes(t)) || child.autonomyLevel < 3) throw new HttpError(403, 'Subordinate lacks the required read-only tools');
 return child;
}

export function subordinateProfile(a: Agent) {
 return { id: a.id, name: a.displayName, role: a.jobTitle, department: a.department,
  expertise: a.expertise || [], responsibilities: [a.primaryResponsibility, ...(a.secondaryResponsibilities || [])].filter(Boolean),
  tools: a.toolIds.filter(t => (READ_TOOLS as readonly string[]).includes(t)) };
}
// Preferences never grant access: callers must supply only eligible direct reports.
export function routeSubordinate(request: string, candidates: Agent[], proposedId: string) {
 const proposed = candidates.find(a => a.id === proposedId);
 if (!proposed) throw new HttpError(403, 'Proposed subordinate is not eligible');
 const named = candidates.filter(a => new RegExp(`\\b${a.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(request));
 if (named.length === 1) return { agent: named[0], reason: 'Explicitly named by the user; required tools and project permissions verified.' };
 const finance = /\b(share price|stock price|last traded|market research|company research|earnings|valuation|financial analysis)\b/i.test(request);
 const engineering = /\b(software|architecture|code|database|debug|api design|engineering)\b/i.test(request);
 if (finance !== engineering) {
  const preferredId = finance ? 'agent-emma' : 'agent-marcus';
  const specialist = candidates.find(a => a.id === preferredId) || candidates.find(a => (finance ? /research|financial|market/i : /software|architect|engineering/i).test([a.jobTitle,a.department,...(a.expertise || [])].join(' ')));
  if (specialist) return { agent: specialist, reason: `${finance ? 'Market/company research' : 'Software architecture/engineering'} preference; specialist is an eligible direct report with the required tools.` };
 }
 return { agent: proposed, reason: 'No unambiguous domain preference or eligible preferred specialist; retained the model selection after permission and tool checks.' };
}
