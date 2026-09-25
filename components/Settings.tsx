import React, { useState, useEffect } from 'react';
import { UserSettings, saveUserSettings, getUserSettings, saveStoredModels, getStoredSessions, clearStoredSessions } from '../services/storageService';
import { VirtualModel, ShortcutItem, KeyConfig, PersonaTone, PersonaCharacteristics, CustomPromptItem, ChatSession } from '../types';
import { getShortcuts, saveShortcuts } from '../services/storageService';
import { KeyTag } from './KeyTag';
import { DEFAULT_CUSTOM_PROMPTS } from '../constants';
import { 
  getPersonalizationConfig, 
  savePersonalizationConfig, 
  resetToOriginalDefault,
  resetCharacteristics 
} from '../services/personalizationService';
import { CharacteristicsView } from './CharacteristicsView';
import { AppStatistics } from './AppStatistics';
import { PermissionsTab } from './PermissionsTab';
import { ThemeBuilder } from './ThemeBuilder';
import { IconPackManager } from './IconPackManager';
import { 
  AppTheme, 
  getSavedTheme, 
  applyTheme, 
  getDailyThemeInfo 
} from '../services/themeService';
import { 
  WidgetSettings, 
  DEFAULT_WIDGET_SETTINGS, 
  getWidgetSettings, 
  saveWidgetSettings, 
  hasAnyWidgetEnabled 
} from '../services/widgetSettingsService';
import {
  WallpaperConfig,
  getWallpaperConfig,
  saveWallpaperConfig,
  CURATED_WALLPAPERS,
  getAllAvailableWallpapers,
  getActiveWallpaper,
  addCustomWallpaper,
  removeCustomWallpaper
} from '../services/wallpaperService';
import { requestAutoSave } from '../services/autoSaveService';
import { 
  CloudSun, 
  TrendingUp, 
  Newspaper, 
  MessageSquare, 
  Sun, 
  Clock, 
  RotateCcw, 
  Image as ImageIcon,
  Sliders, 
  Eye, 
  EyeOff, 
  Check, 
  Plus, 
  Trash2, 
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Bot,
  LayoutDashboard
} from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
  onSettingsChanged: () => void;
  models: VirtualModel[];
  sessions?: ChatSession[];
  onUpdateModelKnowledge?: (modelId: string, newKnowledge: string) => void;
  initialTab?: 'general' | 'appearance' | 'widgets' | 'personalization' | 'advanced' | 'shortcuts' | 'usage' | 'permissions' | 'iconpack';
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
    tagline: 'Standard AI (Neutral Baseline)',
    description: 'Clean, neutral, and unprompted baseline model response.',
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
  }
];

export const Settings: React.FC<SettingsProps> = ({ 
  onClose, 
  onSettingsChanged, 
  models,
  sessions: propSessions,
  initialTab = 'general'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'widgets' | 'personalization' | 'advanced' | 'shortcuts' | 'usage' | 'permissions'>(
    initialTab === 'iconpack' ? 'appearance' : initialTab
  );
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>(getShortcuts());
  const [recordingId, setRecordingId] = useState<string | null>(null);
  
  // Customization & Appearance State
  const [appearanceSubTab, setAppearanceSubTab] = useState<'wallpapers' | 'theme' | 'iconpack'>(
    initialTab === 'iconpack' ? 'iconpack' : 'wallpapers'
  );
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(getSavedTheme());
  const [wallpaperConfig, setWallpaperConfig] = useState<WallpaperConfig>(getWallpaperConfig());
  const [customWpTitle, setCustomWpTitle] = useState('');
  const [customWpUrl, setCustomWpUrl] = useState('');

  // Widgets State
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(getWidgetSettings());

  // Personalization State
  const [personalizationConfig, setPersonalizationConfig] = useState(getPersonalizationConfig());
  const [personalizationSubTab, setPersonalizationSubTab] = useState<'all' | 'tone' | 'characteristics' | 'instructions' | 'prompts'>('all');

  // Voice Test
  const [testText, setTestText] = useState('Hello! I am ready to assist you.');
  const [isPlaying, setIsPlaying] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    setSettings(getUserSettings());
    setShortcuts(getShortcuts());
    setWallpaperConfig(getWallpaperConfig());
    setWidgetSettings(getWidgetSettings());
    setPersonalizationConfig(getPersonalizationConfig());
  }, []);

  const handleSave = () => {
    saveUserSettings(settings);
    saveShortcuts(shortcuts);
    saveWallpaperConfig(wallpaperConfig);
    saveWidgetSettings(widgetSettings);
    savePersonalizationConfig(personalizationConfig);
    onSettingsChanged();
    onClose();
  };

  const handleKeyDownRecord = (e: React.KeyboardEvent, id: string) => {
    e.preventDefault();
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    const newKeyConfig: KeyConfig = {
      key: e.key,
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey
    };
    const updated = shortcuts.map(s => s.id === id ? { ...s, keys: newKeyConfig } : s);
    setShortcuts(updated);
    setRecordingId(null);
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to permanently clear all chat history?")) {
      clearStoredSessions();
      onSettingsChanged();
      onClose();
    }
  };

  const handleTestVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(testText);
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAddCustomWallpaperSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWpUrl.trim()) return;
    addCustomWallpaper(customWpTitle || 'Custom Image', customWpUrl.trim());
    setWallpaperConfig(getWallpaperConfig());
    setCustomWpTitle('');
    setCustomWpUrl('');
    setSaveStatus('Added to custom pictures collection!');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleFileUploadWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        addCustomWallpaper(file.name.replace(/\.[^/.]+$/, ''), base64);
        setWallpaperConfig(getWallpaperConfig());
        setSaveStatus('Wallpaper uploaded and set!');
        setTimeout(() => setSaveStatus(''), 2500);
      }
    };
    reader.readAsDataURL(file);
  };

  const activeWallpaper = getActiveWallpaper(wallpaperConfig);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in">
      <div className="bg-[#0f131d] text-[var(--text-primary)] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-[#141824]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">App Settings & Customization</h1>
              <p className="text-xs text-gray-400">Manage interface, starter page, daily wallpapers, widgets, and AI behavior</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className="text-xs text-emerald-400 font-mono animate-in fade-in bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {saveStatus}
              </span>
            )}
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Top Tab Bar */}
        <div className="flex border-b border-white/10 px-6 pt-2 bg-[#111420] overflow-x-auto custom-scrollbar gap-1">
          {[
            { id: 'general', label: 'General & Start Page' },
            { id: 'appearance', label: 'Customization & Daily Themes' },
            { id: 'widgets', label: 'Widgets' },
            { id: 'personalization', label: 'Personalization' },
            { id: 'advanced', label: 'Server & Gemini' },
            { id: 'shortcuts', label: 'Shortcuts' },
            { id: 'usage', label: 'Stats' },
            { id: 'permissions', label: 'Security' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-3.5 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-cyan-400 text-cyan-300 font-bold' 
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === 'widgets' && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                  {Object.values(widgetSettings).filter(Boolean).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0b0e17]">
          
          {/* 1. GENERAL TAB (With Start Page Choice) */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Default Start Page Choice */}
              <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                      Default Start View
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Choose which view appears when you open the app or start a new conversation.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 uppercase">
                    {settings.defaultStartPage || 'starter'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div
                    onClick={() => {
                      const updated = { ...settings, defaultStartPage: 'starter' as const };
                      setSettings(updated);
                      saveUserSettings(updated);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                      (settings.defaultStartPage || 'starter') === 'starter'
                        ? 'border-cyan-500 bg-cyan-950/20 shadow-lg'
                        : 'border-white/5 bg-[#161a26] opacity-70 hover:opacity-100 hover:border-white/20'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Starter Page (Dashboard)</span>
                        {(settings.defaultStartPage || 'starter') === 'starter' && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Brave-style minimalist search dashboard with customizable widgets, live weather, markets, and daily themes.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      const updated = { ...settings, defaultStartPage: 'chatbot' as const };
                      setSettings(updated);
                      saveUserSettings(updated);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                      settings.defaultStartPage === 'chatbot'
                        ? 'border-indigo-500 bg-indigo-950/20 shadow-lg'
                        : 'border-white/5 bg-[#161a26] opacity-70 hover:opacity-100 hover:border-white/20'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Direct Chatbot</span>
                        {settings.defaultStartPage === 'chatbot' && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Instant conversational interface ready for immediate AI questions, coding, analysis, and generation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile & Name */}
              <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2">Profile & Identity</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Display Name</label>
                  <input 
                    type="text" 
                    value={settings.displayName} 
                    onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                    placeholder="Your Name (Optional)"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Audio & Voice */}
              <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2">Audio & Voice</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">Default Synthesizer Voice</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {VOICES.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSettings({ ...settings, defaultVoice: v })}
                        className={`p-2.5 text-xs font-medium rounded-xl border transition-all ${
                          settings.defaultVoice === v 
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold' 
                            : 'border-white/5 bg-black/30 text-gray-400 hover:text-white'
                        }`}
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
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <button 
                      type="button"
                      onClick={handleTestVoice}
                      disabled={isPlaying}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium"
                    >
                      {isPlaying ? 'Playing...' : 'Test Voice'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-[#121622] border border-red-500/20 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-red-400 border-b border-red-500/20 pb-2">Danger Zone</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-white">Clear All Local Conversations</div>
                    <div className="text-[11px] text-gray-400">Permanently deletes all chat history and cached messages on this device.</div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleClearHistory}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Delete History
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* 2. CUSTOMIZATION & DAILY THEMES TAB */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Subnavigation Bar */}
              <div className="flex items-center gap-2 bg-[#121622] border border-white/10 p-1.5 rounded-2xl w-fit">
                <button
                  type="button"
                  onClick={() => setAppearanceSubTab('wallpapers')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    appearanceSubTab === 'wallpapers'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Daily Pictures & Wallpapers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppearanceSubTab('theme')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    appearanceSubTab === 'theme'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Themes & Colors</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppearanceSubTab('iconpack')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    appearanceSubTab === 'iconpack'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Icon Packs</span>
                </button>
              </div>

              {/* Subtab 1: Daily Pictures & Wallpapers System */}
              {appearanceSubTab === 'wallpapers' && (
                <div className="space-y-6">
                  
                  {/* Master Controls */}
                  <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-cyan-400" />
                          Daily Pictures & Background Wallpapers
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          High-resolution daily photography, system-wide ambient backdrop, and glassmorphism.
                        </p>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-300 font-medium">Background Wallpaper</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated: WallpaperConfig = { ...wallpaperConfig, enabled: !wallpaperConfig.enabled };
                            setWallpaperConfig(updated);
                            saveWallpaperConfig(updated);
                          }}
                          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex-shrink-0 ${
                            wallpaperConfig.enabled ? 'bg-cyan-500' : 'bg-gray-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            wallpaperConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>

                    {wallpaperConfig.enabled && (
                      <div className="space-y-4 pt-1">
                        
                        {/* Scope & Auto-Switch & Credits Toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          
                          {/* System Wide */}
                          <div 
                            onClick={() => {
                              const updated: WallpaperConfig = { ...wallpaperConfig, systemWide: !wallpaperConfig.systemWide };
                              setWallpaperConfig(updated);
                              saveWallpaperConfig(updated);
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              wallpaperConfig.systemWide ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-black/30 border-white/5 opacity-70'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-white">System-Wide</span>
                              <span className={`text-[10px] font-bold ${wallpaperConfig.systemWide ? 'text-cyan-400' : 'text-gray-500'}`}>
                                {wallpaperConfig.systemWide ? 'ON' : 'OFF'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400">Apply background across the entire app interface.</p>
                          </div>

                          {/* Auto-Switch every 30m */}
                          <div 
                            onClick={() => {
                              const nextVal = wallpaperConfig.autoSwitchMinutes === 30 ? 0 : 30;
                              const updated: WallpaperConfig = { ...wallpaperConfig, autoSwitchMinutes: nextVal };
                              setWallpaperConfig(updated);
                              saveWallpaperConfig(updated);
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              wallpaperConfig.autoSwitchMinutes > 0 ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-black/30 border-white/5 opacity-70'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-white">Switch Every 30 Min</span>
                              <span className={`text-[10px] font-bold ${wallpaperConfig.autoSwitchMinutes > 0 ? 'text-cyan-400' : 'text-gray-500'}`}>
                                {wallpaperConfig.autoSwitchMinutes > 0 ? 'ACTIVE' : 'OFF'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400">Rotate to the next image automatically every 30 minutes.</p>
                          </div>

                          {/* Show Photo Credits */}
                          <div 
                            onClick={() => {
                              const updated: WallpaperConfig = { ...wallpaperConfig, showCredits: !wallpaperConfig.showCredits };
                              setWallpaperConfig(updated);
                              saveWallpaperConfig(updated);
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              wallpaperConfig.showCredits ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-black/30 border-white/5 opacity-70'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-white">Show Photo Credits</span>
                              <span className={`text-[10px] font-bold ${wallpaperConfig.showCredits ? 'text-cyan-400' : 'text-gray-500'}`}>
                                {wallpaperConfig.showCredits ? 'VISIBLE' : 'HIDDEN'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400">Display subtle photographer & source attribution on dashboard.</p>
                          </div>

                        </div>

                        {/* Sliders: Transparency, Dimming, Blur */}
                        <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-4">
                          <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Transparency & Visual Tuning</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Card Transparency */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-300">
                                <span>Card Glass Opacity</span>
                                <span className="font-mono text-cyan-400">{Math.round(wallpaperConfig.cardTransparency * 100)}%</span>
                              </div>
                              <input 
                                type="range"
                                min="0.2"
                                max="1.0"
                                step="0.05"
                                value={wallpaperConfig.cardTransparency}
                                onChange={(e) => {
                                  const updated = { ...wallpaperConfig, cardTransparency: parseFloat(e.target.value) };
                                  setWallpaperConfig(updated);
                                  saveWallpaperConfig(updated);
                                }}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                              />
                            </div>

                            {/* Background Dimming */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-300">
                                <span>Picture Dimming (Tint)</span>
                                <span className="font-mono text-cyan-400">{Math.round(wallpaperConfig.overlayOpacity * 100)}%</span>
                              </div>
                              <input 
                                type="range"
                                min="0.1"
                                max="0.85"
                                step="0.05"
                                value={wallpaperConfig.overlayOpacity}
                                onChange={(e) => {
                                  const updated = { ...wallpaperConfig, overlayOpacity: parseFloat(e.target.value) };
                                  setWallpaperConfig(updated);
                                  saveWallpaperConfig(updated);
                                }}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                              />
                            </div>

                            {/* Background Blur */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-300">
                                <span>Background Blur</span>
                                <span className="font-mono text-cyan-400">{wallpaperConfig.blurAmount}px</span>
                              </div>
                              <input 
                                type="range"
                                min="0"
                                max="20"
                                step="1"
                                value={wallpaperConfig.blurAmount}
                                onChange={(e) => {
                                  const updated = { ...wallpaperConfig, blurAmount: parseInt(e.target.value) };
                                  setWallpaperConfig(updated);
                                  saveWallpaperConfig(updated);
                                }}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Curated Daily Pictures Gallery */}
                  <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Curated Daily Pictures Gallery
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const updated: WallpaperConfig = { ...wallpaperConfig, mode: 'daily', enabled: true };
                          setWallpaperConfig(updated);
                          saveWallpaperConfig(updated);
                          setSaveStatus('Daily Automatic Picture Mode Activated!');
                          setTimeout(() => setSaveStatus(''), 2500);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          wallpaperConfig.mode === 'daily'
                            ? 'bg-amber-500 text-black shadow-md'
                            : 'bg-white/5 text-gray-300 hover:text-white border border-white/10'
                        }`}
                      >
                        Auto-Daily Theme Mode {wallpaperConfig.mode === 'daily' && '✓'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {CURATED_WALLPAPERS.map((wp) => {
                        const isSelected = wallpaperConfig.enabled && wallpaperConfig.activeWallpaperId === wp.id;
                        return (
                          <div
                            key={wp.id}
                            onClick={() => {
                              const updated: WallpaperConfig = {
                                ...wallpaperConfig,
                                activeWallpaperId: wp.id,
                                mode: 'curated',
                                enabled: true,
                                lastSwitchTimestamp: Date.now()
                              };
                              setWallpaperConfig(updated);
                              saveWallpaperConfig(updated);
                            }}
                            className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all aspect-[16/10] bg-black/40 ${
                              isSelected 
                                ? 'border-cyan-400 ring-2 ring-cyan-400/40 scale-[1.02] shadow-xl' 
                                : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'
                            }`}
                          >
                            <img 
                              src={wp.thumbnailUrl || wp.url} 
                              alt={wp.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-end">
                              <div className="text-xs font-bold text-white truncate">{wp.title}</div>
                              <div className="text-[10px] text-gray-300 truncate">Photo by {wp.photographer}</div>
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 text-black flex items-center justify-center font-bold text-xs shadow-md">
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Pictures & Add Set */}
                  <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-cyan-400" />
                      Add Custom Picture to Collection
                    </h3>

                    <form onSubmit={handleAddCustomWallpaperSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Picture Title (e.g. Mountain Sunset)"
                          value={customWpTitle}
                          onChange={(e) => setCustomWpTitle(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        />
                        <input
                          type="url"
                          placeholder="Image URL (https://...)"
                          value={customWpUrl}
                          onChange={(e) => setCustomWpUrl(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="text-xs text-cyan-400 cursor-pointer hover:underline flex items-center gap-1.5">
                          <span>📁 Upload image file from device</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileUploadWallpaper}
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={!customWpUrl.trim()}
                          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black text-xs font-bold transition-all shadow-md"
                        >
                          Add to Collection
                        </button>
                      </div>
                    </form>

                    {/* Custom Pictures Gallery */}
                    {wallpaperConfig.customWallpapers.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <h4 className="text-xs font-bold text-gray-300">Your Custom Pictures ({wallpaperConfig.customWallpapers.length})</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {wallpaperConfig.customWallpapers.map((wp) => {
                            const isSelected = wallpaperConfig.activeWallpaperId === wp.id;
                            return (
                              <div
                                key={wp.id}
                                className={`group relative rounded-2xl overflow-hidden border transition-all aspect-[16/10] bg-black/40 ${
                                  isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-white/10'
                                }`}
                              >
                                <img 
                                  src={wp.url} 
                                  alt={wp.title}
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => {
                                    const updated: WallpaperConfig = {
                                      ...wallpaperConfig,
                                      activeWallpaperId: wp.id,
                                      mode: 'custom_set',
                                      enabled: true
                                    };
                                    setWallpaperConfig(updated);
                                    saveWallpaperConfig(updated);
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent p-2.5 flex items-end justify-between pointer-events-none">
                                  <span className="text-xs font-bold text-white truncate">{wp.title}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    removeCustomWallpaper(wp.id);
                                    setWallpaperConfig(getWallpaperConfig());
                                  }}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Subtab 2: Theme Builder & Palettes */}
              {appearanceSubTab === 'theme' && (
                <ThemeBuilder currentTheme={currentTheme} onThemeChange={setCurrentTheme} />
              )}

              {/* Subtab 3: Icon Pack Manager */}
              {appearanceSubTab === 'iconpack' && (
                <IconPackManager />
              )}

            </div>
          )}

          {/* 3. WIDGETS TAB */}
          {activeTab === 'widgets' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121622] border border-white/10 p-5 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white">Starter Dashboard Widgets</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Toggle simple, clean Brave-style widgets on the starter home page.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allEnabled: WidgetSettings = {
                        weather: true,
                        stocks: true,
                        news: true,
                        recentChats: true,
                        dailyTheme: true,
                        clock: true,
                      };
                      setWidgetSettings(allEnabled);
                      saveWidgetSettings(allEnabled);
                      setSaveStatus('All Widgets Enabled');
                      setTimeout(() => setSaveStatus(''), 2000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-semibold transition-all"
                  >
                    Enable All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const minimal: WidgetSettings = {
                        weather: false,
                        stocks: false,
                        news: false,
                        recentChats: false,
                        dailyTheme: false,
                        clock: true,
                      };
                      setWidgetSettings(minimal);
                      saveWidgetSettings(minimal);
                      setSaveStatus('Minimal Mode (All Cards Hidden)');
                      setTimeout(() => setSaveStatus(''), 2000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 text-xs font-semibold transition-all"
                  >
                    Minimal (Disable All)
                  </button>
                </div>
              </div>

              {/* Widgets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { id: 'clock' as const, title: 'Minimalist Clock & Date', desc: 'Display time and date header above search omnibar.' },
                  { id: 'weather' as const, title: 'Weather Widget', desc: 'Live temperature, conditions, and humidity.' },
                  { id: 'stocks' as const, title: 'Stocks & Crypto Markets', desc: 'Live ticker cards for S&P 500, NASDAQ, BTC, ETH, NVDA.' },
                  { id: 'news' as const, title: 'Trending News & Tech with Thumbnails', desc: 'Curated tech and world headlines with rich image thumbnails.' },
                  { id: 'recentChats' as const, title: 'Recent Chats', desc: 'Quick-access list to reopen recent chat conversations.' },
                  { id: 'dailyTheme' as const, title: 'Daily Theme Banner', desc: 'Daily aesthetic theme and inspiration quote.' },
                ].map((w) => {
                  const isEnabled = widgetSettings[w.id];
                  return (
                    <div 
                      key={w.id}
                      onClick={() => {
                        const updated = { ...widgetSettings, [w.id]: !isEnabled };
                        setWidgetSettings(updated);
                        saveWidgetSettings(updated);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isEnabled 
                          ? 'bg-cyan-950/20 border-cyan-500/40 shadow-sm' 
                          : 'bg-[#161a26] border-white/5 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-white">{w.title}</h4>
                        <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">{w.desc}</p>
                      </div>
                      <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${
                        isEnabled ? 'bg-cyan-500 justify-end' : 'bg-neutral-700 justify-start'
                      }`}>
                        <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. PERSONALIZATION TAB */}
          {activeTab === 'personalization' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121622] border border-white/10 p-5 rounded-2xl">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2 text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                    Personalization & Persona Tones
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Shape model behavior, communication warmth, formatting structure, and custom instructions.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const updated = resetToOriginalDefault();
                    setPersonalizationConfig(updated);
                    setSaveStatus('Personalization reset to Default AI');
                    setTimeout(() => setSaveStatus(''), 2000);
                  }}
                  className="px-3 py-1.5 text-xs text-zinc-400 border border-zinc-700 hover:bg-zinc-800 rounded-xl transition-all"
                >
                  Reset to Default AI
                </button>
              </div>

              {/* Persona Tones */}
              <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">Persona Tone Archetypes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TONES.map(tone => {
                    const isSelected = personalizationConfig.tone === tone.id;
                    return (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => {
                          const updated = { ...personalizationConfig, tone: tone.id };
                          setPersonalizationConfig(updated);
                          savePersonalizationConfig(updated);
                        }}
                        className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500 shadow-lg'
                            : 'bg-black/30 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {tone.iconSvg}
                              <span className="font-bold text-sm text-white">{tone.name}</span>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tone.badgeColor}`}>
                              {tone.badge}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">{tone.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Behavior Characteristics Fine-Tuning */}
              <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">Behavior Dials</h3>
                <CharacteristicsView
                  characteristics={personalizationConfig.characteristics}
                  onChange={(updatedChars) => {
                    const updated = { ...personalizationConfig, characteristics: updatedChars };
                    setPersonalizationConfig(updated);
                    savePersonalizationConfig(updated);
                  }}
                  onReset={() => {
                    const updated = resetCharacteristics(personalizationConfig);
                    setPersonalizationConfig(updated);
                  }}
                  isModal={false}
                />
              </div>
            </div>
          )}

          {/* 5. ADVANCED SERVER TAB */}
          {activeTab === 'advanced' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2">Model Hyperparameters</h3>

                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Default Temperature</span>
                    <span className="font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-black/40">
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
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                  />
                </div>

                {/* Top P */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Nucleus Sampling (Top P)</span>
                    <span className="font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-black/40">
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
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. SHORTCUTS TAB */}
          {activeTab === 'shortcuts' && (
            <div className="bg-[#121622] border border-white/10 rounded-2xl overflow-hidden shadow-lg p-6 space-y-4">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">Keyboard Shortcuts</h2>
              <div className="space-y-2.5">
                {shortcuts.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-xs font-medium text-gray-200">{s.label}</span>
                    <button 
                      onClick={() => setRecordingId(s.id)}
                      className={`min-w-[120px] flex justify-center outline-none focus:ring-2 focus:ring-cyan-400 rounded-lg p-1.5 ${
                        recordingId === s.id ? 'bg-cyan-500 text-black font-bold' : ''
                      }`}
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
          )}

          {/* 7. USAGE STATS TAB */}
          {activeTab === 'usage' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <AppStatistics
                isEmbedded={true}
                sessions={propSessions || getStoredSessions()}
              />
            </div>
          )}

          {/* 8. SECURITY & PERMISSIONS TAB */}
          {activeTab === 'permissions' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <PermissionsTab />
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10 bg-[#141824]">
          <button 
            onClick={onClose}
            className="px-4 py-2 hover:bg-white/10 text-gray-300 rounded-xl transition-colors text-xs font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all text-xs shadow-md active:scale-95"
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
};
