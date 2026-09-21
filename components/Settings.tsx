import React, { useState, useEffect } from 'react';
import { 
  UserSettings, 
  getUserSettings, 
  saveUserSettings, 
  getStoredSessions, 
  deleteStoredSession, 
  getShortcuts, 
  saveShortcuts,
  getStoredModels,
  saveStoredModels
} from '../services/storageService';
import { playTextToSpeech } from '../services/geminiService';
import { ThemeBuilder } from './ThemeBuilder';
import { getSavedTheme } from '../services/themeService';
import { 
  AppTheme, 
  ShortcutItem, 
  KeyConfig, 
  VirtualModel, 
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
  DEFAULT_CUSTOM_PROMPTS
} from '../services/personalizationService';
import { CharacteristicsView } from './CharacteristicsView';

interface SettingsProps {
  onClose: () => void;
  onSettingsChanged: () => void;
  models?: VirtualModel[];
  onUpdateModelKnowledge?: (modelId: string, newKnowledge: string) => void;
  initialTab?: 'general' | 'advanced' | 'personalization' | 'appearance' | 'shortcuts';
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede', 'Calliope', 'Leda'];

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

const KeyTag: React.FC<{ k: KeyConfig }> = ({ k }) => {
    const parts = [];
    if (k.ctrl) parts.push('Ctrl');
    if (k.meta) parts.push('Cmd');
    if (k.alt) parts.push('Alt');
    if (k.shift) parts.push('Shift');
    parts.push(k.key.toUpperCase());
    
    return (
        <div className="flex gap-1">
            {parts.map((p, i) => (
                <span key={i} className="px-2 py-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded text-xs font-mono text-[var(--text-primary)]">
                    {p}
                </span>
            ))}
        </div>
    )
}

export const Settings: React.FC<SettingsProps> = ({ 
  onClose, 
  onSettingsChanged, 
  models: propModels,
  initialTab = 'general'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'advanced' | 'personalization' | 'appearance' | 'shortcuts'>(initialTab);
  const [settings, setSettings] = useState<UserSettings>({ displayName: '', defaultVoice: 'Kore' });
  const [testText, setTestText] = useState('Hello! I am Nexus, your advanced AI assistant.');
  const [isPlaying, setIsPlaying] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  // Theme State
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(getSavedTheme());

  // Shortcuts State
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  // Models & Memory State
  const [modelsList, setModelsList] = useState<VirtualModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [memoryText, setMemoryText] = useState<string>('');
  const [newMemorySnippet, setNewMemorySnippet] = useState<string>('');

  // Personalization State
  const [personalizationConfig, setPersonalizationConfig] = useState<PersonalizationConfig>(getPersonalizationConfig());
  const [personalizationSubTab, setPersonalizationSubTab] = useState<'all' | 'tone' | 'characteristics' | 'instructions' | 'memory' | 'prompts'>('all');
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    setSettings(getUserSettings());
    setCurrentTheme(getSavedTheme());
    setShortcuts(getShortcuts());
    setPersonalizationConfig(getPersonalizationConfig());

    const loadedModels = propModels && propModels.length > 0 ? propModels : getStoredModels();
    setModelsList(loadedModels);
    if (loadedModels.length > 0) {
      setSelectedModelId(loadedModels[0].id);
      setMemoryText(loadedModels[0].knowledgeBase || '');
    }
  }, [propModels]);

  const handleSelectModelForMemory = (modelId: string) => {
    setSelectedModelId(modelId);
    const m = modelsList.find(item => item.id === modelId);
    setMemoryText(m?.knowledgeBase || '');
  };

  const handleSaveMemory = () => {
    if (!selectedModelId) return;
    const updated = modelsList.map(m => {
      if (m.id === selectedModelId) {
        return { ...m, knowledgeBase: memoryText };
      }
      return m;
    });
    setModelsList(updated);
    saveStoredModels(updated);
    onSettingsChanged();
    setSaveStatus('Model Memory Saved!');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleAddMemorySnippet = () => {
    if (!newMemorySnippet.trim()) return;
    const prefix = memoryText.trim() ? '\n• ' : '• ';
    const updated = memoryText.trim() + prefix + newMemorySnippet.trim();
    setMemoryText(updated);
    setNewMemorySnippet('');
  };

  const handleClearMemory = () => {
    if (confirm("Clear all persistent memory and knowledge for this model?")) {
      setMemoryText('');
      const updated = modelsList.map(m => {
        if (m.id === selectedModelId) {
          return { ...m, knowledgeBase: '' };
        }
        return m;
      });
      setModelsList(updated);
      saveStoredModels(updated);
      onSettingsChanged();
      setSaveStatus('Memory Cleared');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  // Personalization Handlers
  const handleSelectTone = (tone: PersonaTone) => {
    const updated = { ...personalizationConfig, tone };
    setPersonalizationConfig(updated);
    savePersonalizationConfig(updated);
    onSettingsChanged();
    setSaveStatus(`Persona tone set to: ${tone.toUpperCase()}`);
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleCharacteristicsChange = (updatedChars: PersonaCharacteristics) => {
    const updated = { ...personalizationConfig, characteristics: updatedChars };
    setPersonalizationConfig(updated);
    savePersonalizationConfig(updated);
    onSettingsChanged();
    setSaveStatus('Characteristics updated');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleResetCharacteristics = () => {
    const updated = resetCharacteristics(personalizationConfig);
    setPersonalizationConfig(updated);
    onSettingsChanged();
    setSaveStatus('Characteristics reset to balanced defaults');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleResetAllPersonalization = () => {
    if (confirm("Reset all personalization and return to clean vanilla AI default?")) {
      const updated = resetToOriginalDefault();
      setPersonalizationConfig(updated);
      onSettingsChanged();
      setSaveStatus('Personalization reset to Default (Vanilla AI)');
      setTimeout(() => setSaveStatus(''), 2500);
    }
  };

  const handleToggleInstructions = (enabled: boolean) => {
    const updated = {
      ...personalizationConfig,
      customInstructions: {
        ...personalizationConfig.customInstructions,
        enabled
      }
    };
    setPersonalizationConfig(updated);
    savePersonalizationConfig(updated);
    onSettingsChanged();
    setSaveStatus(enabled ? 'Custom instructions enabled' : 'Custom instructions disabled');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleInstructionsChange = (field: 'aboutUser' | 'responseStyle', value: string) => {
    const updated = {
      ...personalizationConfig,
      customInstructions: {
        ...personalizationConfig.customInstructions,
        [field]: value
      }
    };
    setPersonalizationConfig(updated);
    savePersonalizationConfig(updated);
    onSettingsChanged();
  };

  const handleApplyPromptPreset = (prompt: string) => {
    const currentStyle = personalizationConfig.customInstructions.responseStyle;
    const combined = currentStyle.trim() 
      ? `${currentStyle.trim()}\n\n${prompt}` 
      : prompt;

    const updated = {
      ...personalizationConfig,
      customInstructions: {
        ...personalizationConfig.customInstructions,
        enabled: true,
        responseStyle: combined
      }
    };
    setPersonalizationConfig(updated);
    savePersonalizationConfig(updated);
    onSettingsChanged();
    setSaveStatus('Prompt instructions added to response style');
    setTimeout(() => setSaveStatus(''), 2500);
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

    const updatedPrompts = [...(personalizationConfig.customPrompts || DEFAULT_CUSTOM_PROMPTS), newPrompt];
    const updated = {
      ...personalizationConfig,
      customPrompts: updatedPrompts
    };

    setPersonalizationConfig(updated);
    savePersonalizationConfig(updated);
    setNewPromptTitle('');
    setNewPromptText('');
    setIsAddingPrompt(false);
    onSettingsChanged();
    setSaveStatus(`Created prompt template: "${newPrompt.title}"`);
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleDeletePrompt = (id: string) => {
    const filtered = (personalizationConfig.customPrompts || []).filter(p => p.id !== id);
    const updated = { ...personalizationConfig, customPrompts: filtered };
    setPersonalizationConfig(updated);
    savePersonalizationConfig(updated);
    onSettingsChanged();
    setSaveStatus('Prompt preset removed');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleSave = () => {
    saveUserSettings(settings);
    saveShortcuts(shortcuts);
    if (selectedModelId) {
      const updated = modelsList.map(m => {
        if (m.id === selectedModelId) {
          return { ...m, knowledgeBase: memoryText };
        }
        return m;
      });
      saveStoredModels(updated);
    }
    savePersonalizationConfig(personalizationConfig);
    onSettingsChanged();
    setSaveStatus('All Settings & Memory Saved!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleTestVoice = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await playTextToSpeech(testText, settings.defaultVoice);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to delete all chat history? This cannot be undone.")) {
        const sessions = getStoredSessions();
        await Promise.all(sessions.map(s => deleteStoredSession(s.id)));
        onSettingsChanged();
        setSaveStatus('History Cleared.');
        setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const handleKeyDownRecord = (e: React.KeyboardEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    const newKey: KeyConfig = {
        key: e.key,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
    };

    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, keys: newKey } : s));
    setRecordingId(null);
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--app-bg)] p-4 lg:p-8 text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
            <div>
                <h1 className="text-2xl font-bold">System Configuration</h1>
                <p className="text-[var(--text-secondary)] text-sm">Manage preferences, personalization, memory, and appearance.</p>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus && (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30 animate-pulse">
                  {saveStatus}
                </span>
              )}
              <button 
                  onClick={onClose}
                  className="px-4 py-2 bg-[var(--card-bg)] hover:opacity-80 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg transition-colors"
              >
                  Close
              </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-[var(--border-color)] overflow-x-auto pb-1">
          {[
            { id: 'general', label: 'General' },
            { id: 'advanced', label: 'Advanced Server Settings' },
            { id: 'personalization', label: 'Personalization & Memory' },
            { id: 'appearance', label: 'Appearance' },
            { id: 'shortcuts', label: 'Shortcuts' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2 px-3 text-sm font-medium transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-indigo-400 text-indigo-300 font-semibold' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === 'personalization' && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 capitalize">
                  {personalizationConfig.tone}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Personalization & Memory Combined Tab */}
        {activeTab === 'personalization' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header with Quick Sub-navigation Pills and Reset All */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-2xl">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                  Personalization, Persona Tones & Long-Term Memory
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Shape model behavior, adjust communication style, and manage persistent memories.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleResetAllPersonalization}
                  className="px-3 py-1.5 text-xs text-zinc-400 border border-zinc-700/60 hover:bg-zinc-800 rounded-xl transition-all"
                  title="Reset all tones and instructions back to vanilla AI"
                >
                  Reset to Default AI
                </button>
              </div>
            </div>

            {/* Sub-tab Filter Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'All Settings' },
                { id: 'tone', label: '1. Persona Tone' },
                { id: 'characteristics', label: '2. Characteristics' },
                { id: 'instructions', label: '3. Custom Instructions' },
                { id: 'memory', label: '4. Model Memory' },
                { id: 'prompts', label: '5. Prompt Presets' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setPersonalizationSubTab(sub.id as any)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                    personalizationSubTab === sub.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Section 1: Persona Tones */}
            {(personalizationSubTab === 'all' || personalizationSubTab === 'tone') && (
              <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Persona Tone Archetypes
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">Choose how your AI communicates and formats ideas.</p>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 font-semibold px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 capitalize">
                    Active: {personalizationConfig.tone}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {TONES.map(tone => {
                    const isSelected = personalizationConfig.tone === tone.id;
                    return (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => handleSelectTone(tone.id)}
                        className={`text-left p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500/80 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                            : 'bg-[var(--background)] border-[var(--border-color)] hover:border-zinc-700 hover:bg-[var(--sidebar-bg)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {tone.iconSvg}
                              <span className="font-bold text-sm text-white">{tone.name}</span>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tone.badgeColor}`}>
                              {tone.badge}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-indigo-300/90 mb-1">{tone.tagline}</div>
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{tone.description}</p>
                        </div>
                        {isSelected && (
                          <div className="mt-2.5 pt-2 border-t border-indigo-500/20 flex items-center justify-between text-[10px] text-indigo-400 font-semibold">
                            <span>Selected Persona</span>
                            <span>Active</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Characteristics Fine-Tuning */}
            {(personalizationSubTab === 'all' || personalizationSubTab === 'characteristics') && (
              <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Behavior Characteristics Fine-Tuning
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">Adjust individual dials for empathy, energy, list usage, and emoji expressions.</p>
                  </div>
                  <button
                    onClick={handleResetCharacteristics}
                    className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-[var(--background)] border border-[var(--border-color)]"
                  >
                    Reset Dials
                  </button>
                </div>

                <CharacteristicsView
                  characteristics={personalizationConfig.characteristics}
                  onChange={handleCharacteristicsChange}
                  onReset={handleResetCharacteristics}
                  isModal={false}
                />
              </div>
            )}

            {/* Section 3: Custom Instructions */}
            {(personalizationSubTab === 'all' || personalizationSubTab === 'instructions') && (
              <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Custom Instructions & Profile Context
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">What the model should know about you and how it should format answers.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                      {personalizationConfig.customInstructions.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <input
                      type="checkbox"
                      checked={personalizationConfig.customInstructions.enabled}
                      onChange={(e) => handleToggleInstructions(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      personalizationConfig.customInstructions.enabled ? 'bg-indigo-600' : 'bg-zinc-700'
                    }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        personalizationConfig.customInstructions.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      What would you like the model to know about you to provide better responses?
                    </label>
                    <textarea
                      rows={3}
                      value={personalizationConfig.customInstructions.aboutUser}
                      onChange={(e) => handleInstructionsChange('aboutUser', e.target.value)}
                      placeholder="e.g. I am a software engineer based in London. I work mostly with TypeScript, Next.js, and cloud systems..."
                      className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:border-indigo-500 outline-none leading-relaxed custom-scrollbar"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        How would you like the model to respond?
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-zinc-500">Quick inserts:</span>
                        {[
                          'Be concise',
                          'No fluff',
                          'Prefer TypeScript',
                          'Include real-world examples'
                        ].map((tag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleApplyPromptPreset(tag)}
                            className="text-[10px] text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 px-2 py-0.5 rounded-full border border-indigo-500/30"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      value={personalizationConfig.customInstructions.responseStyle}
                      onChange={(e) => handleInstructionsChange('responseStyle', e.target.value)}
                      placeholder="e.g. Always provide complete code without placeholders. Offer solutions before asking questions..."
                      className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:border-indigo-500 outline-none leading-relaxed custom-scrollbar"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Model Memory & Long-Term Knowledge */}
            {(personalizationSubTab === 'all' || personalizationSubTab === 'memory') && (
              <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Model Memory & Domain Knowledge Base</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Persistent instructions and learned facts injected into every model conversation.</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleClearMemory}
                      className="px-3 py-1.5 text-xs text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      Clear Memory
                    </button>
                    <button
                      onClick={handleSaveMemory}
                      className="px-4 py-1.5 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-all shadow-md"
                    >
                      Save Memory
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Model Selector Pill Row */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                      Select Virtual Model
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {modelsList.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleSelectModelForMemory(m.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center space-x-2 ${
                            selectedModelId === m.id
                              ? 'bg-[var(--accent-bg)] text-white border-transparent shadow-md'
                              : 'bg-[var(--background)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedModelId === m.id ? '#ffffff' : 'var(--accent-solid)' }} />
                          <span>{m.name}</span>
                          <span className="text-[10px] opacity-70 font-mono">({(m.knowledgeBase || '').length} chars)</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add Quick Memory Snippet */}
                  <div className="bg-[var(--background)] p-3 rounded-xl border border-[var(--border-color)] flex gap-2 items-center">
                    <input
                      type="text"
                      value={newMemorySnippet}
                      onChange={(e) => setNewMemorySnippet(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddMemorySnippet();
                      }}
                      placeholder="Add a new persistent memory or fact (e.g. 'User prefers concise functional React code')..."
                      className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
                    />
                    <button
                      onClick={handleAddMemorySnippet}
                      className="px-3 py-1.5 text-xs bg-[var(--card-bg)] hover:bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg transition-colors flex-shrink-0"
                    >
                      + Add Fact
                    </button>
                  </div>

                  {/* Knowledge Base Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Internal Knowledge Base Content
                      </label>
                      <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                        {memoryText ? memoryText.split('\n').filter(Boolean).length : 0} items • {memoryText.length} characters
                      </span>
                    </div>

                    <textarea
                      rows={8}
                      value={memoryText}
                      onChange={(e) => setMemoryText(e.target.value)}
                      placeholder="Enter permanent domain knowledge, guidelines, or facts that this model will inject into every context..."
                      className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-3.5 text-xs font-mono text-[var(--text-primary)] focus:border-cyan-500 outline-none leading-relaxed custom-scrollbar"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 5: Custom Prompt Presets */}
            {(personalizationSubTab === 'all' || personalizationSubTab === 'prompts') && (
              <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Custom Prompt Templates & Presets
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">Save and reuse structured system prompts and expert roles.</p>
                  </div>
                  <button
                    onClick={() => setIsAddingPrompt(!isAddingPrompt)}
                    className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors"
                  >
                    {isAddingPrompt ? 'Cancel' : '+ New Template'}
                  </button>
                </div>

                {isAddingPrompt && (
                  <form onSubmit={handleCreatePrompt} className="bg-[var(--background)] border border-purple-500/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Template Title</label>
                      <input
                        type="text"
                        value={newPromptTitle}
                        onChange={(e) => setNewPromptTitle(e.target.value)}
                        placeholder="e.g. Security Auditor"
                        className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-purple-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Prompt Instructions</label>
                      <textarea
                        rows={3}
                        value={newPromptText}
                        onChange={(e) => setNewPromptText(e.target.value)}
                        placeholder="e.g. Audit all submitted code strictly for OWASP top 10 vulnerabilities..."
                        className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-2.5 text-xs text-white outline-none focus:border-purple-400 custom-scrollbar"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingPrompt(false)}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                      >
                        Save Template
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(personalizationConfig.customPrompts || []).map(preset => (
                    <div
                      key={preset.id}
                      className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--background)] flex flex-col justify-between space-y-2 hover:border-zinc-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{preset.title}</span>
                          <span className="text-[10px] text-purple-400 font-mono px-1.5 py-0.5 rounded bg-purple-950/40 border border-purple-500/20">
                            {preset.category}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                          {preset.prompt}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                        <button
                          type="button"
                          onClick={() => handleApplyPromptPreset(preset.prompt)}
                          className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          Use in Instructions →
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(preset.id)}
                          className="text-[11px] text-red-400 hover:text-red-300"
                          title="Delete template"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced Server & Generation Settings Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Description */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Advanced Server & Gemini Generation Configuration</h2>
                  <p className="text-xs text-[var(--text-secondary)]">Fine-tune server-side model parameters, temperature, token limits, safety thresholds, and grounding behavior.</p>
                </div>
              </div>
            </div>

            {/* Hyperparameters Card */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 space-y-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Model Inference & Sampling Hyperparameters
              </h3>

              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">Default Temperature</span>
                    <p className="text-[11px] text-[var(--text-secondary)]">Controls randomness: lower is more deterministic and factual, higher is more creative.</p>
                  </div>
                  <span className="font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--border-color)]">
                    {(settings.defaultTemperature ?? 0.7).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={settings.defaultTemperature ?? 0.7}
                  onChange={(e) => setSettings({ ...settings, defaultTemperature: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-[var(--background)] rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono">
                  <span>0.0 (Precise & Factual)</span>
                  <span>0.7 (Balanced Default)</span>
                  <span>2.0 (High Creativity)</span>
                </div>
              </div>

              {/* Top P */}
              <div className="space-y-2 pt-3 border-t border-[var(--border-color)]">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">Default Nucleus Sampling (Top P)</span>
                    <p className="text-[11px] text-[var(--text-secondary)]">Tokens are selected from the most probable choices until cumulative probability reaches P.</p>
                  </div>
                  <span className="font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--border-color)]">
                    {(settings.defaultTopP ?? 0.95).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={settings.defaultTopP ?? 0.95}
                  onChange={(e) => setSettings({ ...settings, defaultTopP: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-[var(--background)] rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono">
                  <span>0.1 (Focused)</span>
                  <span>0.95 (Standard)</span>
                  <span>1.0 (All tokens)</span>
                </div>
              </div>

              {/* Max Output Tokens */}
              <div className="space-y-2 pt-3 border-t border-[var(--border-color)]">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">Max Generation Output Tokens</span>
                    <p className="text-[11px] text-[var(--text-secondary)]">Maximum response length allocated per single completion request.</p>
                  </div>
                  <span className="font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--border-color)]">
                    {settings.maxOutputTokens ?? 4096} tokens
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1024, 2048, 4096, 8192].map((tok) => (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => setSettings({ ...settings, maxOutputTokens: tok })}
                      className={`py-1.5 text-xs font-mono rounded-lg border transition-all ${
                        (settings.maxOutputTokens ?? 4096) === tok
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      {tok}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Server Feature Flags & Grounding */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                Server Grounding & Response Streaming
              </h3>

              {/* Live Search Grounding */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)]">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Default Google Search Grounding</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">Enable live web search tool retrieval for all newly created chat sessions by default.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, searchGroundingEnabled: !settings.searchGroundingEnabled })}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex-shrink-0 ${
                    settings.searchGroundingEnabled ? 'bg-cyan-600' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.searchGroundingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Chunk Streaming */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)]">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Stream Response Chunks</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">Stream tokenized response pieces as they generate for lowest perceived latency.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, streamResponseChunks: settings.streamResponseChunks === false ? true : false })}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex-shrink-0 ${
                    settings.streamResponseChunks !== false ? 'bg-cyan-600' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.streamResponseChunks !== false ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Safety Filtering Level */}
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Harm & Safety Filter Threshold</div>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold px-2 py-0.5 rounded bg-[var(--card-bg)] border border-[var(--border-color)]">
                    {settings.safetyFilterLevel || 'BLOCK_LOW_AND_ABOVE'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { id: 'BLOCK_NONE', label: 'Off / None', desc: 'No blocking' },
                    { id: 'BLOCK_ONLY_HIGH', label: 'Permissive', desc: 'Block high risk' },
                    { id: 'BLOCK_MEDIUM_AND_ABOVE', label: 'Standard', desc: 'Block med/high' },
                    { id: 'BLOCK_LOW_AND_ABOVE', label: 'Strict', desc: 'Block all flagged' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, safetyFilterLevel: s.id as any })}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        (settings.safetyFilterLevel || 'BLOCK_LOW_AND_ABOVE') === s.id
                          ? 'border-indigo-500 bg-indigo-950/40 text-white font-bold'
                          : 'border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <div className="text-xs">{s.label}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] truncate">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
            <ThemeBuilder currentTheme={currentTheme} onThemeChange={setCurrentTheme} />
        )}
        
        {/* Shortcuts Tab */}
        {activeTab === 'shortcuts' && (
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-lg">
                <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--background)]/50 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--accent-solid)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
                </div>
                <div className="p-6 space-y-2">
                    <p className="text-sm text-[var(--text-secondary)] mb-4">Click on a key combination to record a new shortcut.</p>
                    <div className="grid gap-3">
                        {shortcuts.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg border border-[var(--border-color)]">
                                <span className="text-sm font-medium">{s.label}</span>
                                <button 
                                    onClick={() => setRecordingId(s.id)}
                                    className={`min-w-[120px] flex justify-center outline-none focus:ring-2 focus:ring-[var(--accent-solid)] rounded p-1 ${recordingId === s.id ? 'bg-[var(--accent-bg)] text-white' : ''}`}
                                    onKeyDown={(e) => recordingId === s.id && handleKeyDownRecord(e, s.id)}
                                >
                                    {recordingId === s.id ? (
                                        <span className="text-xs animate-pulse font-bold">Press Keys...</span>
                                    ) : (
                                        <KeyTag k={s.keys} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* General Tab */}
        {activeTab === 'general' && (
            <div className="space-y-6">
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-lg p-6 space-y-4">
                    <h2 className="text-lg font-bold border-b border-[var(--border-color)] pb-2">Profile & Identity</h2>
                    <div>
                        <label className="block text-sm font-medium mb-1">Display Name</label>
                        <input 
                            type="text" 
                            value={settings.displayName} 
                            onChange={(e) => setSettings({...settings, displayName: e.target.value})}
                            placeholder="Your Name (Optional)"
                            className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
                        />
                    </div>
                </div>

                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-lg p-6 space-y-4">
                    <h2 className="text-lg font-bold border-b border-[var(--border-color)] pb-2">Audio & Voice</h2>
                    <div>
                        <label className="block text-sm font-medium mb-1">Default Voice</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            {VOICES.map(v => (
                                <button
                                    key={v}
                                    onClick={() => setSettings({...settings, defaultVoice: v})}
                                    className={`p-2 text-sm rounded-lg border transition-all ${settings.defaultVoice === v ? 'bg-[var(--accent-bg)] text-white border-transparent' : 'border-[var(--border-color)] hover:bg-[var(--background)]'}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={testText} 
                                onChange={(e) => setTestText(e.target.value)}
                                className="flex-1 bg-[var(--background)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs"
                            />
                            <button 
                                onClick={handleTestVoice}
                                disabled={isPlaying}
                                className="px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--background)] rounded-lg text-xs flex items-center gap-1"
                            >
                                {isPlaying ? 'Playing...' : 'Test Voice'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--card-bg)] border border-red-500/20 rounded-xl overflow-hidden shadow-lg p-6 space-y-4">
                    <h2 className="text-lg font-bold border-b border-red-500/20 pb-2 text-red-400">Danger Zone</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-semibold text-sm">Clear All Chats</div>
                            <div className="text-xs text-[var(--text-secondary)]">Permanently delete all session history on this device.</div>
                        </div>
                        <button 
                            onClick={handleClearHistory}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm transition-colors"
                        >
                            Delete History
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
             <button 
                onClick={onClose}
                className="px-4 py-2 hover:bg-[var(--card-bg)] text-[var(--text-secondary)] rounded-lg transition-colors text-sm"
             >
                 Cancel
             </button>
             <button 
                onClick={handleSave}
                className="px-6 py-2 bg-[var(--accent-solid)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity text-sm shadow-md"
             >
                 Save Changes
             </button>
        </div>

      </div>
    </div>
  );
};