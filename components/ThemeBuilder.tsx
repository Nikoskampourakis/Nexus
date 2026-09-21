import React, { useState, useEffect } from 'react';
import { AppTheme } from '../types';
import { 
  applyTheme, 
  saveCustomTheme, 
  getCustomThemes, 
  deleteCustomTheme, 
  DEFAULT_THEME, 
  WHITE_THEME, 
  OLED_DARK_THEME, 
  CYBERPUNK_THEME,
  PRESET_ACCENTS,
  AccentColorPreset
} from '../services/themeService';

interface ThemeBuilderProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

// Helpers for RGB conversions
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num) || cleanHex.length !== 6) {
    return { r: 13, g: 17, b: 23 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const PRESET_PALETTES = [
  '#000000', '#050507', '#0d1117', '#161b22', '#1e293b', '#334155',
  '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8',
  '#00a3c4', '#06b6d4', '#0284c7', '#3b82f6', '#6366f1', '#8b5cf6',
  '#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#ec4899', '#f43f5e'
];

interface RgbColorControlProps {
  label: string;
  colorHex: string;
  onChange: (hex: string) => void;
}

const RgbColorControl: React.FC<RgbColorControlProps> = ({ label, colorHex, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rgb = hexToRgb(colorHex.startsWith('#') ? colorHex : '#00a3c4');

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const nextRgb = { ...rgb, [channel]: val };
    onChange(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  };

  return (
    <div className="bg-[var(--background)]/70 border border-[var(--border-color)] rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">{colorHex}</span>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-7 h-7 rounded-lg border border-white/20 shadow-sm transition-transform active:scale-95"
            style={{ backgroundColor: colorHex }}
            title="Open RGB Color Tuner"
          />
        </div>
      </div>

      {isOpen && (
        <div className="pt-2 border-t border-[var(--border-color)] space-y-3 animate-in fade-in duration-150">
          {/* Direct Hex Input */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">HEX</span>
            <input
              type="text"
              value={colorHex}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val) || /^[0-9A-Fa-f]{0,6}$/.test(val)) {
                  onChange(val.startsWith('#') ? val : `#${val}`);
                }
              }}
              className="flex-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
              placeholder="#00a3c4"
            />
          </div>

          {/* RGB Sliders */}
          <div className="space-y-2 text-[11px]">
            {/* Red Channel */}
            <div className="flex items-center gap-2">
              <span className="w-4 font-mono font-bold text-red-400">R</span>
              <input
                type="range"
                min="0"
                max="255"
                value={rgb.r}
                onChange={(e) => handleRgbChange('r', parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-red-950/40 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <span className="w-8 font-mono text-right text-[var(--text-secondary)]">{rgb.r}</span>
            </div>

            {/* Green Channel */}
            <div className="flex items-center gap-2">
              <span className="w-4 font-mono font-bold text-emerald-400">G</span>
              <input
                type="range"
                min="0"
                max="255"
                value={rgb.g}
                onChange={(e) => handleRgbChange('g', parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-emerald-950/40 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="w-8 font-mono text-right text-[var(--text-secondary)]">{rgb.g}</span>
            </div>

            {/* Blue Channel */}
            <div className="flex items-center gap-2">
              <span className="w-4 font-mono font-bold text-sky-400">B</span>
              <input
                type="range"
                min="0"
                max="255"
                value={rgb.b}
                onChange={(e) => handleRgbChange('b', parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-sky-950/40 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="w-8 font-mono text-right text-[var(--text-secondary)]">{rgb.b}</span>
            </div>
          </div>

          {/* Quick Palette Swatches */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRESET_PALETTES.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                className={`w-4 h-4 rounded-md border transition-transform hover:scale-110 ${
                  colorHex.toLowerCase() === p.toLowerCase() ? 'border-white ring-1 ring-cyan-400' : 'border-white/10'
                }`}
                style={{ backgroundColor: p }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ThemeBuilder: React.FC<ThemeBuilderProps> = ({ currentTheme, onThemeChange }) => {
  const [theme, setTheme] = useState<AppTheme>(currentTheme);
  const [savedThemes, setSavedThemes] = useState<AppTheme[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Gradient Builder State
  const [gradientAngle, setGradientAngle] = useState(90);
  const [gradientStart, setGradientStart] = useState('#00a3c4');
  const [gradientEnd, setGradientEnd] = useState('#0066ff');

  useEffect(() => {
    setSavedThemes(getCustomThemes());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Update active theme when local state changes
  const handleColorChange = (key: keyof AppTheme['colors'], value: string) => {
    const updated = {
      ...theme,
      colors: { ...theme.colors, [key]: value }
    };
    setTheme(updated);
    onThemeChange(updated);
    applyTheme(updated);
  };

  const updateGradientAccent = (angle: number, start: string, end: string) => {
    const val = `linear-gradient(${angle}deg, ${start} 0%, ${end} 100%)`;
    const updated = {
      ...theme,
      isGradientAccent: true,
      colors: { ...theme.colors, accent: val }
    };
    setTheme(updated);
    onThemeChange(updated);
    applyTheme(updated);
  };

  const handleSave = () => {
    const newTheme = { ...theme, id: `custom-${Date.now()}`, name: theme.name || 'My Custom Theme' };
    saveCustomTheme(newTheme);
    setSavedThemes(getCustomThemes());
    showToast('Custom Theme Preset Saved!');
  };

  const loadTheme = (t: AppTheme) => {
    setTheme(t);
    if (t.isGradientAccent && t.colors.accent.includes('linear-gradient')) {
      try {
        const match = t.colors.accent.match(/linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]{3,6})\s*0%,\s*(#[0-9a-fA-F]{3,6})\s*100%\)/);
        if (match) {
          setGradientAngle(parseInt(match[1]));
          setGradientStart(match[2]);
          setGradientEnd(match[3]);
        }
      } catch (e) {}
    }
    onThemeChange(t);
    applyTheme(t);
    showToast(`Loaded "${t.name}"`);
  };

  const handleSelectAccent = (colorHex: string) => {
    const updated = {
      ...theme,
      colors: {
        ...theme.colors,
        accent: colorHex,
      },
      isGradientAccent: false
    };
    setTheme(updated);
    onThemeChange(updated);
    applyTheme(updated);
    showToast(`Accent color updated!`);
  };

  return (
    <div className="space-y-8">
      
      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[var(--accent-solid)] text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Accent Colours Theme Suite */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: theme.colors.accent }} />
              Theme Accent Colours & Highlights
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Customize the primary highlight, active badges, and button tints across any theme.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)]">
              {theme.colors.accent}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRESET_ACCENTS.map(acc => {
            const isSelected = !theme.isGradientAccent && theme.colors.accent.toLowerCase() === acc.color.toLowerCase();
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectAccent(acc.color)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'border-[var(--accent-solid)] ring-2 ring-[var(--accent-solid)]/40 bg-[var(--background)] shadow-md'
                    : 'border-[var(--border-color)] bg-[var(--background)]/60 hover:bg-[var(--background)] hover:border-zinc-600'
                }`}
              >
                <div 
                  className="w-7 h-7 rounded-lg shrink-0 shadow-inner flex items-center justify-center border border-white/20"
                  style={{ backgroundColor: acc.color, boxShadow: isSelected ? `0 0 12px ${acc.glow}` : undefined }}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">{acc.name}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] truncate">{acc.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset System Themes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Official & Saved Theme Presets</h3>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">Includes Pure Light (White) & OLED Dark</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Nexus Dark */}
          <button
            onClick={() => loadTheme(DEFAULT_THEME)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              theme.id === DEFAULT_THEME.id 
                ? 'border-[var(--accent-solid)] ring-1 ring-[var(--accent-solid)] bg-[var(--card-bg)] shadow-md' 
                : 'border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--accent-solid)]'
            }`}
          >
            <div className="w-full h-7 rounded-lg mb-2 bg-[#0d1117] border border-[#30363d] flex items-center px-2">
              <span className="w-2 h-2 rounded-full bg-[#00a3c4]" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)] block">Nexus Dark</span>
            <span className="text-[10px] text-[var(--text-secondary)]">Balanced developer dark</span>
          </button>

          {/* Pure Light (White Theme) */}
          <button
            onClick={() => loadTheme(WHITE_THEME)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              theme.id === WHITE_THEME.id 
                ? 'border-[var(--accent-solid)] ring-1 ring-[var(--accent-solid)] bg-[var(--card-bg)] shadow-md' 
                : 'border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--accent-solid)]'
            }`}
          >
            <div className="w-full h-7 rounded-lg mb-2 bg-white border border-slate-300 flex items-center px-2">
              <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)] block">Pure Light (White)</span>
            <span className="text-[10px] text-[var(--text-secondary)]">Clean daytime white theme</span>
          </button>

          {/* OLED Midnight Dark */}
          <button
            onClick={() => loadTheme(OLED_DARK_THEME)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              theme.id === OLED_DARK_THEME.id 
                ? 'border-[var(--accent-solid)] ring-1 ring-[var(--accent-solid)] bg-[var(--card-bg)] shadow-md' 
                : 'border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--accent-solid)]'
            }`}
          >
            <div className="w-full h-7 rounded-lg mb-2 bg-black border border-neutral-800 flex items-center px-2">
              <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)] block">OLED Midnight</span>
            <span className="text-[10px] text-[var(--text-secondary)]">True deep black contrast</span>
          </button>

          {/* Cyberpunk Night City */}
          <button
            onClick={() => loadTheme(CYBERPUNK_THEME)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              theme.id === CYBERPUNK_THEME.id 
                ? 'border-[var(--accent-solid)] ring-1 ring-[var(--accent-solid)] bg-[var(--card-bg)] shadow-md' 
                : 'border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--accent-solid)]'
            }`}
          >
            <div className="w-full h-7 rounded-lg mb-2 bg-[#050505] border border-[#333333] flex items-center px-2" style={{ background: 'linear-gradient(90deg, #fcee0a 0%, #ff003c 100%)' }}>
              <span className="w-2 h-2 rounded-full bg-white shadow" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)] block">Night City</span>
            <span className="text-[10px] text-[var(--text-secondary)]">High-saturation neon</span>
          </button>

          {/* Custom Saved Themes */}
          {savedThemes.map(t => (
            <div key={t.id} className="relative group">
              <button 
                onClick={() => loadTheme(t)} 
                className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                  theme.id === t.id 
                    ? 'border-[var(--accent-solid)] ring-1 ring-[var(--accent-solid)] bg-[var(--card-bg)] shadow-md' 
                    : 'border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--accent-solid)]'
                }`}
              >
                <div className="w-full h-7 rounded-lg mb-2 flex items-center px-2" style={{ backgroundColor: t.colors.background, borderColor: t.colors.border, borderWidth: 1 }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: t.colors.accent }} />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)] truncate block">{t.name}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">Custom Preset</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteCustomTheme(t.id); setSavedThemes(getCustomThemes()); showToast('Deleted preset'); }}
                className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                title="Delete preset"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Custom Color Tuning Suite */}
        <div className="flex-1 space-y-6">
          
          {/* Base Palette with RGB Selection */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Precision RGB Color Suite</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Direct RGB slider calibration & hex color inputs for every theme layer</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <RgbColorControl
                label="Application Background"
                colorHex={theme.colors.background}
                onChange={(hex) => handleColorChange('background', hex)}
              />
              <RgbColorControl
                label="Navigation Sidebar"
                colorHex={theme.colors.sidebar}
                onChange={(hex) => handleColorChange('sidebar', hex)}
              />
              <RgbColorControl
                label="Cards & Message Bubbles"
                colorHex={theme.colors.card}
                onChange={(hex) => handleColorChange('card', hex)}
              />
              <RgbColorControl
                label="Card Borders & Dividers"
                colorHex={theme.colors.border}
                onChange={(hex) => handleColorChange('border', hex)}
              />
              <RgbColorControl
                label="Primary Typography"
                colorHex={theme.colors.textPrimary}
                onChange={(hex) => handleColorChange('textPrimary', hex)}
              />
              <RgbColorControl
                label="Secondary Typography"
                colorHex={theme.colors.textSecondary}
                onChange={(hex) => handleColorChange('textSecondary', hex)}
              />
            </div>
          </div>

          {/* Accent Engine */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Accent & Highlight Engine</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Toggle between solid RGB color or dynamic linear gradient</p>
              </div>
              <div className="flex bg-[var(--background)] rounded-lg p-1 border border-[var(--border-color)]">
                <button 
                  onClick={() => {
                    const updated = { ...theme, isGradientAccent: false, colors: { ...theme.colors, accent: gradientStart } };
                    setTheme(updated); 
                    onThemeChange(updated); 
                    applyTheme(updated);
                  }}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                    !theme.isGradientAccent ? 'bg-[var(--accent-bg)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Solid RGB
                </button>
                <button 
                  onClick={() => updateGradientAccent(gradientAngle, gradientStart, gradientEnd)}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                    theme.isGradientAccent ? 'bg-[var(--text-primary)] text-[var(--background)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Gradient
                </button>
              </div>
            </div>

            {!theme.isGradientAccent ? (
              <RgbColorControl
                label="Primary Accent Color"
                colorHex={theme.colors.accent}
                onChange={(hex) => handleColorChange('accent', hex)}
              />
            ) : (
              <div className="space-y-4">
                <div 
                  className="h-12 rounded-xl w-full shadow-inner border border-white/10 flex items-center justify-center" 
                  style={{ background: `linear-gradient(${gradientAngle}deg, ${gradientStart} 0%, ${gradientEnd} 100%)` }}
                >
                  <span className="text-xs font-mono font-bold text-white drop-shadow">
                    {gradientAngle}° Linear Gradient
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] font-mono">
                    <span>Gradient Angle</span>
                    <span className="text-cyan-400 font-bold">{gradientAngle}°</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="360" 
                    value={gradientAngle} 
                    onChange={(e) => {
                      const ang = parseInt(e.target.value);
                      setGradientAngle(ang);
                      updateGradientAccent(ang, gradientStart, gradientEnd);
                    }}
                    className="w-full h-1.5 bg-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <RgbColorControl
                    label="Start Gradient Color"
                    colorHex={gradientStart}
                    onChange={(hex) => {
                      setGradientStart(hex);
                      updateGradientAccent(gradientAngle, hex, gradientEnd);
                    }}
                  />
                  <RgbColorControl
                    label="End Gradient Color"
                    colorHex={gradientEnd}
                    onChange={(hex) => {
                      setGradientEnd(hex);
                      updateGradientAccent(gradientAngle, gradientStart, hex);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save Theme Section */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Preset Name</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={theme.name}
                onChange={(e) => setTheme({ ...theme, name: e.target.value })}
                className="flex-1 bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-xs font-medium focus:border-[var(--accent-solid)] outline-none"
                placeholder="Enter custom theme name (e.g. Arctic Minimal, Cyber Horizon)..."
              />
              <button 
                onClick={handleSave} 
                className="px-5 py-2.5 bg-[var(--accent-bg)] text-white rounded-xl text-xs font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Save Preset</span>
              </button>
            </div>
          </div>

        </div>

        {/* Live Responsive Preview */}
        <div className="w-full lg:w-80 flex-none">
          <div className="sticky top-4 space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Theme Preview</h3>
            
            {/* Mini Application Mockup */}
            <div 
              className="w-full rounded-2xl overflow-hidden border shadow-2xl flex flex-col h-[400px] transition-colors duration-200" 
              style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
            >
              {/* Header */}
              <div 
                className="h-11 border-b flex items-center px-4 justify-between" 
                style={{ backgroundColor: theme.colors.sidebar, borderColor: theme.colors.border }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[11px] font-bold font-mono" style={{ color: theme.colors.textSecondary }}>Nexus Live</span>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Mini Sidebar */}
                <div 
                  className="w-14 border-r flex flex-col items-center py-3 gap-3" 
                  style={{ backgroundColor: theme.colors.sidebar, borderColor: theme.colors.border }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow" style={{ background: theme.colors.accent }}>
                    N
                  </div>
                  <div className="w-6 h-6 rounded-lg opacity-40" style={{ backgroundColor: theme.colors.border }} />
                  <div className="w-6 h-6 rounded-lg opacity-40" style={{ backgroundColor: theme.colors.border }} />
                </div>

                {/* Mini Chat Stage */}
                <div className="flex-1 p-3 space-y-3 overflow-hidden relative flex flex-col justify-between">
                  <div className="space-y-2.5">
                    {/* Model Message */}
                    <div className="flex justify-start">
                      <div 
                        className="max-w-[85%] p-2.5 rounded-xl rounded-bl-none text-[11px] border leading-relaxed" 
                        style={{ 
                          backgroundColor: theme.colors.card, 
                          color: theme.colors.textPrimary,
                          borderColor: theme.colors.border
                        }}
                      >
                        Hello! RGB theme calibrated.
                      </div>
                    </div>

                    {/* User Message */}
                    <div className="flex justify-end">
                      <div 
                        className="max-w-[85%] p-2.5 rounded-xl rounded-br-none text-[11px] text-white font-medium shadow-md leading-relaxed" 
                        style={{ background: theme.colors.accent }}
                      >
                        Colors look crisp and legible.
                      </div>
                    </div>
                  </div>

                  {/* Input Mockup */}
                  <div 
                    className="h-9 rounded-xl border flex items-center px-2.5 justify-between" 
                    style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border }}
                  >
                    <span className="text-[10px] truncate" style={{ color: theme.colors.textSecondary }}>
                      Type message...
                    </span>
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[9px]" style={{ background: theme.colors.accent }}>
                      ↵
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
