import React, { useState } from 'react';
import { Tool, ApprovalRequest, Agent, ToolPermission } from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Wrench,
  Check,
  Users,
  Sparkles,
  Info
} from 'lucide-react';

interface ToolSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  tools: Tool[];
  approvals: ApprovalRequest[];
  onDecideApproval: (id: string, decision: 'approved' | 'rejected') => void;
  agents: Agent[];
  onAddTool?: (newTool: Tool) => void;
  onAssignAgentTool?: (agentId: string, toolId: string, assign: boolean) => void;
}

export const ToolSecurityModal: React.FC<ToolSecurityModalProps> = ({
  isOpen,
  onClose,
  tools,
  approvals,
  onDecideApproval,
  agents,
  onAddTool,
  onAssignAgentTool
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // New Tool Form State
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<Tool['category']>('Engineering');
  const [newPermission, setNewPermission] = useState<ToolPermission>('READ');
  const [newRequiresApproval, setNewRequiresApproval] = useState(false);
  const [newParameters, setNewParameters] = useState('query: string, limit: number');
  const [selectedAssignAgents, setSelectedAssignAgents] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const getAgent = (id?: string) => agents.find((a) => a.id === id);

  const getPermissionBadge = (perm: Tool['permission']) => {
    switch (perm) {
      case 'READ':
        return 'bg-blue-950 text-blue-300 border-blue-800/40';
      case 'WRITE':
        return 'bg-amber-950 text-amber-300 border-amber-800/40';
      case 'EXECUTE':
        return 'bg-indigo-950 text-indigo-300 border-indigo-800/40';
      case 'DESTRUCTIVE':
        return 'bg-rose-950 text-rose-300 border-rose-800/40 font-bold';
    }
  };

  const handleCreateTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError('Please enter a tool name.');
      return;
    }

    const toolSlug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const generatedId = `tool-${toolSlug || Date.now()}`;

    // Parse parameters into array
    const parsedParams = newParameters
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [pName, pType] = p.split(':').map((s) => s.trim());
        return {
          name: pName || 'param',
          type: pType || 'string',
          required: true,
          description: `Parameter ${pName}`
        };
      });

    const newTool: Tool = {
      id: generatedId,
      name: newName.trim(),
      description: newDescription.trim() || 'Custom registered enterprise tool capability.',
      category: newCategory,
      permission: newPermission,
      requiresApproval: newRequiresApproval,
      schema: { parameters: newParameters },
      parameters: parsedParams
    };

    if (onAddTool) {
      onAddTool(newTool);
    }

    // Assign to selected agents
    if (onAssignAgentTool && selectedAssignAgents.length > 0) {
      selectedAssignAgents.forEach((agentId) => {
        onAssignAgentTool(agentId, generatedId, true);
      });
    }

    // Reset and close form
    setNewName('');
    setNewDescription('');
    setNewParameters('query: string, limit: number');
    setSelectedAssignAgents([]);
    setFormError('');
    setIsRegisterOpen(false);
  };

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['all', 'Research', 'Engineering', 'Finance', 'Communication', 'Productivity'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded bg-[#0A0A0A] border border-[#1A1A1A] shadow-2xl flex flex-col max-h-[90vh] text-[#E0E0E0] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#F0F0F0]">Tool Clearance & Security Approvals</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#111] border border-[#222] font-mono text-[#AAA]">
                  {tools.length} Tools Available
                </span>
              </div>
              <p className="text-[11px] text-[#777]">
                Permission Tiers: READ • WRITE • EXECUTE • DESTRUCTIVE with Human-in-the-Loop Safeguards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRegisterOpen(!isRegisterOpen)}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold cursor-pointer transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Tool</span>
            </button>
            <button onClick={onClose} className="text-[#666] hover:text-[#FFF] text-sm cursor-pointer p-1.5 rounded hover:bg-[#111]">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* REGISTER NEW TOOL FORM */}
          {isRegisterOpen && (
            <div className="p-4 rounded border border-[#C5A358]/40 bg-[#0C0C0C] space-y-4 shadow-lg animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#C5A358]" />
                  <h4 className="text-xs font-semibold text-[#F0F0F0]">Register New Tool Capability</h4>
                </div>
                <button
                  onClick={() => setIsRegisterOpen(false)}
                  className="text-xs text-[#777] hover:text-[#CCC] cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800/40">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateTool} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#AAA] mb-1">Tool Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Postgres Query Runner, Slack Dispatcher"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-2 rounded border border-[#222] bg-[#070707] text-xs text-[#F0F0F0] focus:outline-none focus:border-[#C5A358]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#AAA] mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full p-2 rounded border border-[#222] bg-[#070707] text-xs text-[#F0F0F0] focus:outline-none focus:border-[#C5A358]"
                    >
                      <option value="Research">Research</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Finance">Finance</option>
                      <option value="Communication">Communication</option>
                      <option value="Productivity">Productivity</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#AAA] mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Describe what this tool executes or provides to the agent..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-2 rounded border border-[#222] bg-[#070707] text-xs text-[#F0F0F0] focus:outline-none focus:border-[#C5A358]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#AAA] mb-1">Permission Security Tier</label>
                    <select
                      value={newPermission}
                      onChange={(e) => setNewPermission(e.target.value as any)}
                      className="w-full p-2 rounded border border-[#222] bg-[#070707] text-xs text-[#F0F0F0] focus:outline-none focus:border-[#C5A358]"
                    >
                      <option value="READ">READ (Safe - query data, search logs)</option>
                      <option value="WRITE">WRITE (Produces artifacts, saves state)</option>
                      <option value="EXECUTE">EXECUTE (Runs scripts or services)</option>
                      <option value="DESTRUCTIVE">DESTRUCTIVE (Schema migration, deletion)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#AAA] mb-1">Parameters (name: type)</label>
                    <input
                      type="text"
                      placeholder="e.g. query: string, format: json"
                      value={newParameters}
                      onChange={(e) => setNewParameters(e.target.value)}
                      className="w-full p-2 rounded border border-[#222] bg-[#070707] text-xs text-[#F0F0F0] focus:outline-none focus:border-[#C5A358]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-[#CCC] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRequiresApproval}
                      onChange={(e) => setNewRequiresApproval(e.target.checked)}
                      className="rounded accent-[#C5A358]"
                    />
                    <span>Require Human-in-the-Loop approval before execution</span>
                  </label>
                </div>

                {/* Equip to initial agents */}
                <div>
                  <label className="block text-[11px] font-medium text-[#AAA] mb-1.5">
                    Equip to Agents Immediately (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {agents.map((ag) => {
                      const isChecked = selectedAssignAgents.includes(ag.id);
                      return (
                        <button
                          key={ag.id}
                          type="button"
                          onClick={() => {
                            setSelectedAssignAgents((prev) =>
                              isChecked ? prev.filter((id) => id !== ag.id) : [...prev, ag.id]
                            );
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition cursor-pointer border ${
                            isChecked
                              ? 'bg-[#C5A358]/20 text-[#C5A358] border-[#C5A358]'
                              : 'bg-[#070707] text-[#888] border-[#1A1A1A] hover:text-[#CCC]'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{ag.displayName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#1A1A1A]">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="px-3 py-1.5 rounded border border-[#222] bg-[#070707] text-xs text-[#888] hover:text-[#CCC] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold cursor-pointer shadow"
                  >
                    Save & Register Tool
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pending Approval Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Pending Human Approval Requests ({approvals.filter((a) => a.status === 'pending').length})
              </span>
              <span className="text-[11px] text-[#555] font-mono">Enforced Security Gate</span>
            </div>

            {approvals.filter((a) => a.status === 'pending').length === 0 ? (
              <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#888] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>No high-risk or destructive actions awaiting approval. System is nominal.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {approvals
                  .filter((a) => a.status === 'pending')
                  .map((appr) => {
                    const agent = getAgent(appr.agentId);
                    return (
                      <div
                        key={appr.id}
                        className="p-4 rounded bg-rose-950/20 border border-rose-800/40 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#F0F0F0]">{agent?.displayName || 'Agent'}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono border border-rose-800/40">
                              REQUIRES APPROVAL
                            </span>
                          </div>
                          <p className="text-[#CCC]">{appr.actionSummary}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onDecideApproval(appr.id, 'rejected')}
                            className="py-1.5 px-3 rounded border border-[#1A1A1A] bg-[#070707] hover:bg-[#111] text-[#AAA] text-xs font-medium cursor-pointer"
                          >
                            Deny
                          </button>
                          <button
                            onClick={() => onDecideApproval(appr.id, 'approved')}
                            className="py-1.5 px-3 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow cursor-pointer"
                          >
                            Approve Action
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Tools Catalog with Search and Assignment */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest block">
                Registered Enterprise Tools ({filteredTools.length})
              </span>

              {/* Filter and Search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#666]" />
                  <input
                    type="text"
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded border border-[#1A1A1A] bg-[#070707] text-xs text-[#CCC] placeholder-[#555] focus:outline-none focus:border-[#C5A358]"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 rounded text-[10px] capitalize transition cursor-pointer border ${
                        selectedCategory === cat
                          ? 'bg-[#C5A358]/20 text-[#C5A358] border-[#C5A358]/40'
                          : 'bg-[#070707] text-[#777] border-[#1A1A1A] hover:text-[#AAA]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTools.map((tool) => {
                // Find agents that have this tool equipped
                const equippedAgents = agents.filter((a) => {
                  const agTools = a.tools || a.toolIds || [];
                  return agTools.includes(tool.id);
                });

                return (
                  <div key={tool.id} className="p-3.5 rounded bg-[#070707] border border-[#1A1A1A] space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#F0F0F0]">{tool.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#111] text-[#777] border border-[#1F1F1F]">
                            {tool.category}
                          </span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${getPermissionBadge(tool.permission)}`}>
                          {tool.permission}
                        </span>
                      </div>
                      <p className="text-xs text-[#888] leading-relaxed">{tool.description}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#161616]">
                      {/* Equipped by agents */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#666] flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#555]" />
                          <span>Equipped Agents:</span>
                        </span>
                        <div className="flex flex-wrap gap-1 items-center">
                          {agents.map((ag) => {
                            const isAssigned = (ag.tools || ag.toolIds || []).includes(tool.id);
                            return (
                              <button
                                key={ag.id}
                                onClick={() => {
                                  if (onAssignAgentTool) {
                                    onAssignAgentTool(ag.id, tool.id, !isAssigned);
                                  }
                                }}
                                title={isAssigned ? `Click to unequip from ${ag.displayName}` : `Click to equip to ${ag.displayName}`}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition border ${
                                  isAssigned
                                    ? 'bg-[#C5A358]/15 text-[#C5A358] border-[#C5A358]/30 font-medium'
                                    : 'bg-[#0A0A0A] text-[#555] border-[#181818] hover:text-[#888]'
                                }`}
                              >
                                {isAssigned && <Check className="w-2.5 h-2.5 text-[#C5A358]" />}
                                <span>{ag.displayName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tool metadata */}
                      <div className="flex items-center justify-between text-[10px] text-[#666] font-mono pt-1">
                        <span>
                          {Array.isArray(tool.parameters)
                            ? tool.parameters.length
                            : tool.parameters && typeof tool.parameters === 'object'
                            ? Object.keys(tool.parameters).length
                            : tool.schema && typeof tool.schema === 'object'
                            ? Object.keys(tool.schema).length
                            : 0}{' '}
                          Parameters
                        </span>
                        {tool.requiresApproval && <span className="text-[#C5A358]">● Requires Human Approval</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1A1A1A] bg-[#070707] flex items-center justify-between">
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[#C5A358] hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add another tool capability</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
