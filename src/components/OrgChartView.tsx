import React, { useState, useMemo } from 'react';
import { Agent } from '../types';
import {
  Network,
  Users,
  Shield,
  ChevronDown,
  ChevronRight,
  UserCheck,
  MessageSquare,
  Sliders,
  Sparkles,
  ArrowUpRight,
  GitBranch,
  Building2,
  Layers,
  Check,
  AlertCircle
} from 'lucide-react';
import { handleAvatarError } from '../lib/avatarCatalog';

interface DepartmentStat {
  count: number;
  lead?: Agent;
  members: Agent[];
  avgAutonomy: number;
}

interface OrgChartViewProps {
  agents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onOpenProfile: (agent: Agent) => void;
  onUpdateReportingLine?: (agentId: string, newReportsToId: string | undefined) => void;
}

export const OrgChartView: React.FC<OrgChartViewProps> = ({
  agents,
  onSelectAgent,
  onOpenProfile,
  onUpdateReportingLine
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeDeptFilters, setActiveDeptFilters] = useState<string[]>(['Engineering lead', 'Finance lead']);

  // Department Lead Specialists
  const marcus = agents.find((a) => a.id === 'agent-marcus') || agents.find((a) => a.department === 'Engineering');
  const daniel = agents.find((a) => a.id === 'agent-daniel') || agents.find((a) => a.department === 'Finance');
  const emma = agents.find((a) => a.id === 'agent-emma') || agents.find((a) => a.department === 'Market Intelligence' || a.department === 'Operations');
  const ava = agents.find((a) => a.id === 'agent-ava') || agents.find((a) => a.department === 'Product' || a.department === 'Design');
  const james = agents.find((a) => a.id === 'agent-james') || agents.find((a) => a.department === 'Solutions' || a.department === 'Security');
  const sarah = agents.find((a) => a.id === 'agent-sarah') || agents[0];

  const deptLeads = [
    { agent: marcus, name: 'Marcus', role: 'Engineering', dept: 'Engineering', reports: 5, autonomy: 0 },
    { agent: daniel, name: 'Daniel', role: 'Finance', dept: 'Finance', reports: 3, autonomy: 0 },
    { agent: emma, name: 'Emma', role: 'Market Intelligence', dept: 'Market Intelligence', reports: 4, autonomy: 0 },
    { agent: ava, name: 'Ava', role: 'Product', dept: 'Product', reports: 4, autonomy: 0 },
    { agent: james, name: 'James', role: 'Solutions', dept: 'Solutions', reports: 4, autonomy: 0 }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#FBFBFA] text-slate-800 overflow-hidden">
      {/* Top Floating Canvas Toolbar (Matching Wireframe Page 3) */}
      <div className="h-16 px-6 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-4">
          {/* Brand Mark */}
          <div className="w-8 h-8 rounded-lg bg-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-700 font-bold text-xs shadow-2xs font-serif">
            A
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
              className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition font-mono text-xs"
              title="Zoom out"
            >
              —
            </button>
            <span className="px-3 py-1.5 text-xs text-slate-700 font-medium select-none border-x border-slate-200">
              Zoom {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition font-mono text-xs"
              title="Zoom in"
            >
              +
            </button>
          </div>

          {/* Department Filter Chips */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Department:</span>
            {activeDeptFilters.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs"
              >
                <span>{tag}</span>
                <button
                  onClick={() => setActiveDeptFilters(activeDeptFilters.filter((t) => t !== tag))}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <button className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition shadow-2xs">
            <span className="font-bold text-xs tracking-widest">•••</span>
          </button>
          <button
            onClick={() => onSelectAgent(sarah?.id || 'agent-sarah')}
            className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <span>+ Add Coworker</span>
          </button>
        </div>
      </div>

      {/* Main Visual Hierarchy Canvas with Bezier Connectors */}
      <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-start min-h-[600px]">
        <div
          className="transition-transform duration-150 origin-top flex flex-col items-center w-full max-w-6xl"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Root Sarah Card (Direct Wireframe Replica) */}
          {sarah && (
            <div
              onClick={() => onOpenProfile(sarah)}
              className="w-72 rounded-2xl border-2 border-amber-300/80 bg-white p-4 shadow-sm hover:shadow-md transition cursor-pointer relative"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={sarah.avatarUrl}
                    alt={sarah.displayName}
                    referrerPolicy="no-referrer"
                    onError={(e) => handleAvatarError(e)}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                  />
                  <div>
                    <h3 className="font-serif italic font-bold text-base text-slate-900">
                      {sarah.displayName.split(' ')[0]}
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Chief of Staff & VP Operations
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                  Autonomy
                </span>
              </div>

              {/* Autonomy Dial Gauge (Direct Wireframe Replica) */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Autonomy</span>
                  {/* Gauge Arc SVG */}
                  <svg className="w-16 h-8 overflow-visible" viewBox="0 0 60 32">
                    <path
                      d="M 5 30 A 25 25 0 0 1 55 30"
                      stroke="#E2E8F0"
                      strokeWidth="5"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 5 30 A 25 25 0 0 1 48 14"
                      stroke="#D97706"
                      strokeWidth="5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    Direct reports
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block mb-1">Autonomy</span>
                  <span className="text-2xl font-bold font-mono text-slate-900 leading-none">20</span>
                </div>
              </div>
            </div>
          )}

          {/* Curved Bezier Connectors Tree SVG */}
          <div className="w-full max-w-5xl h-16 flex items-center justify-center">
            <svg className="w-full h-16 overflow-visible" viewBox="0 0 1000 64" fill="none">
              {/* Central vertical stem down from Sarah */}
              <path d="M 500 0 L 500 24" stroke="#D97706" strokeWidth="2.5" />
              {/* Branch to Marcus (col 1: ~100) */}
              <path d="M 500 24 C 500 44, 100 24, 100 64" stroke="#C5A358" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Branch to Daniel (col 2: ~300) */}
              <path d="M 500 24 C 500 44, 300 24, 300 64" stroke="#C5A358" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Branch to Emma (col 3: ~500) */}
              <path d="M 500 24 L 500 64" stroke="#64748B" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Branch to Ava (col 4: ~700) */}
              <path d="M 500 24 C 500 44, 700 24, 700 64" stroke="#64748B" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Branch to James (col 5: ~900) */}
              <path d="M 500 24 C 500 44, 900 24, 900 64" stroke="#64748B" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          {/* Row of 5 Department Leads (Direct Wireframe Replica) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full max-w-6xl">
            {deptLeads.map((dl, idx) => {
              const agentObj = dl.agent;
              return (
                <div
                  key={idx}
                  onClick={() => agentObj && onOpenProfile(agentObj)}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-amber-300 hover:shadow-md transition cursor-pointer space-y-3 relative group"
                >
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3">
                    <img
                      src={agentObj?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={dl.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => handleAvatarError(e)}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                    />
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900 group-hover:text-amber-800 transition">
                        {dl.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-sans">{dl.role}</p>
                    </div>
                  </div>

                  {/* Department Pill */}
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                      {dl.dept}
                    </span>
                  </div>

                  {/* Autonomy Dial Gauge */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 block mb-0.5">Autonomy</span>
                      <svg className="w-12 h-6 overflow-visible" viewBox="0 0 60 32">
                        <path
                          d="M 5 30 A 25 25 0 0 1 55 30"
                          stroke="#E2E8F0"
                          strokeWidth="5"
                          fill="none"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 5 30 A 25 25 0 0 1 42 16"
                          stroke="#C5A358"
                          strokeWidth="5"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block">Autonomy</span>
                      <span className="text-sm font-bold font-mono text-slate-900">{dl.autonomy}</span>
                    </div>
                  </div>

                  {/* Status Indicator Dot */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Active</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
