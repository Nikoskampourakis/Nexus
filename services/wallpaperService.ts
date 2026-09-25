export interface WallpaperItem {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  photographer: string;
  source: string;
  sourceUrl?: string;
  location?: string;
  category: 'nature' | 'cyberpunk' | 'space' | 'minimal' | 'architecture' | 'custom';
}

export interface WallpaperConfig {
  enabled: boolean;
  mode: 'daily' | 'curated' | 'custom_set';
  activeWallpaperId: string;
  systemWide: boolean; // Applies system-wide across full app (chat, sidebar, starter)
  overlayOpacity: number; // 0.0 to 0.9 (Dimming overlay over picture)
  blurAmount: number; // 0 to 20px
  cardTransparency: number; // 0.2 to 1.0 (Widget & card glass opacity)
  autoSwitchMinutes: number; // 0 (off), 15, 30, 60, 1440
  showCredits: boolean;
  customWallpapers: WallpaperItem[];
  lastSwitchTimestamp: number;
}

export const CURATED_WALLPAPERS: WallpaperItem[] = [
  {
    id: 'wp_yosemite',
    title: 'Milky Way Over Cathedral Peak',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=70',
    photographer: 'Bailey Zindel',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/NRQV-hBF10M',
    location: 'Yosemite National Park, California',
    category: 'nature'
  },
  {
    id: 'wp_tokyo',
    title: 'Neo Tokyo Neon Rain',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=2400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=70',
    photographer: 'Aleksandar Pasaric',
    source: 'Unsplash / Pexels',
    sourceUrl: 'https://unsplash.com',
    location: 'Shinjuku, Tokyo',
    category: 'cyberpunk'
  },
  {
    id: 'wp_aurora',
    title: 'Emerald Aurora Borealis & Arctic Fjords',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=2400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=400&q=70',
    photographer: 'Jonatan Pie',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/VlH2e_7k-x0',
    location: 'Tromsø, Norway',
    category: 'nature'
  },
  {
    id: 'wp_nebula',
    title: 'Carina Nebula Deep Field Starburst',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=70',
    photographer: 'NASA / ESA Hubble Archive',
    source: 'NASA / Unsplash',
    sourceUrl: 'https://images.nasa.gov',
    location: 'Deep Space',
    category: 'space'
  },
  {
    id: 'wp_desert',
    title: 'Minimalist Saharan Sunburst Dunes',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=70',
    photographer: 'Luca Bravo',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/O453M2Liufs',
    location: 'Erg Chebbi, Morocco',
    category: 'minimal'
  },
  {
    id: 'wp_fog_forest',
    title: 'Redwood Mist & Golden Hour Sunbeams',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=70',
    photographer: 'Sebastian Unrau',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/sp-p7uuT0tw',
    location: 'Black Forest / Pacific Northwest',
    category: 'nature'
  },
  {
    id: 'wp_modern_arch',
    title: 'Minimal Geometric Glass Atrium',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=70',
    photographer: 'Joel Filipe',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/dImUpU18t0g',
    location: 'Munich, Germany',
    category: 'architecture'
  }
];

const STORAGE_KEY = 'nexus_wallpaper_config';

export const DEFAULT_WALLPAPER_CONFIG: WallpaperConfig = {
  enabled: true,
  mode: 'daily',
  activeWallpaperId: 'wp_yosemite',
  systemWide: true,
  overlayOpacity: 0.45,
  blurAmount: 0,
  cardTransparency: 0.85,
  autoSwitchMinutes: 30,
  showCredits: true,
  customWallpapers: [],
  lastSwitchTimestamp: Date.now()
};

export function getWallpaperConfig(): WallpaperConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WALLPAPER_CONFIG;
    return { ...DEFAULT_WALLPAPER_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_WALLPAPER_CONFIG;
  }
}

export function saveWallpaperConfig(config: WallpaperConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    applyWallpaperToDom(config);
    window.dispatchEvent(new CustomEvent('wallpaper_config_updated', { detail: config }));
  } catch (e) {
    console.error('Failed to save wallpaper config', e);
  }
}

export function getAllAvailableWallpapers(config: WallpaperConfig): WallpaperItem[] {
  return [...CURATED_WALLPAPERS, ...config.customWallpapers];
}

export function getDailyWallpaper(): WallpaperItem {
  // Compute deterministic daily index based on day of year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % CURATED_WALLPAPERS.length;
  return CURATED_WALLPAPERS[index];
}

export function getActiveWallpaper(config: WallpaperConfig): WallpaperItem {
  if (config.mode === 'daily') {
    return getDailyWallpaper();
  }
  const all = getAllAvailableWallpapers(config);
  return all.find(w => w.id === config.activeWallpaperId) || CURATED_WALLPAPERS[0];
}

export function switchNextWallpaper(): WallpaperItem {
  const config = getWallpaperConfig();
  const all = getAllAvailableWallpapers(config);
  const currentIndex = all.findIndex(w => w.id === config.activeWallpaperId);
  const nextIndex = (currentIndex + 1) % all.length;
  const nextWp = all[nextIndex];

  const updated: WallpaperConfig = {
    ...config,
    activeWallpaperId: nextWp.id,
    mode: 'curated',
    lastSwitchTimestamp: Date.now()
  };
  saveWallpaperConfig(updated);
  return nextWp;
}

export function addCustomWallpaper(title: string, url: string, photographer?: string, location?: string): WallpaperItem {
  const config = getWallpaperConfig();
  const newItem: WallpaperItem = {
    id: `custom_wp_${Date.now()}`,
    title: title.trim() || 'Custom Picture',
    url: url.trim(),
    photographer: photographer?.trim() || 'User Upload',
    source: 'Custom Collection',
    location: location?.trim() || 'Personal Gallery',
    category: 'custom'
  };

  const updated: WallpaperConfig = {
    ...config,
    customWallpapers: [newItem, ...config.customWallpapers],
    activeWallpaperId: newItem.id,
    mode: 'custom_set',
    enabled: true
  };
  saveWallpaperConfig(updated);
  return newItem;
}

export function removeCustomWallpaper(id: string): void {
  const config = getWallpaperConfig();
  const filtered = config.customWallpapers.filter(w => w.id !== id);
  const updated: WallpaperConfig = {
    ...config,
    customWallpapers: filtered,
    activeWallpaperId: config.activeWallpaperId === id ? CURATED_WALLPAPERS[0].id : config.activeWallpaperId
  };
  saveWallpaperConfig(updated);
}

export function applyWallpaperToDom(config: WallpaperConfig = getWallpaperConfig()): void {
  const root = document.documentElement;

  if (!config.enabled) {
    root.style.removeProperty('--wallpaper-image');
    root.style.removeProperty('--wallpaper-overlay-opacity');
    root.style.removeProperty('--wallpaper-blur');
    root.style.removeProperty('--card-glass-opacity');
    root.classList.remove('has-system-wallpaper');
    return;
  }

  const activeWp = getActiveWallpaper(config);

  root.style.setProperty('--wallpaper-image', `url("${activeWp.url}")`);
  root.style.setProperty('--wallpaper-overlay-opacity', config.overlayOpacity.toString());
  root.style.setProperty('--wallpaper-blur', `${config.blurAmount}px`);
  root.style.setProperty('--card-glass-opacity', config.cardTransparency.toString());

  if (config.systemWide) {
    root.classList.add('has-system-wallpaper');
  } else {
    root.classList.remove('has-system-wallpaper');
  }
}

// Background auto-switch ticker (checks every minute if 30m elapsed)
let autoSwitchIntervalId: any = null;

export function initWallpaperAutoSwitcher(): () => void {
  // Initial apply
  applyWallpaperToDom();

  if (autoSwitchIntervalId) {
    clearInterval(autoSwitchIntervalId);
  }

  autoSwitchIntervalId = setInterval(() => {
    const config = getWallpaperConfig();
    if (!config.enabled || config.autoSwitchMinutes <= 0) return;

    const intervalMs = config.autoSwitchMinutes * 60 * 1000;
    const now = Date.now();
    if (now - config.lastSwitchTimestamp >= intervalMs) {
      switchNextWallpaper();
    }
  }, 60000); // Check every 60 seconds

  return () => {
    if (autoSwitchIntervalId) clearInterval(autoSwitchIntervalId);
  };
}
