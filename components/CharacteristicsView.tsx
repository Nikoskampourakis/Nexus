import React, { useState } from 'react';
import { PersonaCharacteristics, CharacteristicLevel } from '../types';

interface CharacteristicsViewProps {
  characteristics: PersonaCharacteristics;
  onChange: (updated: PersonaCharacteristics) => void;
  onReset: () => void;
  onBack?: () => void;
  isModal?: boolean;
}

interface ItemConfig {
  key: keyof PersonaCharacteristics;
  label: string;
  description: string;
}

const ITEMS: ItemConfig[] = [
  {
    key: 'warmth',
    label: 'Warmth',
    description: 'Adjusts empathy, validation, and emotional resonance in responses.'
  },
  {
    key: 'enthusiasm',
    label: 'Enthusiasm',
    description: 'Controls dynamic energy, excitement, and exclamation levels.'
  },
  {
    key: 'headersAndLists',
    label: 'Headers and Lists',
    description: 'Governs preference for structured headings and bullet points vs narrative prose.'
  },
  {
    key: 'emoji',
    label: 'Emoji',
    description: 'Controls the frequency of expressive emojis throughout replies.'
  }
];

export const CharacteristicsView: React.FC<CharacteristicsViewProps> = ({
  characteristics,
  onChange,
  onReset,
  onBack,
  isModal = false
}) => {
  const [expandedKey, setExpandedKey] = useState<keyof PersonaCharacteristics | null>(null);

  const handleSelectLevel = (key: keyof PersonaCharacteristics, level: CharacteristicLevel) => {
    onChange({
      ...characteristics,
      [key]: level
    });
  };

  const toggleExpand = (key: keyof PersonaCharacteristics) => {
    setExpandedKey(prev => prev === key ? null : key);
  };

  const getLevelBadge = (level: CharacteristicLevel) => {
    switch (level) {
      case 'more':
        return <span className="text-[11px] font-semibold text-emerald-400 capitalize bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">More</span>;
      case 'less':
        return <span className="text-[11px] font-semibold text-amber-400 capitalize bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">Less</span>;
      case 'balanced':
      default:
        return <span className="text-[11px] font-semibold text-zinc-300 capitalize bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/50">Balanced</span>;
    }
  };

  return (
    <div className={`w-full max-w-lg mx-auto bg-black text-white ${isModal ? 'p-4 sm:p-6 rounded-3xl border border-zinc-800 shadow-2xl' : 'p-4'}`}>
      {/* Header matching user image */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-zinc-900">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-zinc-900/90 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-all border border-zinc-800 active:scale-95"
              title="Back"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight text-white">Characteristics</h1>
        </div>
        <span className="text-xs text-zinc-400 font-mono">Fine-Tuning</span>
      </div>

      {/* Accordion List Cards matching the screenshot */}
      <div className="space-y-3">
        {ITEMS.map((item) => {
          const isExpanded = expandedKey === item.key;
          const currentLevel = characteristics[item.key];

          return (
            <div 
              key={item.key}
              className="rounded-2xl bg-[#212121] border border-zinc-800/80 overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggleExpand(item.key)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-zinc-100">{item.label}</span>
                  {getLevelBadge(currentLevel)}
                </div>

                <div className="flex items-center space-x-2">
                  <svg 
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expandable Menu: More, Balanced, Less */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-1 border-t border-zinc-800/60 bg-zinc-900/40">
                  <p className="text-xs text-zinc-400 mb-3">{item.description}</p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {(['less', 'balanced', 'more'] as CharacteristicLevel[]).map((level) => {
                      const isSelected = currentLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => handleSelectLevel(item.key, level)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-zinc-100 text-black border-white shadow-md scale-[1.02]'
                              : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-700 hover:text-white'
                          }`}
                        >
                          <span>{level}</span>
                          {level === 'more' && <span className="text-[10px] opacity-70">+20%</span>}
                          {level === 'balanced' && <span className="text-[10px] opacity-70">Default</span>}
                          {level === 'less' && <span className="text-[10px] opacity-70">-20%</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset characteristics button matching the screenshot */}
      <div className="mt-5">
        <button
          type="button"
          onClick={onReset}
          className="w-full py-4 px-5 rounded-2xl bg-[#212121] hover:bg-zinc-800 border border-zinc-800 text-[#f87171] hover:text-red-400 font-semibold text-sm transition-all text-left flex items-center justify-between active:scale-[0.99]"
        >
          <span>Reset characteristics</span>
          <svg className="w-4 h-4 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
};
