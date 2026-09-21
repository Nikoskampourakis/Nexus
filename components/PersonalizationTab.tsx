import React, { useState, useEffect } from 'react';
import { 
  PersonalizationConfig, 
  PersonaTone, 
  PersonaCharacteristics, 
  CustomPromptItem 
} from '../types';
import { 
  getPersonalizationConfig, 
  savePersonalizationConfig, 
  resetCharacteristics,
  resetToOriginalDefault,
  DEFAULT_PERSONALIZATION_CONFIG,
  DEFAULT_CUSTOM_PROMPTS
} from '../services/personalizationService';
import { CharacteristicsView } from './CharacteristicsView';

interface PersonalizationTabProps {
  onToggleSidebar?: () => void;
  onBackToChat: () => void;
}

interface ToneDefinition {
  id: PersonaTone;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  badgeColor: string;
  iconSvg: React.ReactNode;
}

const TONES: ToneDefinition[] = [
  {
    id: 'default',
    name: 'Default',
    tagline: 'Standard AI (Pre-personalities)',
    description: 'Clean, neutral, and unprompted baseline model response — the original experience before custom personalities were added.',
    badge: 'Original Neutral',
    badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
    iconSvg: (
      <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
      </svg>
    )
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'Style and serious',
    description: 'Maintains elegance, poise, executive authority, and serious analytical depth.',
    badge: 'Executive',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    iconSvg: (
      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'friendly',
    name: 'Friendly',
    tagline: 'Nice but accurate',
    description: 'Warm, empathetic, and encouraging, while upholding uncompromising factual precision.',
    badge: 'Warm & Exact',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    iconSvg: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'honest',
    name: 'Honest',
    tagline: 'Maximise progress & radical candor',
    description: 'Thorough scrutiny to maximise progress while still being loyal and honest about real progress.',
    badge: 'Radical Candor',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    iconSvg: (
      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  },
  {
    id: 'irregular',
    name: 'Irregular',
    tagline: 'Playful but also childish',
    description: 'Filled with playful curiosity, imaginative banter, and cheerful childish enthusiasm.',
    badge: 'Playful & Quirky',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    iconSvg: (
      <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M12 2a10 10 0 100 20 10 10 0 000-20zm0 14a4 4 0 01-4-4h8a4 4 0 01-4 4z" />
      </svg>
    )
  },
  {
    id: 'effective',
    name: 'Effective',
    tagline: 'Accurate but simple, only the goal',
    description: 'Accurate and simple. Laser-focused purely on getting through the goal and that is it.',
    badge: 'Zero Fluff',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    iconSvg: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    id: 'cynical',
    name: 'Cynical',
    tagline: 'Sarcastic and funny',
    description: 'Razor-sharp satirical wit, humorous cynicism, and deadpan irony with correct solutions.',
    badge: 'Satirical Wit',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    iconSvg: (
      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    )
  }
];

export const PersonalizationTab: React.FC<PersonalizationTabProps> = ({
  onToggleSidebar,
  onBackToChat
}) => {
  const [config, setConfig] = useState<PersonalizationConfig>(getPersonalizationConfig());
  const [showCharacteristicsModal, setShowCharacteristicsModal] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Custom Prompt Creation State
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);

  useEffect(() => {
    setConfig(getPersonalizationConfig());
  }, []);

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSelectTone = (tone: PersonaTone) => {
    const updated = { ...config, tone };
    setConfig(updated);
    savePersonalizationConfig(updated);
    triggerToast(`Persona tone set to: ${tone.toUpperCase()}`);
  };

  const handleCharacteristicsChange = (updatedChars: PersonaCharacteristics) => {
    const updated = { ...config, characteristics: updatedChars };
    setConfig(updated);
    savePersonalizationConfig(updated);
    triggerToast('Characteristics updated');
  };

  const handleResetCharacteristics = () => {
    const updated = resetCharacteristics(config);
    setConfig(updated);
    triggerToast('Characteristics reset to balanced defaults');
  };

  const handleResetAll = () => {
    const updated = resetToOriginalDefault();
    setConfig(updated);
    triggerToast('All personalization reset to Default (Vanilla AI)');
  };

  const handleToggleInstructions = (enabled: boolean) => {
    const updated = {
      ...config,
      customInstructions: {
        ...config.customInstructions,
        enabled
      }
    };
    setConfig(updated);
    savePersonalizationConfig(updated);
    triggerToast(enabled ? 'Custom instructions enabled' : 'Custom instructions disabled');
  };

  const handleInstructionsChange = (field: 'aboutUser' | 'responseStyle', value: string) => {
    const updated = {
      ...config,
      customInstructions: {
        ...config.customInstructions,
        [field]: value
      }
    };
    setConfig(updated);
    savePersonalizationConfig(updated);
  };

  const handleApplyPromptPreset = (prompt: string) => {
    const currentStyle = config.customInstructions.responseStyle;
    const combined = currentStyle.trim() 
      ? `${currentStyle.trim()}\n\n${prompt}` 
      : prompt;

    const updated = {
      ...config,
      customInstructions: {
        ...config.customInstructions,
        enabled: true,
        responseStyle: combined
      }
    };
    setConfig(updated);
    savePersonalizationConfig(updated);
    triggerToast('Prompt instructions appended to response style');
  };

  const handleCreatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptText.trim()) return;

    const newPrompt: CustomPromptItem = {
      id: `prompt_${Date.now()}`,
      title: newPromptTitle.trim(),
      category: 'Custom',
      description: newPromptText.slice(0, 60) + '...',
      prompt: newPromptText.trim()
    };

    const updatedPrompts = [...(config.customPrompts || DEFAULT_CUSTOM_PROMPTS), newPrompt];
    const updated = {
      ...config,
      customPrompts: updatedPrompts
    };

    setConfig(updated);
    savePersonalizationConfig(updated);
    setNewPromptTitle('');
    setNewPromptText('');
    setIsAddingPrompt(false);
    triggerToast(`Created prompt template: "${newPrompt.title}"`);
  };

  const handleDeletePrompt = (id: string) => {
    const filtered = (config.customPrompts || []).filter(p => p.id !== id);
    const updated = { ...config, customPrompts: filtered };
    setConfig(updated);
    savePersonalizationConfig(updated);
    triggerToast('Prompt preset removed');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--app-bg)] text-[var(--text-primary)] overflow-y-auto">
      {/* Top Header */}
      <header className="px-4 lg:px-8 py-4 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--card-bg)] hover:text-white"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Personalization</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                Neural Tuning
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] hidden sm:block">
              Shape persona tones, characteristics, and custom prompt guidelines
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Reset to Original Default Button */}
          <button
            onClick={handleResetAll}
            className="py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Reset all settings to Default (Vanilla AI without custom personalities)"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Reset to Default</span>
          </button>

          {/* Direct Characteristics Button */}
          <button
            onClick={() => setShowCharacteristicsModal(true)}
            className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Open Characteristics Menu"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Characteristics</span>
          </button>

          {/* Back to Chat */}
          <button
            onClick={onBackToChat}
            className="py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Chat Area</span>
          </button>
        </div>
      </header>

      {/* Floating Save Toast */}
      {saveToast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-900/95 border border-cyan-500/50 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-2.5 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-medium">{saveToast}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Section 1: Persona Archetypes */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Persona Archetype</span>
                <span className="text-xs text-[var(--text-secondary)] font-normal lowercase">(Default & 6 specialized tones)</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Select how the AI speaks, reasons, and handles interactions.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 capitalize px-2 py-0.5 bg-cyan-950/60 border border-cyan-800/60 rounded-lg">
              Active: {config.tone}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {TONES.map((t) => {
              const isSelected = config.tone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTone(t.id)}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-zinc-900/95 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50 scale-[1.01]'
                      : 'bg-[var(--card-bg)] hover:bg-zinc-900/60 border-[var(--border-color)] hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${isSelected ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-zinc-800/80 border-zinc-700/60'}`}>
                          {t.iconSvg}
                        </div>
                        <span className="text-sm font-bold text-white">{t.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.badgeColor}`}>
                        {t.badge}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-cyan-300/90 mb-1">"{t.tagline}"</p>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{t.description}</p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                    <span className={isSelected ? 'text-cyan-400 font-bold' : 'text-zinc-500'}>
                      {isSelected ? '✓ Currently Active' : 'Click to Activate'}
                    </span>
                    <span className="font-mono text-[10px] opacity-60">
                      {isSelected ? 'ENABLED' : 'INACTIVE'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Characteristics Card & Direct Menu Trigger */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                  Behavioral Characteristics
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Sliders
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Fine-tune Warmth, Enthusiasm, Headers and Lists, and Emoji levels (More, Balanced, Less).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetCharacteristics}
                className="py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-[#f87171] hover:text-red-300 text-xs font-semibold transition-all border border-zinc-700/60"
              >
                Reset characteristics
              </button>
              <button
                type="button"
                onClick={() => setShowCharacteristicsModal(true)}
                className="py-2 px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>Full Characteristics Screen</span>
              </button>
            </div>
          </div>

          {/* Inline Quick Grid matching image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {[
              { key: 'warmth' as const, label: 'Warmth' },
              { key: 'enthusiasm' as const, label: 'Enthusiasm' },
              { key: 'headersAndLists' as const, label: 'Headers and Lists' },
              { key: 'emoji' as const, label: 'Emoji' }
            ].map((item) => {
              const currentVal = config.characteristics[item.key];
              return (
                <div key={item.key} className="p-3.5 rounded-2xl bg-[#212121] border border-zinc-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">{item.label}</span>
                    <span className="text-[10px] font-mono capitalize text-cyan-300 font-bold">{currentVal}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    {(['less', 'balanced', 'more'] as const).map((lvl) => {
                      const isSel = currentVal === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => {
                            handleCharacteristicsChange({
                              ...config.characteristics,
                              [item.key]: lvl
                            });
                          }}
                          className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold capitalize border transition-all text-center ${
                            isSel
                              ? 'bg-zinc-100 text-black border-white shadow-sm'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700/60 hover:bg-zinc-700 hover:text-white'
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Custom Instructions & Prompts */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                  Custom Instructions & Prompts
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Global Directives
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Tell the AI what to know about you and how it should format and deliver answers.
              </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer self-start sm:self-center">
              <span className="text-xs font-semibold text-zinc-300">
                {config.customInstructions.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <div 
                onClick={() => handleToggleInstructions(!config.customInstructions.enabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                  config.customInstructions.enabled ? 'bg-cyan-500' : 'bg-zinc-700'
                }`}
              >
                <div 
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                    config.customInstructions.enabled ? 'translate-x-6' : ''
                  }`} 
                />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Field 1 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200 block">
                What would you like the AI to know about you to provide better responses?
              </label>
              <p className="text-[11px] text-[var(--text-secondary)]">
                e.g. Your job role, technical domain (TypeScript/React), project context, expertise level.
              </p>
              <textarea
                value={config.customInstructions.aboutUser}
                onChange={(e) => handleInstructionsChange('aboutUser', e.target.value)}
                placeholder="I am a software architect specializing in full-stack web applications..."
                rows={5}
                className="w-full bg-[#18181b] border border-zinc-800 focus:border-cyan-500 rounded-2xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all resize-none custom-scrollbar"
              />
            </div>

            {/* Field 2 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200 block">
                How would you like the AI to respond?
              </label>
              <p className="text-[11px] text-[var(--text-secondary)]">
                e.g. Formatting requirements, conciseness, code standards, citation rules, language.
              </p>
              <textarea
                value={config.customInstructions.responseStyle}
                onChange={(e) => handleInstructionsChange('responseStyle', e.target.value)}
                placeholder="Always provide clean modular code blocks, avoid unnecessary fluff, provide actionable steps..."
                rows={5}
                className="w-full bg-[#18181b] border border-zinc-800 focus:border-cyan-500 rounded-2xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all resize-none custom-scrollbar"
              />
            </div>
          </div>

          {/* Quick Preset Library */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Preset Instructions & Prompt Library
              </span>
              <button
                type="button"
                onClick={() => setIsAddingPrompt(!isAddingPrompt)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                <span>{isAddingPrompt ? 'Cancel' : '+ Add Custom Prompt'}</span>
              </button>
            </div>

            {/* Add Custom Prompt Form */}
            {isAddingPrompt && (
              <form onSubmit={handleCreatePrompt} className="p-4 rounded-2xl bg-[#1a1a1e] border border-cyan-500/40 space-y-3">
                <div className="text-xs font-bold text-white">Create Custom Prompt Preset</div>
                <input
                  type="text"
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  placeholder="Preset Title (e.g. Legal Analysis Mode)"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
                <textarea
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  placeholder="System directive / prompt content..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingPrompt(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white"
                  >
                    Save Preset
                  </button>
                </div>
              </form>
            )}

            {/* Prompt Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(config.customPrompts || DEFAULT_CUSTOM_PROMPTS).map((p) => (
                <div 
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-[#1e1e24] border border-zinc-800/80 hover:border-zinc-700 flex flex-col justify-between group transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{p.title}</span>
                      {p.category && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                          {p.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {p.prompt}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleApplyPromptPreset(p.prompt)}
                      className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Insert into Style</span>
                    </button>

                    {p.id.startsWith('prompt_') && (
                      <button
                        type="button"
                        onClick={() => handleDeletePrompt(p.id)}
                        className="text-[10px] text-red-400 hover:text-red-300 opacity-60 hover:opacity-100"
                        title="Delete Preset"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Standalone Characteristics Full Screen Modal (matching user image) */}
      {showCharacteristicsModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
            <CharacteristicsView
              characteristics={config.characteristics}
              onChange={handleCharacteristicsChange}
              onReset={handleResetCharacteristics}
              onBack={() => setShowCharacteristicsModal(false)}
              isModal={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
