import { AppTheme } from '../types';

const THEME_KEY = 'nexus_current_theme';
const SAVED_THEMES_KEY = 'nexus_saved_themes';

export const DEFAULT_THEME: AppTheme = {
  id: 'default',
  name: 'Nexus Dark',
  colors: {
    background: '#0d1117',
    sidebar: '#010409',
    card: '#161b22',
    textPrimary: '#f0f6fc',
    textSecondary: '#8b949e',
    accent: '#00a3c4', // Cyan
    border: '#30363d',
  },
  isGradientAccent: false,
};

export const WHITE_THEME: AppTheme = {
  id: 'white',
  name: 'Pure Light (White)',
  colors: {
    background: '#ffffff',
    sidebar: '#f8fafc',
    card: '#f1f5f9',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    accent: '#0284c7', // Sky Blue
    border: '#e2e8f0',
  },
  isGradientAccent: false,
};

export const OLED_DARK_THEME: AppTheme = {
  id: 'oled_dark',
  name: 'OLED Midnight Dark',
  colors: {
    background: '#050507',
    sidebar: '#000000',
    card: '#0f0f12',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    accent: '#06b6d4', // Electric Cyan
    border: '#222228',
  },
  isGradientAccent: false,
};

export const CYBERPUNK_THEME: AppTheme = {
  id: 'cyberpunk',
  name: 'Night City',
  colors: {
    background: '#050505',
    sidebar: '#000000',
    card: '#121212',
    textPrimary: '#ff003c',
    textSecondary: '#fcee0a',
    accent: 'linear-gradient(90deg, #fcee0a 0%, #ff003c 100%)',
    border: '#333333',
  },
  isGradientAccent: true,
};

export interface AccentColorPreset {
  id: string;
  name: string;
  color: string;
  glow: string;
  description: string;
}

export const PRESET_ACCENTS: AccentColorPreset[] = [
  { id: 'cyan', name: 'Electric Cyan', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', description: 'Vibrant futuristic teal' },
  { id: 'indigo', name: 'Ultra Indigo', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)', description: 'Deep high-contrast purple-blue' },
  { id: 'emerald', name: 'Mint Emerald', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', description: 'Crisp organic green' },
  { id: 'rose', name: 'Neon Rose', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', description: 'Bold magenta rose' },
  { id: 'amber', name: 'Solar Amber', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', description: 'Warm energetic gold' },
  { id: 'sky', name: 'Sky Blue', color: '#0284c7', glow: 'rgba(2, 132, 199, 0.4)', description: 'Clean modern blue' },
  { id: 'purple', name: 'Cosmic Violet', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', description: 'Mystic neon purple' },
  { id: 'crimson', name: 'Crimson Flame', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', description: 'High intensity red' },
];

export const applyTheme = (theme: AppTheme) => {
  const root = document.documentElement;
  
  root.style.setProperty('--app-bg', theme.colors.background);
  root.style.setProperty('--sidebar-bg', theme.colors.sidebar);
  root.style.setProperty('--card-bg', theme.colors.card);
  root.style.setProperty('--text-primary', theme.colors.textPrimary);
  root.style.setProperty('--text-secondary', theme.colors.textSecondary);
  root.style.setProperty('--border-color', theme.colors.border);
  
  if (theme.isGradientAccent) {
    root.style.setProperty('--accent-bg', theme.colors.accent);
    root.style.setProperty('--accent-solid', '#ffffff');
    root.style.setProperty('--accent-hover', 'rgba(255, 255, 255, 0.15)');
    root.style.setProperty('--accent-glow', 'rgba(255, 255, 255, 0.3)');
    root.style.setProperty('--accent-subtle', 'rgba(255, 255, 255, 0.1)');
  } else {
    root.style.setProperty('--accent-bg', theme.colors.accent);
    root.style.setProperty('--accent-solid', theme.colors.accent);
    root.style.setProperty('--accent-hover', `${theme.colors.accent}dd`);
    root.style.setProperty('--accent-glow', `${theme.colors.accent}4d`);
    root.style.setProperty('--accent-subtle', `${theme.colors.accent}1a`);
  }

  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
};

export const updateCurrentThemeAccent = (accentHex: string, isGradient: boolean = false): AppTheme => {
  const current = getSavedTheme();
  const updatedTheme: AppTheme = {
    ...current,
    colors: {
      ...current.colors,
      accent: accentHex
    },
    isGradientAccent: isGradient
  };
  applyTheme(updatedTheme);
  return updatedTheme;
};

export const getSavedTheme = (): AppTheme => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const getCustomThemes = (): AppTheme[] => {
    try {
        const stored = localStorage.getItem(SAVED_THEMES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export const saveCustomTheme = (theme: AppTheme) => {
    const current = getCustomThemes();
    const updated = [...current.filter(t => t.id !== theme.id), theme];
    localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(updated));
}

export const deleteCustomTheme = (id: string) => {
    const current = getCustomThemes();
    const updated = current.filter(t => t.id !== id);
    localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(updated));
}