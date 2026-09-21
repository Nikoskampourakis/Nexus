import React, { useState, useMemo } from 'react';
import { AgentActionItem, CouncilDebateData } from '../types';

interface ThinkingProcessViewerProps {
  thought?: string;
  thinkingDurationMs?: number;
  thinkingSummary?: string;
  actions?: AgentActionItem[];
  councilMode?: boolean;
  councilDebate?: CouncilDebateData;
  onToggleCouncil?: () => void;
  defaultExpanded?: boolean;
}

// Logic syntax tokenizer specifically tailored for reasoning streams
const highlightLogicLine = (line: string): React.ReactNode => {
  // Check for step/header comment style
  const isStepHeader = /^(\s*)(?:\[?(?:STEP\s*\d+|PHASE\s*\d+|STAGE\s*\d+|GOAL|HYPOTHESIS|PREMISE|ANALYSIS|EVIDENCE|DEDUCTION|VERIFICATION|CHECK|CONCLUSION|COUNTER-ARGUMENT)\]?:?)/i.test(line);
  if (isStepHeader) {
    return (
      <span className="text-emerald-400 font-semibold tracking-wide">
        {line}
      </span>
    );
  }

  // Comment style
  if (/^\s*(?:\/\/|#|\/\*)/.test(line)) {
    return <span className="text-neutral-500 italic">{line}</span>;
  }

  // Tokenize keywords, logical operators, strings, numbers, booleans
  const tokenRegex = /(".*?"|'.*?'|`.*?`|\b(?:GIVEN|ASSUME|SUPPOSE|IF|THEN|ELSE|BECAUSE|THEREFORE|SINCE|IMPLIES|AND|OR|NOT|TRUE|FALSE|VALID|INVALID|VERIFIED|DISPROVED|CONTRADICTION|DEDUCE|EVALUATE|RESOLVE|STEP|GOAL|CHECK|RULE|ASSERT)\b|=>|->|!=|==|<=|>=|:=|\|\||&&|\b\d+(?:\.\d+)?%?\b)/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} className="text-neutral-300">
          {line.substring(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];
    const upperToken = token.toUpperCase();

    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      parts.push(<span key={match.index} className="text-amber-300">{token}</span>);
    } else if (/^(?:GIVEN|ASSUME|SUPPOSE|IF|THEN|ELSE|BECAUSE|THEREFORE|SINCE|IMPLIES|DEDUCE|EVALUATE|RESOLVE|ASSERT)$/i.test(upperToken)) {
      parts.push(<span key={match.index} className="text-cyan-400 font-semibold">{token}</span>);
    } else if (/^(?:TRUE|FALSE|VALID|INVALID|VERIFIED|DISPROVED|CONTRADICTION)$/i.test(upperToken)) {
      parts.push(<span key={match.index} className="text-purple-400 font-bold">{token}</span>);
    } else if (/^(?:AND|OR|NOT)$/i.test(upperToken)) {
      parts.push(<span key={match.index} className="text-pink-400 font-medium">{token}</span>);
    } else if (/^(?:=>|->|!=|==|<=|>=|:=|\|\||&&)$/.test(token)) {
      parts.push(<span key={match.index} className="text-emerald-400 font-bold">{token}</span>);
    } else if (/^\d+(?:\.\d+)?%?$/.test(token)) {
      parts.push(<span key={match.index} className="text-orange-400 font-mono">{token}</span>);
    } else {
      parts.push(<span key={match.index} className="text-neutral-300">{token}</span>);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(
      <span key={lastIndex} className="text-neutral-300">
        {line.substring(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : <span className="text-neutral-300">{line}</span>;
};

// Formats raw thinking text into clean logical reasoning steps pseudo-code
const formatRawThoughtsToLogicalSteps = (raw: string): string => {
  const clean = raw.trim();
  if (!clean) return '';

  const lines = clean.split('\n');
  const formattedLines: string[] = [];
  let stepCount = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      continue;
    }

    // Detect if the line already looks like a structured step
    const stepMatch = rawLine.match(/^(?:(?:step|phase|stage)\s*(\d+)[:.]?|(?:[#*]{1,3}\s*)?(?:Analysis|Hypothesis|Premise|Evidence|Verification|Conclusion)[:.]?)/i);

    if (stepMatch) {
      formattedLines.push(`// [STEP ${stepCount++}: ${rawLine.replace(/^[#*-\s]+/, '')}]`);
    } else if (rawLine.startsWith('* ') || rawLine.startsWith('- ') || /^\d+\./.test(rawLine)) {
      formattedLines.push(`  -> ${rawLine.replace(/^[*-\d.]+\s*/, '')}`);
    } else {
      formattedLines.push(rawLine);
    }
  }

  return formattedLines.join('\n');
};

export const ThinkingProcessViewer: React.FC<ThinkingProcessViewerProps> = ({
  thought,
  thinkingDurationMs,
  thinkingSummary,
  actions = [],
  councilMode = false,
  councilDebate,
  onToggleCouncil,
  defaultExpanded = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [isCodeViewOpen, setIsCodeViewOpen] = useState(true);
  const [isWrapLines, setIsWrapLines] = useState(true);
  const [copied, setCopied] = useState(false);

  const hasThought = Boolean(thought && thought.trim().length > 0);
  const hasCouncil = Boolean(councilDebate && councilDebate.perspectives && councilDebate.perspectives.length > 0);
  const hasActions = actions.length > 0;

  // Format code content
  const formattedCode = useMemo(() => {
    if (thought) return formatRawThoughtsToLogicalSteps(thought);
    if (hasCouncil && councilDebate) {
      const lines: string[] = [
        `// [COUNCIL DELIBERATION: ${councilDebate.topic}]`,
        `// Consensus Reached: ${councilDebate.consensusReached ? 'TRUE' : 'FALSE'}`,
        ''
      ];
      councilDebate.perspectives.forEach((p, idx) => {
        lines.push(`// [AGENT ${idx + 1}: ${p.agentName} (${p.role})]`);
        lines.push(`  -> Initial Stance: "${p.initialStance}"`);
        if (p.critique) lines.push(`  -> Critique / Counter: "${p.critique}"`);
        if (p.revisedStance) lines.push(`  -> Final Position: "${p.revisedStance}"`);
        lines.push('');
      });
      if (councilDebate.consensusSummary) {
        lines.push(`// [COUNCIL CONSENSUS SYNTHESIS]`);
        lines.push(`  => ${councilDebate.consensusSummary}`);
      }
      return lines.join('\n');
    }
    return '';
  }, [thought, hasCouncil, councilDebate]);

  const codeLines = useMemo(() => {
    return formattedCode ? formattedCode.split('\n') : [];
  }, [formattedCode]);

  if (!hasThought && !hasCouncil && !hasActions) {
    return null;
  }

  // Derive short clean summary
  const derivedSummary = thinkingSummary || (thought ? (() => {
    const clean = thought.replace(/[*_#`]/g, '').trim();
    const firstLine = clean.split(/[.\n]/).map(s => s.trim()).filter(Boolean)[0] || '';
    if (firstLine.length > 130) {
      return firstLine.slice(0, 127) + '...';
    }
    return firstLine;
  })() : councilDebate?.consensusSummary ? `Council consensus: ${councilDebate.consensusSummary}` : '');

  const handleCopyCode = () => {
    if (!formattedCode) return;
    navigator.clipboard.writeText(formattedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const durationSec = thinkingDurationMs ? (thinkingDurationMs / 1000).toFixed(1) : null;

  return (
    <div className="my-2 font-sans max-w-full overflow-hidden">
      {/* Collapsible Pill Trigger Button - Keeps Main Interface Clean */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium shadow-sm max-w-full ${
          isOpen
            ? 'bg-purple-950/70 border-purple-500/60 text-purple-200'
            : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-purple-500/40'
        }`}
        title="Toggle logical reasoning process"
      >
        <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 animate-pulse" />
        
        <span className="font-semibold text-purple-200 truncate">
          {hasCouncil ? 'Council Deliberation' : durationSec ? `Thought for ${durationSec}s` : 'Thinking Process'}
        </span>

        {codeLines.length > 0 && (
          <span className="text-[10px] text-purple-300 font-mono bg-purple-900/40 px-1.5 py-0.2 rounded border border-purple-700/40">
            {codeLines.length} lines
          </span>
        )}

        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 text-purple-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Collapsible Drawer */}
      {isOpen && (
        <div className="mt-2 p-3 sm:p-4 rounded-2xl border border-purple-500/30 bg-[#0d0d16] text-xs space-y-3 shadow-xl max-w-full overflow-hidden animate-in fade-in duration-150">
          
          {/* Top Bar: Title, Duration Badge */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-purple-900/40">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-purple-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {hasCouncil ? 'AI Council Deliberation & Logic' : 'Logical Reasoning Chain'}
              </span>

              {durationSec && (
                <span className="text-[10px] text-purple-400 font-mono bg-purple-950 px-2 py-0.5 rounded border border-purple-800/40">
                  Duration: {durationSec}s
                </span>
              )}
            </div>
          </div>

          {/* Reasoning Summary Card */}
          {derivedSummary && (
            <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-neutral-200 text-xs leading-relaxed font-sans">
              <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1">
                {hasCouncil ? 'Executive Consensus' : 'Reasoning Focus'}
              </div>
              <p>{derivedSummary}</p>
            </div>
          )}

          {/* Council Perspectives if present */}
          {hasCouncil && councilDebate && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                Deliberating Agent Perspectives
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {councilDebate.perspectives.map((persp, pIdx) => (
                  <div key={pIdx} className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-800/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-200 text-xs">{persp.agentName}</span>
                      <span className="text-[9px] text-neutral-400">{persp.role}</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 line-clamp-3 italic">
                      "{persp.initialStance}"
                    </p>
                    {persp.revisedStance && (
                      <div className="text-[10px] text-emerald-400 font-medium">
                        Agreed: {persp.revisedStance}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Syntax-Highlighted Code Block for Raw Logical Reasoning Steps */}
          {codeLines.length > 0 && (
            <div className="pt-2 border-t border-purple-900/40 space-y-2">
              
              {/* Code Block Header Controls */}
              <div className="flex items-center justify-between flex-wrap gap-2 bg-[#12111d] px-3 py-1.5 rounded-t-xl border border-purple-900/50 border-b-0">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCodeViewOpen(prev => !prev)}
                    className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-1.5 hover:text-white"
                  >
                    <svg className={`w-3.5 h-3.5 transition-transform ${isCodeViewOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>Raw Logical Steps</span>
                  </button>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-800/40">
                    syntax: logic
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsWrapLines(prev => !prev)}
                    className="text-[10px] text-neutral-400 hover:text-neutral-200 px-1.5 py-0.5 rounded bg-white/5"
                    title="Toggle line wrapping"
                  >
                    {isWrapLines ? 'Wrap On' : 'Wrap Off'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-medium px-2 py-0.5 rounded bg-purple-950 border border-purple-800/40 transition-colors"
                  >
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
              </div>

              {/* Collapsible Syntax-Highlighted Code View */}
              {isCodeViewOpen && (
                <div className="rounded-b-xl overflow-hidden border border-purple-900/50 bg-[#09090f] shadow-inner">
                  <div className="max-h-72 overflow-y-auto overflow-x-auto custom-scrollbar p-2.5 font-mono text-xs leading-relaxed">
                    <div className="table w-full">
                      {codeLines.map((line, idx) => (
                        <div key={idx} className="table-row hover:bg-purple-950/20 transition-colors">
                          <span className="table-cell select-none text-right pr-3.5 text-neutral-600 text-[10px] font-mono align-top w-8">
                            {idx + 1}
                          </span>
                          <span className={`table-cell font-mono text-[11px] align-top ${
                            isWrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                          }`}>
                            {highlightLogicLine(line)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}
    </div>
  );
};
