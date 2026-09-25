import React, { useState } from 'react';
import { GroundingMetadataInfo, AgentActionItem, CouncilDebateData } from '../types';
import { ThinkingProcessViewer } from './ThinkingProcessViewer';

interface SourcesViewerProps {
  metadata?: GroundingMetadataInfo;
  actions?: AgentActionItem[];
  thought?: string;
  thinkingDurationMs?: number;
  thinkingSummary?: string;
  councilMode?: boolean;
  councilDebate?: CouncilDebateData;
  onToggleCouncil?: () => void;
  questionsExplored?: string[];
}

export const SourcesViewer: React.FC<SourcesViewerProps> = ({
  metadata,
  actions = [],
  thought,
  thinkingDurationMs,
  thinkingSummary,
  councilMode = false,
  councilDebate,
  onToggleCouncil,
  questionsExplored = []
}) => {
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);

  const sources = metadata?.webSources || [];
  const searchQueries = metadata?.searchQueries || [];
  const hasSources = sources.length > 0;
  const hasThought = Boolean(thought && thought.trim().length > 0);
  const hasCouncil = Boolean(councilDebate && councilDebate.perspectives && councilDebate.perspectives.length > 0);
  const hasActions = actions.length > 0;

  if (!hasSources && !hasThought && !hasActions && !hasCouncil) {
    return null;
  }

  // Derive questions from queries or metadata if not passed directly
  const derivedQuestions = questionsExplored.length > 0 
    ? questionsExplored 
    : searchQueries.map(q => q.endsWith('?') ? q : `What are the latest facts regarding: "${q}"?`);

  return (
    <div className="my-2 space-y-2 font-sans max-w-full overflow-hidden">
      
      {/* Interactive Status & Trigger Bar */}
      <div className="flex items-center flex-wrap gap-2 text-xs max-w-full">
        
        {/* Collapsible Thinking Process Component with Syntax-Highlighted Reasoning Steps */}
        {(hasThought || hasActions || hasCouncil) && (
          <ThinkingProcessViewer
            thought={thought}
            thinkingDurationMs={thinkingDurationMs}
            thinkingSummary={thinkingSummary}
            actions={actions}
            councilMode={councilMode}
            councilDebate={councilDebate}
            onToggleCouncil={onToggleCouncil}
          />
        )}

        {/* Sources Pill Button */}
        {hasSources && (
          <button
            type="button"
            onClick={() => setIsSourcesOpen(prev => !prev)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-medium shadow-sm max-w-full ${
              isSourcesOpen 
                ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-200' 
                : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-cyan-500/40'
            }`}
            title="Inspect Grounding Web Sources"
          >
            {/* Favicons Stack */}
            <div className="flex items-center -space-x-1">
              {sources.slice(0, 3).map((s, idx) => (
                <img
                  key={idx}
                  src={s.iconUrl || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(s.domain || s.uri)}&sz=32`}
                  alt=""
                  className="w-3.5 h-3.5 rounded-full border border-black/50 bg-neutral-800 object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ))}
            </div>

            <span className="font-semibold text-[var(--text-primary)]">Verified Sources</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
              {sources.length}
            </span>

            <svg 
              className={`w-3.5 h-3.5 flex-shrink-0 text-cyan-400 transition-transform duration-200 ${isSourcesOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded Sources Modal / List View with Website Icons & Research Questions */}
      {isSourcesOpen && hasSources && (
        <div className="p-3 sm:p-3.5 rounded-2xl border border-cyan-500/30 bg-[#09121a] text-xs space-y-3 shadow-xl max-w-full overflow-hidden animate-in fade-in duration-150">
          
          <div className="flex items-center justify-between pb-2 border-b border-cyan-900/40">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Verified Search Grounding ({sources.length})
            </span>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/40">
              Live Google Search Grounding
            </span>
          </div>

          {/* Research Questions Explored */}
          {derivedQuestions.length > 0 && (
            <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/30 space-y-1.5">
              <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Research Inquiries Investigated
              </div>
              <ul className="space-y-1 pl-1 text-[11px] text-neutral-300">
                {derivedQuestions.slice(0, 4).map((q, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Search Queries Pill Cloud */}
          {searchQueries.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-neutral-400 font-semibold">Queries:</span>
              {searchQueries.map((q, qIdx) => (
                <span key={qIdx} className="px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 text-[10px] font-mono truncate max-w-xs">
                  "{q}"
                </span>
              ))}
            </div>
          )}

          {/* Sources Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scrollbar pt-1">
            {sources.map((src, idx) => {
              const domain = src.domain || (src.uri.startsWith('http') ? new URL(src.uri).hostname.replace(/^www\./, '') : src.uri);
              const icon = src.iconUrl || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

              return (
                <a
                  key={idx}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800/90 border border-neutral-800 hover:border-cyan-500/50 transition-all flex items-start space-x-2.5 group min-w-0 overflow-hidden"
                >
                  <img
                    src={icon}
                    alt=""
                    className="w-5 h-5 rounded-md bg-neutral-800 p-0.5 border border-neutral-700 flex-shrink-0 mt-0.5"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://www.google.com/favicon.ico';
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-300 line-clamp-1">
                      {src.title || domain}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono truncate mt-0.5">
                      {domain}
                    </div>
                  </div>

                  <svg className="w-3.5 h-3.5 text-neutral-500 group-hover:text-cyan-400 flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
