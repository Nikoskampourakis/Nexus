import { AppTheme } from '../types';

export type { AppTheme };

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
  name: 'Cyberpunk Night City',
  colors: {
    background: '#0a0a10',
    sidebar: '#050508',
    card: '#12121e',
    textPrimary: '#00f0ff',
    textSecondary: '#ff007f',
    accent: '#00f0ff',
    border: '#2a1a3a',
  },
  isGradientAccent: false,
};

export const EMERALD_MATRIX_THEME: AppTheme = {
  id: 'emerald_matrix',
  name: 'Emerald Matrix',
  colors: {
    background: '#030d07',
    sidebar: '#010804',
    card: '#08170d',
    textPrimary: '#00ff66',
    textSecondary: '#10b981',
    accent: '#00ff66',
    border: '#0d381c',
  },
  isGradientAccent: false,
};

export const SYNTHWAVE_THEME: AppTheme = {
  id: 'synthwave',
  name: 'Midnight Synthwave',
  colors: {
    background: '#0f081d',
    sidebar: '#080411',
    card: '#1a0e30',
    textPrimary: '#f5d0fe',
    textSecondary: '#c084fc',
    accent: '#d946ef',
    border: '#3b1c6e',
  },
  isGradientAccent: false,
};

export const SOLAR_AMBER_THEME: AppTheme = {
  id: 'solar_amber',
  name: 'Solar Amber Luxe',
  colors: {
    background: '#0e0c08',
    sidebar: '#070603',
    card: '#18140c',
    textPrimary: '#fef3c7',
    textSecondary: '#d97706',
    accent: '#f59e0b',
    border: '#332610',
  },
  isGradientAccent: false,
};

export const NORDIC_FROST_THEME: AppTheme = {
  id: 'nordic_frost',
  name: 'Nordic Frost',
  colors: {
    background: '#081119',
    sidebar: '#04090e',
    card: '#0f1f2d',
    textPrimary: '#e0f2fe',
    textSecondary: '#7dd3fc',
    accent: '#38bdf8',
    border: '#16354d',
  },
  isGradientAccent: false,
};

export const MONOCHROME_SLATE_THEME: AppTheme = {
  id: 'monochrome_slate',
  name: 'Bauhaus Monochrome',
  colors: {
    background: '#121214',
    sidebar: '#0a0a0c',
    card: '#1a1a1e',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    accent: '#ffffff',
    border: '#27272a',
  },
  isGradientAccent: false,
};

export const ROSE_QUARTZ_THEME: AppTheme = {
  id: 'rose_quartz',
  name: 'Rose Quartz & Burgundy',
  colors: {
    background: '#140a0f',
    sidebar: '#0b0408',
    card: '#201018',
    textPrimary: '#ffe4e6',
    textSecondary: '#fb7185',
    accent: '#f43f5e',
    border: '#44192a',
  },
  isGradientAccent: false,
};

export const DEEP_OCEAN_THEME: AppTheme = {
  id: 'deep_ocean',
  name: 'Abyssal Deep Ocean',
  colors: {
    background: '#040d1a',
    sidebar: '#02070f',
    card: '#08182b',
    textPrimary: '#e0f2fe',
    textSecondary: '#38bdf8',
    accent: '#0284c7',
    border: '#0c2d4a',
  },
  isGradientAccent: false,
};

export const TOKYO_NIGHT_THEME: AppTheme = {
  id: 'tokyo_night',
  name: 'Tokyo Night Neon',
  colors: {
    background: '#1a1b26',
    sidebar: '#16161e',
    card: '#24283b',
    textPrimary: '#c0caf5',
    textSecondary: '#7aa2f7',
    accent: '#bb9af7',
    border: '#2f3549',
  },
  isGradientAccent: false,
};

export const DRACULA_VELVET_THEME: AppTheme = {
  id: 'dracula_velvet',
  name: 'Dracula Velvet',
  colors: {
    background: '#282a36',
    sidebar: '#21222c',
    card: '#343746',
    textPrimary: '#f8f8f2',
    textSecondary: '#6272a4',
    accent: '#ff79c6',
    border: '#44475a',
  },
  isGradientAccent: false,
};

export const FOREST_MOSS_THEME: AppTheme = {
  id: 'forest_moss',
  name: 'Evergreen Forest & Moss',
  colors: {
    background: '#07120a',
    sidebar: '#030a05',
    card: '#0d2113',
    textPrimary: '#ecfdf5',
    textSecondary: '#34d399',
    accent: '#10b981',
    border: '#163b20',
  },
  isGradientAccent: false,
};

export const SUNSET_HORIZON_THEME: AppTheme = {
  id: 'sunset_horizon',
  name: 'Sunset Horizon Gold',
  colors: {
    background: '#160b08',
    sidebar: '#0e0604',
    card: '#24120e',
    textPrimary: '#fff7ed',
    textSecondary: '#fb923c',
    accent: '#f97316',
    border: '#441d14',
  },
  isGradientAccent: false,
};

export const MATCHA_LATTE_THEME: AppTheme = {
  id: 'matcha_latte',
  name: 'Matcha Latte Cream (Light)',
  colors: {
    background: '#f4f7f2',
    sidebar: '#e8efe5',
    card: '#ffffff',
    textPrimary: '#1e2920',
    textSecondary: '#4d6952',
    accent: '#447d4e',
    border: '#d2e0ce',
  },
  isGradientAccent: false,
};

export const COFFEE_ESPRESSO_THEME: AppTheme = {
  id: 'coffee_espresso',
  name: 'Warm Espresso & Cream',
  colors: {
    background: '#120d0a',
    sidebar: '#0a0705',
    card: '#1e1611',
    textPrimary: '#fed7aa',
    textSecondary: '#c29b7a',
    accent: '#d97706',
    border: '#38261a',
  },
  isGradientAccent: false,
};

export const AURORA_BOREALIS_THEME: AppTheme = {
  id: 'aurora_borealis',
  name: 'Aurora Borealis Glow',
  colors: {
    background: '#060e14',
    sidebar: '#03080c',
    card: '#0c1a24',
    textPrimary: '#a7f3d0',
    textSecondary: '#2dd4bf',
    accent: '#06b6d4',
    border: '#153545',
  },
  isGradientAccent: false,
};

export const LAVENDER_MIST_THEME: AppTheme = {
  id: 'lavender_mist',
  name: 'Lavender Mist (Light)',
  colors: {
    background: '#f8f7fc',
    sidebar: '#eeebf7',
    card: '#ffffff',
    textPrimary: '#2e1065',
    textSecondary: '#7c3aed',
    accent: '#8b5cf6',
    border: '#ddd6fe',
  },
  isGradientAccent: false,
};

export const GOLDEN_OBSIDIAN_THEME: AppTheme = {
  id: 'golden_obsidian',
  name: 'Golden Obsidian Royal',
  colors: {
    background: '#0a0a08',
    sidebar: '#050504',
    card: '#141410',
    textPrimary: '#fef08a',
    textSecondary: '#eab308',
    accent: '#facc15',
    border: '#2c2912',
  },
  isGradientAccent: false,
};

export const CRIMSON_EMBER_THEME: AppTheme = {
  id: 'crimson_ember',
  name: 'Crimson Ember Forge',
  colors: {
    background: '#140505',
    sidebar: '#0a0202',
    card: '#220909',
    textPrimary: '#fee2e2',
    textSecondary: '#f87171',
    accent: '#ef4444',
    border: '#451010',
  },
  isGradientAccent: false,
};

export const VAPORWAVE_80S_THEME: AppTheme = {
  id: 'vaporwave_80s',
  name: 'Vaporwave 1984',
  colors: {
    background: '#120b22',
    sidebar: '#0b0616',
    card: '#1f1338',
    textPrimary: '#fdf4ff',
    textSecondary: '#e879f9',
    accent: '#22d3ee',
    border: '#432070',
  },
  isGradientAccent: false,
};

export const CURATED_THEMES: AppTheme[] = [
  DEFAULT_THEME,
  WHITE_THEME,
  OLED_DARK_THEME,
  CYBERPUNK_THEME,
  EMERALD_MATRIX_THEME,
  SYNTHWAVE_THEME,
  SOLAR_AMBER_THEME,
  NORDIC_FROST_THEME,
  MONOCHROME_SLATE_THEME,
  ROSE_QUARTZ_THEME,
  DEEP_OCEAN_THEME,
  TOKYO_NIGHT_THEME,
  DRACULA_VELVET_THEME,
  FOREST_MOSS_THEME,
  SUNSET_HORIZON_THEME,
  MATCHA_LATTE_THEME,
  COFFEE_ESPRESSO_THEME,
  AURORA_BOREALIS_THEME,
  LAVENDER_MIST_THEME,
  GOLDEN_OBSIDIAN_THEME,
  CRIMSON_EMBER_THEME,
  VAPORWAVE_80S_THEME,
];

export const DAILY_THEMES_CYCLE: { day: string; themeId: string; title: string; quote: string }[] = [
  { day: 'Sunday', themeId: 'solar_amber', title: 'Solar Flare Sunday', quote: 'Recharge your energy and illuminate ambitious horizons.' },
  { day: 'Monday', themeId: 'default', title: 'Nexus Modern Monday', quote: 'A fresh week of focus, clarity, and bold breakthroughs.' },
  { day: 'Tuesday', themeId: 'deep_ocean', title: 'Deep Ocean Tuesday', quote: 'Dive deep into complex challenges with calm precision.' },
  { day: 'Wednesday', themeId: 'emerald_matrix', title: 'Emerald Matrix Wednesday', quote: 'Midweek momentum: compile ideas into living systems.' },
  { day: 'Thursday', themeId: 'tokyo_night', title: 'Tokyo Neon Thursday', quote: 'High speed, high fidelity, and boundless innovation.' },
  { day: 'Friday', themeId: 'synthwave', title: 'Synthwave Friday', quote: 'Celebrate accomplishments with vibrant futuristic rhythm.' },
  { day: 'Saturday', themeId: 'aurora_borealis', title: 'Aurora Glow Saturday', quote: 'Create without limits under the celestial lights.' },
];

export const getDailyThemeInfo = () => {
  const dayIndex = new Date().getDay();
  const info = DAILY_THEMES_CYCLE[dayIndex] || DAILY_THEMES_CYCLE[1];
  const theme = CURATED_THEMES.find(t => t.id === info.themeId) || DEFAULT_THEME;
  return { ...info, theme };
};

export const isAutoDailyThemeEnabled = (): boolean => {
  try {
    return localStorage.getItem('nexus_auto_daily_theme') === 'true';
  } catch {
    return false;
  }
};

export const setAutoDailyTheme = (enabled: boolean) => {
  try {
    localStorage.setItem('nexus_auto_daily_theme', enabled ? 'true' : 'false');
    if (enabled) {
      const { theme } = getDailyThemeInfo();
      applyTheme(theme);
    }
  } catch (e) {
    console.error('Failed to set auto daily theme', e);
  }
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