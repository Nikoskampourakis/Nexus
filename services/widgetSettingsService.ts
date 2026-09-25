export interface WidgetSettings {
  weather: boolean;
  stocks: boolean;
  news: boolean;
  recentChats: boolean;
  dailyTheme: boolean;
  clock: boolean;
}

const STORAGE_KEY = 'brave_starter_widget_settings';

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  weather: true,
  stocks: true,
  news: true,
  recentChats: true,
  dailyTheme: false,
  clock: true,
};

export function getWidgetSettings(): WidgetSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGET_SETTINGS;
    const parsed = JSON.parse(raw);
    // Strip obsolete 'summarize' key if present
    delete parsed.summarize;
    return { ...DEFAULT_WIDGET_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_WIDGET_SETTINGS;
  }
}

export function saveWidgetSettings(settings: WidgetSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('widget_settings_updated', { detail: settings }));
  } catch (e) {
    console.error('Failed to save widget settings', e);
  }
}

export function hasAnyWidgetEnabled(settings: WidgetSettings): boolean {
  return settings.weather || settings.stocks || settings.news || settings.recentChats || settings.dailyTheme;
}

export interface StockItem {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
  sparkline?: number[];
}

export const MOCK_STOCKS: StockItem[] = [
  { symbol: 'S&P 500', name: 'S&P 500', price: '5,842.10', change: '+0.74%', isPositive: true, sparkline: [40, 42, 45, 48, 52, 58, 62] },
  { symbol: 'NASDAQ', name: 'Nasdaq 100', price: '20,381.40', change: '+1.12%', isPositive: true, sparkline: [120, 125, 122, 130, 138, 142] },
  { symbol: 'BTC', name: 'Bitcoin', price: '$68,490', change: '+2.85%', isPositive: true, sparkline: [62, 64, 63, 67, 68, 71] },
  { symbol: 'ETH', name: 'Ethereum', price: '$2,640', change: '-0.42%', isPositive: false, sparkline: [32, 31, 33, 30, 29, 28] },
  { symbol: 'NVDA', name: 'Nvidia Corp', price: '$141.50', change: '+3.40%', isPositive: true, sparkline: [130, 132, 135, 138, 141] },
  { symbol: 'AAPL', name: 'Apple Inc', price: '$232.10', change: '+0.15%', isPositive: true, sparkline: [228, 229, 230, 231, 232] },
];

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timeAgo: string;
  category: string;
  url?: string;
  summary: string;
  thumbnailUrl: string;
}

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: 'OpenAI and Google unveil next-generation multimodal agent benchmarks',
    source: 'TechCrunch',
    timeAgo: '2h ago',
    category: 'AI & Tech',
    summary: 'New benchmarks show dramatic leaps in autonomous reasoning and zero-shot code synthesis across multi-step browser tasks.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'n2',
    title: 'James Webb Telescope discovers earliest known organic compounds in deep space',
    source: 'Nature Astronomy',
    timeAgo: '4h ago',
    category: 'Science',
    summary: 'Spectroscopy readings reveal complex organic molecules formed just 350 million years after the cosmic dawn.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'n3',
    title: 'Global renewable electricity generation reaches record 33% milestone',
    source: 'Bloomberg Energy',
    timeAgo: '5h ago',
    category: 'Economy',
    summary: 'Solar and wind infrastructure expansion in Asia and Europe drove unprecedented capacity growth over the past quarter.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'n4',
    title: 'Breakthrough in Quantum Error Correction stabilizes logical qubits for 10+ minutes',
    source: 'ArXiv / MIT',
    timeAgo: '7h ago',
    category: 'Quantum',
    summary: 'Researchers demonstrate a surface-code lattice maintaining error-free superposition states for record duration.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=300&q=80'
  }
];

export interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  high: number;
  low: number;
  humidity: number;
  windMph: number;
  icon: string;
}

export const MOCK_WEATHER: WeatherData = {
  city: 'San Francisco, CA',
  temp: 64,
  condition: 'Partly Cloudy',
  high: 68,
  low: 54,
  humidity: 72,
  windMph: 9,
  icon: 'cloud-sun'
};
