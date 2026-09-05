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
        return 'bg-blue-50 text-blue-800 border-blue-200 font-medium';
      case 'WRITE':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
      case 'EXECUTE':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200 font-medium';
      case 'DESTRUCTIVE':
        return 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-700 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 font-serif">Tool Clearance & Security Approvals</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-mono text-slate-600 font-medium">
                  {tools.length} Tools Available
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Permission Tiers: READ • WRITE • EXECUTE • DESTRUCTIVE with Human-in-the-Loop Safeguards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRegisterOpen(!isRegisterOpen)}
              className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold cursor-pointer transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Tool</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-[#F8F9FA]">
          {/* REGISTER NEW TOOL FORM */}
          {isRegisterOpen && (
            <div className="p-5 rounded-xl border border-amber-200 bg-white space-y-4 shadow-xs animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-700" />
                  <h4 className="text-xs font-semibold text-slate-900 font-serif">Register New Tool Capability</h4>
                </div>
                <button
                  onClick={() => setIsRegisterOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateTool} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tool Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Postgres Query Runner, Slack Dispatcher"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 cursor-pointer"
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Describe what this tool executes or provides to the agent..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Permission Security Tier</label>
                    <select
                      value={newPermission}
                      onChange={(e) => setNewPermission(e.target.value as any)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 cursor-pointer"
                    >
                      <option value="READ">READ (Safe - query data, search logs)</option>
                      <option value="WRITE">WRITE (Produces artifacts, saves state)</option>
                      <option value="EXECUTE">EXECUTE (Runs scripts or services)</option>
                      <option value="DESTRUCTIVE">DESTRUCTIVE (Schema migration, deletion)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Parameters (name: type)</label>
                    <input
                      type="text"
                      placeholder="e.g. query: string, format: json"
                      value={newParameters}
                      onChange={(e) => setNewParameters(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={newRequiresApproval}
                      onChange={(e) => setNewRequiresApproval(e.target.checked)}
                      className="rounded accent-amber-600 w-4 h-4"
                    />
                    <span>Require Human-in-the-Loop approval before execution</span>
                  </label>
                </div>

                {/* Equip to initial agents */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
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
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer border ${
                            isChecked
                              ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{ag.displayName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs transition"
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
              <span className="text-[10px] font-semibold text-rose-800 uppercase tracking-widest flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Pending Human Approval Requests ({approvals.filter((a) => a.status === 'pending').length})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Enforced Security Gate</span>
            </div>

            {approvals.filter((a) => a.status === 'pending').length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5 shadow-2xs">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
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
                        className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-4 shadow-2xs"
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{agent?.displayName || 'Agent'}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-rose-100 text-rose-800 border border-rose-300 font-semibold">
                              REQUIRES APPROVAL
                            </span>
                          </div>
                          <p className="text-slate-700">{appr.actionSummary}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onDecideApproval(appr.id, 'rejected')}
                            className="py-1.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer shadow-2xs"
                          >
                            Deny
                          </button>
                          <button
                            onClick={() => onDecideApproval(appr.id, 'approved')}
                            className="py-1.5 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition"
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
              <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest block font-mono">
                Registered Enterprise Tools ({filteredTools.length})
              </span>

              {/* Filter and Search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] capitalize transition cursor-pointer border ${
                        selectedCategory === cat
                          ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
                  <div key={tool.id} className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between hover:border-amber-300/80 transition">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900">{tool.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {tool.category}
                          </span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${getPermissionBadge(tool.permission)}`}>
                          {tool.permission}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{tool.description}</p>
                    </div>

                    <div className="space-y-2 pt-2.5 border-t border-slate-100">
                      {/* Equipped by agents */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                          <Users className="w-3 h-3 text-slate-400" />
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
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] cursor-pointer transition border ${
                                  isAssigned
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-2xs'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {isAssigned && <Check className="w-2.5 h-2.5 text-amber-700" />}
                                <span>{ag.displayName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tool metadata */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
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
                        {tool.requiresApproval && <span className="text-amber-800 font-semibold">● Requires Human Approval</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-1.5 text-xs text-amber-800 hover:text-amber-900 font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add another tool capability</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
