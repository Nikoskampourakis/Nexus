import React, { useState, useEffect } from 'react';
import { AutoSaveEventDetail, getAutoSaveStatus, subscribeAutoSave, forceImmediateAutoSave } from '../services/autoSaveService';

interface AutoSaveIndicatorProps {
  className?: string;
  showTextOnMobile?: boolean;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ 
  className = '',
  showTextOnMobile = false
}) => {
  const [saveState, setSaveState] = useState<AutoSaveEventDetail>({
    status: getAutoSaveStatus().status,
    timestamp: getAutoSaveStatus().lastSavedTime
  });
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeAutoSave((detail) => {
      setSaveState(detail);
    });
    return unsubscribe;
  }, []);

  const formatTime = (ts: number) => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'just now';
    }
  };

  const handleManualSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    forceImmediateAutoSave('User clicked save');
  };

  return (
    <div 
      className={`relative inline-flex items-center select-none ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleManualSave}
        title="Click to force immediate save"
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-all duration-300 border ${
          saveState.status === 'saving'
            ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
            : saveState.status === 'error'
            ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            : 'bg-black/20 hover:bg-black/40 border-emerald-500/30 text-emerald-300/90 hover:border-emerald-500/50'
        }`}
      >
        {/* Status Dot / Spinner */}
        {saveState.status === 'saving' ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
        ) : saveState.status === 'error' ? (
          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
        ) : (
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
        )}

        {/* Text */}
        <span className={`${showTextOnMobile ? 'inline' : 'hidden sm:inline'} text-[10px] tracking-tight font-mono`}>
          {saveState.status === 'saving' ? 'Auto-saving...' : saveState.status === 'error' ? 'Save error' : 'Auto-saved'}
        </span>
      </button>

      {/* Hover Info Tooltip */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 px-2.5 py-1.5 rounded-lg bg-[#14141e] border border-white/10 text-white shadow-xl text-[10px] whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">✓ Auto-Save active</span>
            <span className="text-gray-400">• Last saved {formatTime(saveState.timestamp)}</span>
          </div>
          <div className="text-[9px] text-gray-500 mt-0.5">Click to force instant backup</div>
        </div>
      )}
    </div>
  );
};
