import React, { useState } from 'react';
import { Artifact, Agent } from '../types';
import { X, FileText, Copy, Check, Calendar, User, Download } from 'lucide-react';

interface ArtifactModalProps {
  artifact: Artifact | null;
  onClose: () => void;
  getAgentName: (agentId?: string) => string;
}

export const ArtifactModal: React.FC<ArtifactModalProps> = ({
  artifact,
  onClose,
  getAgentName
}) => {
  const [copied, setCopied] = useState(false);

  if (!artifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-amber-300/80 bg-amber-50 flex items-center justify-center text-amber-700 shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{artifact.title}</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 font-mono uppercase text-amber-900 font-medium shadow-2xs">
                  {artifact.type}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">v{artifact.version}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">{artifact.filename}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 cursor-pointer transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-slate-400" />
              <span>Author: {getAgentName(artifact.createdByAgentId)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Created: {new Date(artifact.createdAt).toLocaleString()}</span>
            </span>
          </div>
          <span className="text-slate-400 font-mono">Project Phoenix Workstream</span>
        </div>

        {/* Content Viewer */}
        <div className="p-6 flex-1 overflow-y-auto font-mono text-xs text-slate-800 leading-relaxed bg-[#F8F9FA] whitespace-pre-wrap select-text">
          {artifact.content}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
