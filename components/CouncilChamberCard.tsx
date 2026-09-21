import React, { useState } from 'react';
import { CouncilDebateData } from '../types';

interface CouncilChamberCardProps {
  data: CouncilDebateData;
  onCopyAgreement?: () => void;
}

export const CouncilChamberCard: React.FC<CouncilChamberCardProps> = ({
  data,
  onCopyAgreement
}) => {
  const [activeTab, setActiveTab] = useState<'agreement' | 'perspectives'>('agreement');
  const [selectedAgentIdx, setSelectedAgentIdx] = useState<number>(0);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.finalAgreement || data.consensusSummary);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    if (onCopyAgreement) onCopyAgreement();
  };

  const currentAgent = data.perspectives?.[selectedAgentIdx] || data.perspectives?.[0];

  return (
    <div className="my-3 rounded-2xl border border-amber-500/40 bg-[#121118] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-2 max-w-full">
      
      {/* Header Banner */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-950/70 via-[#1e1724] to-purple-950/70 border-b border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 flex-shrink-0 shadow-inner">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="text-xs sm:text-sm font-bold text-amber-200 tracking-wide truncate">
                Council Chamber
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0">
                Consensus Reached
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 line-clamp-1 max-w-sm sm:max-w-md">
              Multi-agent deliberation: &quot;{data.topic}&quot;
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-0.5 rounded-xl bg-black/50 border border-white/10 text-xs flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('agreement')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'agreement'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Unified Agreement
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('perspectives')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'perspectives'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Stances ({data.perspectives?.length || 0})
          </button>
        </div>
      </div>

      {/* Main Chamber Body */}
      <div className="p-3 sm:p-4">
        
        {activeTab === 'agreement' ? (
          <div className="space-y-3.5">
            {/* Executive Consensus summary */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100/90 leading-relaxed">
              <div className="flex items-center space-x-1.5 font-bold text-amber-300 uppercase tracking-wider text-[10px] mb-1">
                <span>Consensus Summary</span>
              </div>
              <p>{data.consensusSummary}</p>
            </div>

            {/* Comprehensive Unified Agreement */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Ratified Resolution</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white text-[11px] font-medium flex items-center space-x-1 transition-all"
                >
                  {isCopied ? (
                    <span className="text-emerald-400 font-bold">Copied</span>
                  ) : (
                    <span>Copy Text</span>
                  )}
                </button>
              </div>

              <div className="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans">
                {data.finalAgreement}
              </div>
            </div>

            {/* Council Agent Roster */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-[11px] text-neutral-400">Ratified By Agents:</span>
              <div className="flex items-center space-x-1.5 flex-wrap">
                {data.perspectives?.map((agent, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedAgentIdx(i);
                      setActiveTab('perspectives');
                    }}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 transition-colors text-[11px]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span className="font-medium">{agent.agentName.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Perspectives & Deliberation Log */
          <div className="space-y-3.5">
            {/* Agent Selector Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {data.perspectives?.map((agent, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedAgentIdx(i)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-xs whitespace-nowrap transition-all ${
                    selectedAgentIdx === i
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold shadow-md'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <div className="text-left">
                    <div className="font-semibold leading-none">{agent.agentName}</div>
                    <div className="text-[9px] text-neutral-400 leading-none mt-0.5">{agent.role}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Agent Card Details */}
            {currentAgent && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center space-x-2 pb-2 border-b border-white/10">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                    {currentAgent.agentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white">{currentAgent.agentName}</div>
                    <div className="text-[11px] text-neutral-400">{currentAgent.role}</div>
                  </div>
                </div>

                {/* Stances Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Initial Stance
                    </div>
                    <p className="text-xs text-neutral-200 leading-relaxed">
                      {currentAgent.initialStance}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/20 space-y-1">
                    <div className="text-[10px] font-bold text-red-300 uppercase tracking-wider">
                      Critique & Counterpoints
                    </div>
                    <p className="text-xs text-neutral-200 leading-relaxed">
                      {currentAgent.critique}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-1">
                    <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                      Revised Consensus Stance
                    </div>
                    <p className="text-xs text-neutral-200 leading-relaxed">
                      {currentAgent.revisedStance}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
