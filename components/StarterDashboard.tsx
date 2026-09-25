import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ArrowRight,
  CloudSun, 
  TrendingUp, 
  Newspaper, 
  MessageSquare, 
  Sun, 
  Clock, 
  Sliders, 
  ExternalLink,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  ChevronRight,
  Info,
  X,
  Bot
} from 'lucide-react';
import { VirtualModel, ChatSession } from '../types';
import { 
  WidgetSettings, 
  getWidgetSettings, 
  hasAnyWidgetEnabled, 
  MOCK_WEATHER, 
  MOCK_STOCKS, 
  MOCK_NEWS 
} from '../services/widgetSettingsService';
import { getDailyThemeInfo, applyTheme } from '../services/themeService';
import { 
  getWallpaperConfig, 
  getActiveWallpaper, 
  switchNextWallpaper, 
  WallpaperItem, 
  WallpaperConfig 
} from '../services/wallpaperService';
import { WidgetSettingsModal } from './WidgetSettingsModal';

interface StarterDashboardProps {
  activeModel: VirtualModel;
  models: VirtualModel[];
  sessions?: ChatSession[];
  onSelectModel?: (modelId: string) => void;
  onSelectSession?: (sessionId: string) => void;
  onQuerySubmit: (text: string, options?: { searchMode?: 'web' | 'research'; councilMode?: boolean; imageMode?: boolean }) => void;
  onOpenCreateStudio?: () => void;
  onOpenLiveMode?: () => void;
  onOpenThemeIconBar?: () => void;
  onSwitchToChatbot?: () => void;
}

export const StarterDashboard: React.FC<StarterDashboardProps> = ({
  activeModel,
  models,
  sessions = [],
  onSelectModel,
  onSelectSession,
  onQuerySubmit,
  onOpenThemeIconBar,
  onSwitchToChatbot
}) => {
  const [query, setQuery] = useState('');
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(getWidgetSettings());
  const [wallpaperConfig, setWallpaperConfig] = useState<WallpaperConfig>(getWallpaperConfig());
  const [activeWallpaper, setActiveWallpaper] = useState<WallpaperItem>(getActiveWallpaper(getWallpaperConfig()));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [dailyTheme, setDailyTheme] = useState(getDailyThemeInfo());
  const inputRef = useRef<HTMLInputElement>(null);

  // Clock updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for widget & wallpaper updates
  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setWidgetSettings(e.detail);
      } else {
        setWidgetSettings(getWidgetSettings());
      }
    };
    const handleWpUpdate = (e: any) => {
      const wpCfg = e.detail || getWallpaperConfig();
      setWallpaperConfig(wpCfg);
      setActiveWallpaper(getActiveWallpaper(wpCfg));
    };

    window.addEventListener('widget_settings_updated', handleSettingsUpdate);
    window.addEventListener('wallpaper_config_updated', handleWpUpdate);
    return () => {
      window.removeEventListener('widget_settings_updated', handleSettingsUpdate);
      window.removeEventListener('wallpaper_config_updated', handleWpUpdate);
    };
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    onQuerySubmit(query.trim());
  };

  const handleNewsClick = (headline: string, summary: string) => {
    onQuerySubmit(`Provide an executive breakdown and latest updates on this news story:\n\nHeadline: "${headline}"\nContext: ${summary}`);
  };

  const handleNextWallpaper = () => {
    const nextWp = switchNextWallpaper();
    setActiveWallpaper(nextWp);
    setWallpaperConfig(getWallpaperConfig());
  };

  const anyWidgetsActive = hasAnyWidgetEnabled(widgetSettings);

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between px-4 py-6 sm:py-10 max-w-5xl mx-auto select-none relative animate-in fade-in duration-300">
      
      {/* Top Controls Bar (Minimalist Corner) */}
      <div className="w-full flex items-center justify-between mb-6 sm:mb-8">
        <div className="flex items-center gap-2">
          {activeModel && (
            <span className="text-xs text-[var(--text-secondary)] font-medium px-3 py-1 rounded-full bg-[var(--card-bg)]/80 backdrop-blur-md border border-[var(--border-color)]">
              {activeModel.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToChatbot && (
            <button
              onClick={onSwitchToChatbot}
              className="px-2.5 py-1.5 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/80 backdrop-blur-md border border-transparent hover:border-[var(--border-color)] transition-all flex items-center gap-1.5"
              title="Switch directly to Chatbot view"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Direct Chat</span>
            </button>
          )}

          {wallpaperConfig.enabled && (
            <button
              onClick={handleNextWallpaper}
              className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/80 backdrop-blur-md border border-transparent hover:border-[var(--border-color)] transition-all"
              title="Next Daily Picture"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-2.5 py-1.5 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/80 backdrop-blur-md border border-transparent hover:border-[var(--border-color)] transition-all flex items-center gap-1.5"
            title="Configure Widgets & Transparency"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Widgets</span>
          </button>
          {onOpenThemeIconBar && (
            <button
              onClick={onOpenThemeIconBar}
              className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/80 backdrop-blur-md border border-transparent hover:border-[var(--border-color)] transition-all"
              title="Themes & Customization"
            >
              <Sun className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      <div className="w-full flex flex-col items-center">
        {/* Minimalist Clock & Greeting */}
        {widgetSettings.clock && (
          <div className="text-center mb-6 sm:mb-8 space-y-1 animate-in fade-in">
            <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-[var(--text-primary)] font-sans drop-shadow-sm">
              {currentTime}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium tracking-wide drop-shadow-sm">
              {currentDate}
            </p>
          </div>
        )}

        {/* Clean Search Omnibar */}
        <div className="w-full max-w-2xl mb-8 sm:mb-10">
          <form 
            onSubmit={handleSearchSubmit}
            className="relative group w-full flex items-center glass-card border border-[var(--border-color)] hover:border-cyan-500/50 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 rounded-2xl shadow-xl transition-all p-1.5 pl-4"
          >
            <Search className="w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-cyan-400 flex-shrink-0 mr-3 transition-colors" />
            
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search with AI, ask questions, or enter a prompt..."
              className="w-full bg-transparent text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none pr-3"
              autoFocus
            />

            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 mr-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={!query.trim()}
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-black font-semibold transition-all shadow-md active:scale-95 flex-shrink-0"
              title="Search"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* ONLY RENDER WIDGETS IF AT LEAST ONE IS ENABLED */}
        {anyWidgetsActive && (
          <div className="w-full space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            
            {/* Daily Theme Banner Widget (if enabled) */}
            {widgetSettings.dailyTheme && (
              <div className="w-full p-4 rounded-2xl glass-card bg-gradient-to-r from-amber-950/20 via-cyan-950/20 to-purple-950/20 border border-amber-500/20 shadow-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span>{dailyTheme.title}</span>
                      <span className="text-[10px] text-amber-300 font-mono">({dailyTheme.day})</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] italic truncate mt-0.5">"{dailyTheme.quote}"</p>
                  </div>
                </div>
                <button
                  onClick={() => applyTheme(dailyTheme.theme)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0"
                >
                  Apply Theme
                </button>
              </div>
            )}

            {/* Simple Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* 1. WEATHER WIDGET */}
              {widgetSettings.weather && (
                <div className="p-4 rounded-2xl glass-card border border-[var(--border-color)] shadow-md flex flex-col justify-between hover:border-cyan-500/30 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CloudSun className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Weather</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] font-medium">{MOCK_WEATHER.city}</span>
                  </div>

                  <div className="flex items-center justify-between my-1">
                    <div>
                      <div className="text-3xl font-light text-[var(--text-primary)]">
                        {MOCK_WEATHER.temp}°F
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] font-medium">
                        {MOCK_WEATHER.condition}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-[var(--text-secondary)] space-y-0.5">
                      <div>H: {MOCK_WEATHER.high}° • L: {MOCK_WEATHER.low}°</div>
                      <div>Humidity: {MOCK_WEATHER.humidity}% • Wind: {MOCK_WEATHER.windMph} mph</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onQuerySubmit(`What is the 7-day weather forecast and atmospheric trends for ${MOCK_WEATHER.city}?`)}
                    className="mt-3 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium text-left flex items-center gap-1 group-hover:underline"
                  >
                    <span>Detailed 7-Day Forecast</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* 2. STOCKS & CRYPTO WIDGET */}
              {widgetSettings.stocks && (
                <div className="p-4 rounded-2xl glass-card border border-[var(--border-color)] shadow-md flex flex-col justify-between hover:border-cyan-500/30 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Markets</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">Live Tickers</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-1">
                    {MOCK_STOCKS.slice(0, 4).map((stock) => (
                      <div 
                        key={stock.symbol}
                        onClick={() => onQuerySubmit(`Give me the latest market analysis, news catalysts, and technical indicators for ${stock.name} (${stock.symbol}).`)}
                        className="p-2 rounded-xl bg-[var(--sidebar-bg)]/70 border border-[var(--border-color)] hover:border-cyan-500/40 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{stock.symbol}</span>
                          <span className={`text-[10px] font-bold ${stock.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stock.change}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                          {stock.price}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onQuerySubmit('Give me a comprehensive briefing on today\'s major market indices, crypto movements, and macroeconomic headlines.')}
                    className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium text-left flex items-center gap-1 group-hover:underline"
                  >
                    <span>Full Market Briefing</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* 3. RECENT CHATS WIDGET */}
              {widgetSettings.recentChats && (
                <div className="p-4 rounded-2xl glass-card border border-[var(--border-color)] shadow-md flex flex-col justify-between hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Recent Chats</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">{sessions.length} saved</span>
                  </div>

                  <div className="space-y-1.5">
                    {sessions.slice(0, 3).map((session) => (
                      <button
                        key={session.id}
                        onClick={() => onSelectSession && onSelectSession(session.id)}
                        className="w-full text-left p-2 rounded-xl bg-[var(--sidebar-bg)]/70 border border-transparent hover:border-[var(--border-color)] hover:text-cyan-400 transition-all flex items-center justify-between text-xs"
                      >
                        <span className="truncate text-[var(--text-primary)] font-medium pr-2">
                          {session.title || 'Untitled Chat'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[var(--text-secondary)] flex-shrink-0" />
                      </button>
                    ))}

                    {sessions.length === 0 && (
                      <p className="text-xs text-[var(--text-secondary)] py-2 text-center">No recent chats yet.</p>
                    )}
                  </div>

                  <div className="mt-2 text-[10px] text-[var(--text-secondary)] text-right">
                    Click to resume conversation
                  </div>
                </div>
              )}

              {/* 4. RANDOM X / NEWS WIDGET (With Rich Image Thumbnails) */}
              {widgetSettings.news && (
                <div className="p-4 rounded-2xl glass-card border border-[var(--border-color)] shadow-md flex flex-col justify-between hover:border-cyan-500/30 transition-all md:col-span-2 lg:col-span-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Newspaper className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Trending News & Tech</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">Curated Feed with Thumbnails</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MOCK_NEWS.slice(0, 4).map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => handleNewsClick(item.title, item.summary)}
                        className="p-3 rounded-xl bg-[var(--sidebar-bg)]/70 border border-[var(--border-color)] hover:border-cyan-500/40 cursor-pointer transition-all flex items-start gap-3 group/item"
                      >
                        {/* News Thumbnail Image */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 relative border border-white/10">
                          <img 
                            src={item.thumbnailUrl} 
                            alt={item.title}
                            className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>

                        <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                                {item.source}
                              </span>
                              <span className="text-[10px] text-[var(--text-secondary)]">{item.timeAgo}</span>
                            </div>
                            <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover/item:text-cyan-300 line-clamp-2 leading-snug">
                              {item.title}
                            </h4>
                          </div>

                          <div className="text-[10px] text-cyan-400 flex items-center gap-1 font-medium mt-1">
                            <span>Read & Breakdown</span>
                            <ArrowRight className="w-2.5 h-2.5 group-hover/item:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Minimal Widget Settings Footer Link */}
            <div className="w-full flex items-center justify-center pt-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-[var(--card-bg)]/80 backdrop-blur-md"
              >
                <Sliders className="w-3 h-3 text-cyan-400" />
                <span>Configure Dashboard Widgets</span>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Subtle Wallpaper Photo Credits (Bottom Corner) */}
      {wallpaperConfig.enabled && wallpaperConfig.showCredits && activeWallpaper && (
        <div className="w-full flex items-center justify-between text-[11px] text-[var(--text-secondary)] mt-8 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="truncate">
              <strong className="text-[var(--text-primary)] font-medium">{activeWallpaper.title}</strong>
              {activeWallpaper.location && <span className="hidden sm:inline"> • {activeWallpaper.location}</span>}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span>
              Photo by <span className="text-[var(--text-primary)]">{activeWallpaper.photographer}</span> ({activeWallpaper.source})
            </span>
            <button
              onClick={handleNextWallpaper}
              className="hover:text-cyan-400 flex items-center gap-1 transition-colors"
              title="Switch picture"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Next</span>
            </button>
          </div>
        </div>
      )}

      {/* Widgets Settings Modal */}
      <WidgetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChanged={(updated) => setWidgetSettings(updated)}
      />

    </div>
  );
};
