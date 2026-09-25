import React, { useState, useEffect } from 'react';
import { AppTheme } from '../types';
import { 
  CURATED_THEMES, 
  PRESET_ACCENTS, 
  applyTheme, 
  getSavedTheme, 
  updateCurrentThemeAccent,
  getDailyThemeInfo,
  isAutoDailyThemeEnabled,
  setAutoDailyTheme
} from '../services/themeService';
import { PRESET_ICON_PACKS, APP_ICON_CATALOG, getIconPackState, saveIconPackState, setIconOverride, removeIconOverride } from '../services/iconPackService';
import { AppIcon } from './AppIcon';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { requestAutoSave } from '../services/autoSaveService';
import { Sun, RefreshCw, Search, Check } from 'lucide-react';

interface ThemeIconBarProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChanged?: () => void;
}

export const ThemeIconBar: React.FC<ThemeIconBarProps> = ({
  isOpen,
  onClose,
  onThemeChanged
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'icons' | 'catalog'>('themes');
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(getSavedTheme());
  const [iconPackState, setIconPackState] = useState(getIconPackState());
  const [selectedIconForUpload, setSelectedIconForUpload] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [themeCategory, setThemeCategory] = useState<'all' | 'dark' | 'neon' | 'light' | 'nature'>('all');
  const [themeSearch, setThemeSearch] = useState('');

  const [dailyTheme, setDailyTheme] = useState(getDailyThemeInfo());
  const [autoDaily, setAutoDaily] = useState(isAutoDailyThemeEnabled());

  useEffect(() => {
    setCurrentTheme(getSavedTheme());
    setIconPackState(getIconPackState());
    setDailyTheme(getDailyThemeInfo());
    setAutoDaily(isAutoDailyThemeEnabled());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectTheme = (theme: AppTheme) => {
    applyTheme(theme);
    setCurrentTheme(theme);
    requestAutoSave('Theme changed to ' + theme.name, 200);
    if (onThemeChanged) onThemeChanged();

    // Auto-match icon pack if a recommended one is configured
    const matchingPack = PRESET_ICON_PACKS.find(p => p.recommendedThemeId === theme.id);
    if (matchingPack && matchingPack.id !== iconPackState.activePackId) {
      handleSelectIconPack(matchingPack.id);
    }
  };

  const handleSelectAccent = (colorHex: string) => {
    const updated = updateCurrentThemeAccent(colorHex);
    setCurrentTheme(updated);
    requestAutoSave('Accent color updated', 200);
    if (onThemeChanged) onThemeChanged();
  };

  const handleSelectIconPack = (packId: string) => {
    const updated = { ...iconPackState, activePackId: packId };
    saveIconPackState(updated);
    setIconPackState(updated);
    requestAutoSave('Icon pack changed to ' + packId, 200);
  };

  const handlePairCurrentThemeWithIcons = () => {
    // Find matching icon pack for current theme
    const matchingPack = PRESET_ICON_PACKS.find(p => p.recommendedThemeId === currentTheme.id) || PRESET_ICON_PACKS[0];
    handleSelectIconPack(matchingPack.id);
  };

  const handleSaveCustomIconUrl = (iconId: string) => {
    if (!customUrlInput.trim()) return;
    setIconOverride(iconId, customUrlInput.trim());
    setIconPackState(getIconPackState());
    setCustomUrlInput('');
    setSelectedIconForUpload(null);
    requestAutoSave('Custom icon override updated', 200);
  };

  const handleClearCustomIcon = (iconId: string) => {
    removeIconOverride(iconId);
    setIconPackState(getIconPackState());
    setSelectedIconForUpload(null);
    requestAutoSave('Icon override cleared', 200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, iconId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setIconOverride(iconId, result);
        setIconPackState(getIconPackState());
        setSelectedIconForUpload(null);
        requestAutoSave('Uploaded custom icon', 200);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredCatalog = APP_ICON_CATALOG.filter(item => 
    item.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <aside 
        className="fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[540px] bg-[#0c0f17] text-white shadow-2xl z-50 flex flex-col border-l border-white/10 animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-label="Themes and Icons Bar"
      >
        {/* Drawer Header */}
        <div className="flex-none px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#121622]/80 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-fuchsia-500 p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-[#0c0f17] rounded-[10px] flex items-center justify-center">
                <AppIcon name="Sparkles" className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Themes & Icon Studio
              </h2>
              <p className="text-[11px] text-gray-400">Personalize styles, palette & icon packs in real time</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <AutoSaveIndicator showTextOnMobile={false} />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title="Close Panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex-none px-5 py-2.5 bg-[#090b10] border-b border-white/5 flex gap-2">
          <button
            onClick={() => setActiveTab('themes')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'themes'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <AppIcon name="Sparkles" className="w-3.5 h-3.5" />
            <span>Themes & Accents</span>
          </button>

          <button
            onClick={() => setActiveTab('icons')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'icons'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <AppIcon name="Image" className="w-3.5 h-3.5" />
            <span>Icon Packs ({PRESET_ICON_PACKS.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'catalog'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <AppIcon name="Settings" className="w-3.5 h-3.5" />
            <span>Live Icons</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

          {/* TAB 1: THEMES & ACCENTS */}
          {activeTab === 'themes' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Daily Theme of the Day Hero Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-cyan-950/40 to-purple-950/40 border border-amber-500/30 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" />
                      Daily Theme ({dailyTheme.day})
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const next = !autoDaily;
                      setAutoDaily(next);
                      setAutoDailyTheme(next);
                      requestAutoSave(next ? 'Auto Daily Themes Enabled' : 'Auto Daily Themes Disabled', 200);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      autoDaily 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${autoDaily ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{autoDaily ? 'Auto-Cycle ON' : 'Auto-Cycle OFF'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{dailyTheme.title}</h4>
                    <p className="text-[11px] text-gray-300 italic line-clamp-1 mt-0.5">"{dailyTheme.quote}"</p>
                  </div>

                  <button
                    onClick={() => handleSelectTheme(dailyTheme.theme)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md active:scale-95 flex-shrink-0"
                  >
                    Apply Today's
                  </button>
                </div>
              </div>

              {/* Quick Theme-Icon Sync Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-purple-950/40 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-md">
                <div className="text-xs">
                  <span className="font-bold text-cyan-300 block">Auto-Sync Icons with Theme</span>
                  <span className="text-[11px] text-gray-400">Match active icon pack to your current aesthetic palette</span>
                </div>
                <button
                  onClick={handlePairCurrentThemeWithIcons}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 transition-all flex-shrink-0 shadow-lg"
                >
                  Pair Now
                </button>
              </div>

              {/* Curated Theme Presets Grid with Search & Categories */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Curated Themes ({CURATED_THEMES.length})
                  </h3>
                  <span className="text-[11px] text-cyan-400 font-mono">Instant live preview</span>
                </div>

                {/* Theme Search & Category Filter */}
                <div className="space-y-2 mb-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search themes (e.g. Cyberpunk, OLED, Forest, Matcha)..."
                      value={themeSearch}
                      onChange={(e) => setThemeSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#121622] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'dark', label: 'Dark & AMOLED' },
                      { id: 'neon', label: 'Neon & Cyber' },
                      { id: 'light', label: 'Light & Pastel' },
                      { id: 'nature', label: 'Nature & Warm' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setThemeCategory(cat.id as any)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                          themeCategory === cat.id
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto custom-scrollbar p-0.5">
                  {CURATED_THEMES.filter((theme) => {
                    const matchesSearch = theme.name.toLowerCase().includes(themeSearch.toLowerCase()) || theme.id.toLowerCase().includes(themeSearch.toLowerCase());
                    if (!matchesSearch) return false;
                    if (themeCategory === 'all') return true;
                    if (themeCategory === 'dark') return theme.id.includes('dark') || theme.id.includes('oled') || theme.id.includes('slate') || theme.id.includes('deep') || theme.id.includes('default');
                    if (themeCategory === 'neon') return theme.id.includes('cyber') || theme.id.includes('synth') || theme.id.includes('tokyo') || theme.id.includes('vapor') || theme.id.includes('dracula');
                    if (themeCategory === 'light') return theme.id.includes('white') || theme.id.includes('matcha') || theme.id.includes('lavender') || theme.id.includes('frost');
                    if (themeCategory === 'nature') return theme.id.includes('forest') || theme.id.includes('amber') || theme.id.includes('sunset') || theme.id.includes('coffee') || theme.id.includes('aurora') || theme.id.includes('emerald') || theme.id.includes('rose');
                    return true;
                  }).map((theme) => {
                    const isActive = currentTheme.id === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelectTheme(theme)}
                        className={`group relative p-3 rounded-2xl border text-left transition-all duration-200 ${
                          isActive
                            ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400'
                            : 'border-white/10 bg-[#131722] hover:border-white/20 hover:bg-[#181d2b]'
                        }`}
                      >
                        {/* Theme Colors Bar Preview */}
                        <div className="flex items-center h-5 w-full rounded-lg overflow-hidden mb-2.5 border border-white/10 shadow-inner">
                          <div className="w-1/3 h-full" style={{ backgroundColor: theme.colors.background }} />
                          <div className="w-1/3 h-full" style={{ backgroundColor: theme.colors.card }} />
                          <div className="w-1/3 h-full" style={{ backgroundColor: theme.colors.accent }} />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {theme.name}
                          </span>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] flex-shrink-0" />
                          )}
                        </div>

                        <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                          Accent: <span style={{ color: theme.colors.accent }}>{theme.colors.accent}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color Presets */}
              <div>
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                  Accent Color Palette
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_ACCENTS.map((preset) => {
                    const isSelected = currentTheme.colors.accent.toLowerCase() === preset.color.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectAccent(preset.color)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'border-white bg-white/10 shadow-md scale-105'
                            : 'border-white/5 bg-[#121622] hover:border-white/20'
                        }`}
                      >
                        <span 
                          className="w-5 h-5 rounded-full shadow-sm"
                          style={{ backgroundColor: preset.color, boxShadow: `0 0 10px ${preset.glow}` }}
                        />
                        <span className="text-[10px] font-medium text-gray-300 truncate max-w-full">
                          {preset.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ICON PACKS (EVERY LAST ONE IMPLEMENTED) */}
          {activeTab === 'icons' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-xs text-gray-400 leading-relaxed bg-[#121622] p-3 rounded-2xl border border-white/10">
                Choose from <strong className="text-white">10 distinct icon styles</strong>. Every icon pack applies directly to the entire app, changing navigation, tools, buttons, avatars, and action controls.
              </div>

              <div className="space-y-3">
                {PRESET_ICON_PACKS.map((pack) => {
                  const isActive = iconPackState.activePackId === pack.id;
                  return (
                    <div
                      key={pack.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 ${
                        isActive
                          ? 'border-cyan-400 bg-gradient-to-br from-[#101c2b] to-[#121727] shadow-xl ring-1 ring-cyan-400/80'
                          : 'border-white/10 bg-[#121622] hover:border-white/20 hover:bg-[#161c2a]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{pack.name}</h4>
                            {pack.badge && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-cyan-300 border border-white/10">
                                {pack.badge}
                              </span>
                            )}
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-black shadow-sm">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{pack.description}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectIconPack(pack.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                            isActive
                              ? 'bg-cyan-500 text-black shadow-md pointer-events-none'
                              : 'bg-white/10 hover:bg-cyan-500 hover:text-black text-white'
                          }`}
                        >
                          {isActive ? 'Selected' : 'Apply Pack'}
                        </button>
                      </div>

                      {/* Live Icon Strip Preview */}
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono text-gray-500">Live Preview:</span>
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                          {pack.previewIcons.map((prev, idx) => (
                            <span key={idx} className="text-base flex items-center justify-center">
                              {prev.emoji ? (
                                <span title={prev.iconId}>{prev.emoji}</span>
                              ) : prev.url ? (
                                <img src={prev.url} alt={prev.iconId} className="w-5 h-5 object-contain rounded" />
                              ) : (
                                <AppIcon name={prev.iconId} size={18} />
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE ICON CATALOG & OVERRIDE */}
          {activeTab === 'catalog' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search app icons..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#121622] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="px-2.5 py-2 rounded-xl bg-white/10 text-xs text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Selected Icon Customizer Modal/Box */}
              {selectedIconForUpload && (
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center">
                        <AppIcon name={selectedIconForUpload} size={18} />
                      </div>
                      <span className="text-xs font-bold text-cyan-300">
                        Override Icon: {selectedIconForUpload}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedIconForUpload(null)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-gray-300 block">Custom Image URL:</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://example.com/icon.png"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
                      />
                      <button
                        onClick={() => handleSaveCustomIconUrl(selectedIconForUpload)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400"
                      >
                        Save
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="text-[11px] text-cyan-400 cursor-pointer hover:underline flex items-center gap-1">
                        <span>📁 Upload file from device</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, selectedIconForUpload)}
                        />
                      </label>
                      {iconPackState.customOverrides[selectedIconForUpload] && (
                        <button
                          onClick={() => handleClearCustomIcon(selectedIconForUpload)}
                          className="text-[11px] text-rose-400 hover:underline"
                        >
                          Reset to Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Grid of All Catalog Icons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredCatalog.map((item) => {
                  const hasCustom = Boolean(iconPackState.customOverrides[item.id]);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedIconForUpload(item.id);
                        setCustomUrlInput(iconPackState.customOverrides[item.id] || '');
                      }}
                      className={`p-2.5 rounded-xl border text-left flex flex-col items-center text-center gap-1.5 transition-all group ${
                        hasCustom
                          ? 'border-fuchsia-500/50 bg-fuchsia-950/20'
                          : 'border-white/10 bg-[#121622] hover:border-white/20 hover:bg-[#181d2c]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                        <AppIcon name={item.id} size={20} className="text-white" />
                      </div>
                      <span className="text-xs font-semibold text-gray-200 group-hover:text-cyan-300 truncate w-full">
                        {item.label.split('/')[0].trim()}
                      </span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">
                        {item.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Drawer Footer with Auto-Save status */}
        <div className="flex-none px-5 py-3 border-t border-white/10 bg-[#090b10] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono">Auto-Save active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </aside>
    </>
  );
};
