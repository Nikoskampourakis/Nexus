import React, { useState } from 'react';

export interface DeepDiveData {
  title?: string;
  verdict: string;
  keyTakeaways?: string[];
  criticalNuance?: string;
  confidence?: number;
  sourcesExamined?: number;
}

export interface MediaLinkItem {
  type: 'video' | 'image';
  title: string;
  url: string;
  platform?: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface MediaLinksData {
  title?: string;
  items: MediaLinkItem[];
}

export interface CorrectionAuditPoint {
  claim: string;
  status: 'accurate' | 'disputed' | 'incorrect';
  evidence: string;
  correction?: string;
}

export interface CorrectionAuditData {
  targetClaimSummary: string;
  verdict: 'VERIFIED_ACCURATE' | 'MINOR_INACCURACIES' | 'CORRECTION_NEEDED';
  overallAccuracy?: number;
  pointsChecked: CorrectionAuditPoint[];
  conclusion: string;
}

// --- Deep Dive Conclusion Card ---
export const DeepDiveCard: React.FC<{ data: DeepDiveData }> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="my-3 rounded-2xl border border-blue-500/30 bg-[#09111e] shadow-xl overflow-hidden font-sans text-xs">
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="px-3.5 py-2.5 bg-blue-950/40 border-b border-blue-900/40 flex items-center justify-between cursor-pointer select-none hover:bg-blue-950/60 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-bold text-blue-200 uppercase tracking-wider text-[11px]">
            {data.title || 'Deep Dive Conclusion & Strategic Takeaways'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {data.confidence !== undefined && (
            <span className="text-[10px] font-mono text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded border border-blue-700/50">
              Confidence: {data.confidence}%
            </span>
          )}
          <svg className={`w-3.5 h-3.5 text-blue-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content Body */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 text-neutral-200">
          
          {/* Main Verdict */}
          <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/30 space-y-1">
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
              Core Verdict
            </div>
            <p className="text-sm font-medium text-white leading-relaxed">
              {data.verdict}
            </p>
          </div>

          {/* Key Takeaways */}
          {data.keyTakeaways && data.keyTakeaways.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Strategic Takeaways
              </div>
              <ul className="space-y-1.5 pl-1">
                {data.keyTakeaways.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <span className="text-neutral-300 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Critical Nuance / Caveats */}
          {data.criticalNuance && (
            <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
              <span className="font-bold uppercase tracking-wider mr-1 text-[10px] text-amber-300">
                Critical Nuance:
              </span>
              {data.criticalNuance}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Media Links Card (Videos & Images search results) ---
export const MediaLinksCard: React.FC<{ data: MediaLinksData }> = ({ data }) => {
  const items = data.items || [];
  if (items.length === 0) return null;

  return (
    <div className="my-3 rounded-2xl border border-cyan-500/30 bg-[#081219] shadow-xl overflow-hidden font-sans text-xs">
      <div className="px-3.5 py-2.5 bg-cyan-950/40 border-b border-cyan-900/40 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-bold text-cyan-200 uppercase tracking-wider text-[11px]">
            {data.title || 'Discovered Video & Image Media'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-900/50 px-2 py-0.5 rounded border border-cyan-700/50">
          {items.length} {items.length > 1 ? 'Links' : 'Link'}
        </span>
      </div>

      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((item, idx) => {
          const isVideo = item.type === 'video' || /youtube\.com|youtu\.be|vimeo/i.test(item.url);
          const isYouTube = /youtube\.com|youtu\.be/i.test(item.url);

          // Extract YouTube ID if possible for clean preview thumbnail
          let ytId: string | null = null;
          if (isYouTube) {
            const m = item.url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
            if (m && m[1] && m[1].length === 11) {
              ytId = m[1];
            }
          }

          const thumb = item.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);

          return (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between group min-w-0"
            >
              <div>
                {thumb && (
                  <div className="relative w-full h-28 rounded-lg overflow-hidden mb-2 bg-black/60 border border-white/5">
                    <img
                      src={thumb}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg">
                          <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-1.5 mb-1">
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold ${
                    isVideo ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {isVideo ? (item.platform || 'Video') : 'Image'}
                  </span>
                </div>

                <h4 className="font-semibold text-neutral-100 group-hover:text-cyan-300 line-clamp-2 leading-snug">
                  {item.title}
                </h4>

                {item.description && (
                  <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-cyan-400 font-medium">
                <span>{isVideo ? 'Watch Video' : 'Open Image Link'}</span>
                <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};

// --- Correction Audit Card (Fact-Check & Discrepancy Verification) ---
export const CorrectionAuditCard: React.FC<{ data: CorrectionAuditData }> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const isAccurate = data.verdict === 'VERIFIED_ACCURATE';
  const isMinor = data.verdict === 'MINOR_INACCURACIES';

  const badgeColor = isAccurate
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : isMinor
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

  const label = isAccurate
    ? 'Verified Accurate'
    : isMinor
    ? 'Minor Discrepancies Found'
    : 'Corrections Required';

  return (
    <div className="my-3 rounded-2xl border border-rose-500/30 bg-[#160c0f] shadow-xl overflow-hidden font-sans text-xs">
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="px-3.5 py-2.5 bg-rose-950/40 border-b border-rose-900/40 flex items-center justify-between cursor-pointer select-none hover:bg-rose-950/60 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-bold text-rose-200 uppercase tracking-wider text-[11px]">
            Correction Audit & Fact-Check Report
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${badgeColor}`}>
            {label}
          </span>
          <svg className={`w-3.5 h-3.5 text-rose-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 text-neutral-200">
          
          {/* Target Claim Under Audit */}
          {data.targetClaimSummary && (
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Audited Research Claims
              </div>
              <p className="text-neutral-300 italic text-[11px]">
                "{data.targetClaimSummary}"
              </p>
            </div>
          )}

          {/* Points Checked List */}
          {data.pointsChecked && data.pointsChecked.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Claim-by-Claim Verification
              </div>

              <div className="space-y-2">
                {data.pointsChecked.map((pt, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-black/50 border border-rose-900/30 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-neutral-100 text-xs">
                        {pt.claim}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold flex-shrink-0 border ${
                        pt.status === 'accurate' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        pt.status === 'disputed' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {pt.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-400">
                      <span className="text-neutral-300 font-medium">Evidence: </span>
                      {pt.evidence}
                    </div>

                    {pt.correction && (
                      <div className="p-2 rounded bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-200">
                        <span className="font-bold text-rose-400 uppercase text-[9px] block">Verified Correction:</span>
                        {pt.correction}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conclusion */}
          {data.conclusion && (
            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-100 text-xs leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-[10px] text-rose-300 mr-1">
                Audit Conclusion:
              </span>
              {data.conclusion}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
