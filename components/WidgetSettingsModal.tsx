import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  CloudSun, 
  TrendingUp, 
  Newspaper, 
  MessageSquare, 
  Sun, 
  Clock, 
  RotateCcw, 
  LayoutGrid, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Sliders,
  SlidersHorizontal,
  Image as ImageIcon
} from 'lucide-react';
import { 
  WidgetSettings, 
  DEFAULT_WIDGET_SETTINGS, 
  getWidgetSettings, 
  saveWidgetSettings, 
  hasAnyWidgetEnabled 
} from '../services/widgetSettingsService';
import { 
  getWallpaperConfig, 
  saveWallpaperConfig, 
  WallpaperConfig 
} from '../services/wallpaperService';
import { requestAutoSave } from '../services/autoSaveService';

interface WidgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged?: (settings: WidgetSettings) => void;
}

export const WidgetSettingsModal: React.FC<WidgetSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged
}) => {
  const [settings, setSettings] = useState<WidgetSettings>(getWidgetSettings());
  const [wallpaperConfig, setWallpaperConfig] = useState<WallpaperConfig>(getWallpaperConfig());

  useEffect(() => {
    setSettings(getWidgetSettings());
    setWallpaperConfig(getWallpaperConfig());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof WidgetSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveWidgetSettings(updated);
    requestAutoSave(`Widget updated: ${key}`, 150);
    if (onSettingsChanged) onSettingsChanged(updated);
  };

  const handleEnableAll = () => {
    const updated: WidgetSettings = {
      weather: true,
      stocks: true,
      news: true,
      recentChats: true,
      dailyTheme: true,
      clock: true
    };
    setSettings(updated);
    saveWidgetSettings(updated);
    requestAutoSave('All widgets enabled', 150);
    if (onSettingsChanged) onSettingsChanged(updated);
  };

  const handleDisableAll = () => {
    const updated: WidgetSettings = {
      weather: false,
      stocks: false,
      news: false,
      recentChats: false,
      dailyTheme: false,
      clock: true // keep clock for Brave minimalism
    };
    setSettings(updated);
    saveWidgetSettings(updated);
    requestAutoSave('All cards disabled (Minimal mode)', 150);
    if (onSettingsChanged) onSettingsChanged(updated);
  };

  const handleReset = () => {
    setSettings(DEFAULT_WIDGET_SETTINGS);
    saveWidgetSettings(DEFAULT_WIDGET_SETTINGS);
    requestAutoSave('Widgets reset to defaults', 150);
    if (onSettingsChanged) onSettingsChanged(DEFAULT_WIDGET_SETTINGS);
  };

  const handleTransparencyChange = (val: number) => {
    const updatedWp: WallpaperConfig = { ...wallpaperConfig, cardTransparency: val };
    setWallpaperConfig(updatedWp);
    saveWallpaperConfig(updatedWp);
  };

  const handleDimmingChange = (val: number) => {
    const updatedWp: WallpaperConfig = { ...wallpaperConfig, overlayOpacity: val };
    setWallpaperConfig(updatedWp);
    saveWallpaperConfig(updatedWp);
  };

  const anyCardsEnabled = hasAnyWidgetEnabled(settings);

  const WIDGET_ITEMS: Array<{
    key: keyof WidgetSettings;
    title: string;
    description: string;
    icon: any;
    color: string;
  }> = [
    {
      key: 'weather',
      title: 'Weather Widget',
      description: 'Live atmospheric conditions, temperature, and local forecast.',
      icon: CloudSun,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    },
    {
      key: 'stocks',
      title: 'Stocks & Crypto Tickers',
      description: 'Market indices (S&P 500, NASDAQ) and top assets (BTC, ETH, NVDA).',
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    },
    {
      key: 'news',
      title: 'Random X & Trending News',
      description: 'Curated tech, world headlines, and breaking event feeds with image thumbnails.',
      icon: Newspaper,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
    },
    {
      key: 'recentChats',
      title: 'Recent Chats',
      description: 'Jump straight back into your latest conversations with 1-click access.',
      icon: MessageSquare,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    },
    {
      key: 'dailyTheme',
      title: 'Daily Theme Banner',
      description: 'Display today\'s daily curated theme and inspirational quote.',
      icon: Sun,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30'
    },
    {
      key: 'clock',
      title: 'Brave Clock & Greeting',
      description: 'Minimalist centered clock and greeting on the search page.',
      icon: Clock,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#121622] text-[var(--text-primary)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161b29]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Starter Page & Widgets</h2>
              <p className="text-xs text-gray-400">Configure widget visibility, transparency, and minimalist layout</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-6 py-3 bg-[#0e121d] border-b border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnableAll}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1"
            >
              <Eye className="w-3 h-3 text-cyan-400" />
              Enable All
            </button>
            <button
              onClick={handleDisableAll}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1"
            >
              <EyeOff className="w-3 h-3 text-amber-400" />
              Minimal (Pure Search)
            </button>
          </div>

          <button
            onClick={handleReset}
            className="px-2.5 py-1 rounded-lg text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Defaults
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          
          {/* Transparency Tuning Section */}
          <div className="p-4 rounded-2xl bg-[#161a26] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Glassmorphism & Transparency</span>
              </div>
              <span className="text-xs font-mono text-cyan-400">
                {Math.round((1 - wallpaperConfig.cardTransparency) * 100)}% Transparent
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Widget Card Opacity</span>
                  <span>{Math.round(wallpaperConfig.cardTransparency * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={wallpaperConfig.cardTransparency}
                  onChange={(e) => handleTransparencyChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Background Picture Dimming</span>
                  <span>{Math.round(wallpaperConfig.overlayOpacity * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.1"
                  max="0.85"
                  step="0.05"
                  value={wallpaperConfig.overlayOpacity}
                  onChange={(e) => handleDimmingChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {!anyCardsEnabled && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>
                <strong>Pure Search Mode Active:</strong> All widget cards and the dashboard customization section are hidden on the starter page.
              </span>
            </div>
          )}

          {/* Widget Toggles */}
          <div className="space-y-2.5">
            {WIDGET_ITEMS.map((item) => {
              const isEnabled = settings[item.key];
              const Icon = item.icon;

              return (
                <div
                  key={item.key}
                  onClick={() => handleToggle(item.key)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isEnabled
                      ? 'border-cyan-500/40 bg-cyan-950/20 shadow-md'
                      : 'border-white/5 bg-[#161a26] opacity-60 hover:opacity-100 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate flex items-center gap-2">
                        {item.title}
                        {isEnabled && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                        )}
                      </div>
                      <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 flex-shrink-0 ${
                    isEnabled ? 'bg-cyan-500' : 'bg-gray-700'
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#161b29] flex items-center justify-between">
          <span className="text-xs text-gray-400 font-mono">
            {Object.values(settings).filter(Boolean).length} / {Object.keys(settings).length} widgets active
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-md active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
