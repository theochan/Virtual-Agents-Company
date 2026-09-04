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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded bg-[#0A0A0A] border border-[#1A1A1A] shadow-2xl flex flex-col max-h-[85vh] text-[#E0E0E0] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#F0F0F0]">{artifact.title}</h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 font-mono uppercase text-[#C5A358]">
                  {artifact.type}
                </span>
                <span className="text-[10px] text-[#666] font-mono">v{artifact.version}</span>
              </div>
              <p className="text-[11px] text-[#777] font-mono">{artifact.filename}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded border border-[#1A1A1A] bg-[#0A0A0A] hover:bg-[#111] text-[#CCC] hover:text-[#FFF] text-xs font-medium transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#888]" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button onClick={onClose} className="text-[#666] hover:text-[#FFF] text-sm cursor-pointer p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="px-6 py-2.5 bg-[#070707] border-b border-[#1A1A1A] flex items-center justify-between text-[11px] text-[#666]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-[#555]" />
              <span>Author: {getAgentName(artifact.createdByAgentId)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-[#555]" />
              <span>Created: {new Date(artifact.createdAt).toLocaleString()}</span>
            </span>
          </div>
          <span className="text-[#555]">Project Phoenix Workstream</span>
        </div>

        {/* Content Viewer */}
        <div className="p-6 flex-1 overflow-y-auto font-mono text-xs text-[#CCC] leading-relaxed bg-[#050505] whitespace-pre-wrap select-text">
          {artifact.content}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1A1A1A] bg-[#070707] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
