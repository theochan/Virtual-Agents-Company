import type { Agent } from '../types';
import { toolCatalog } from './tools';

export function requiredToolsForRequest(message: string, explicit: string[] = []) {
  // Conservative convenience check, not a semantic permission grant or complete intent parser.
  const search = /\b(?:search (?:the )?web|web search|search online|search the internet)\b/i.test(message);
  return [...new Set([...explicit, ...(search ? ['tool-web-search'] : [])])];
}
export function capabilityCheck(agent: Agent, agents: Agent[], required: string[]) {
  const registered = new Set(toolCatalog.map(t => t.id));
  const equipped = (a: Agent, tool: string) => registered.has(tool) && a.autonomyLevel >= 3 && a.toolIds.includes(tool);
  const missing = required.filter(tool => !equipped(agent, tool));
  return { required, missing, candidates: missing.length ? agents.filter(a => a.id !== agent.id && a.workspaceId === agent.workspaceId && required.every(tool => equipped(a, tool))).map(a => ({ id: a.id, name: a.displayName, directSubordinate: a.reportsTo === agent.id })) : [] };
}
