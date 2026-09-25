import { StarterDashboardConfig, StarterWidgetItem, StarterWidgetId } from '../types';

const STORAGE_KEY = 'nexus_starter_dashboard_config';
const SCRATCHPAD_KEY = 'nexus_starter_scratchpad';
const CUSTOM_SHORTCUTS_KEY = 'nexus_starter_custom_shortcuts';

export interface DashboardShortcut {
  id: string;
  title: string;
  url?: string;
  iconName: string;
  iconColor: string;
  category: 'google' | 'tools' | 'ai' | 'custom';
  actionPrompt?: string;
}

export const DEFAULT_SHORTCUTS: DashboardShortcut[] = [
  {
    id: 'google_search',
    title: 'Google Search',
    iconName: 'Search',
    iconColor: '#4285F4',
    category: 'google',
    actionPrompt: 'Search the web for the latest updates on: '
  },
  {
    id: 'google_drive',
    title: 'Google Drive',
    iconName: 'Archive',
    iconColor: '#0F9D58',
    category: 'google',
    actionPrompt: 'Access and organize documents in Google Drive'
  },
  {
    id: 'google_docs',
    title: 'Google Docs',
    iconName: 'FileText',
    iconColor: '#4285F4',
    category: 'google',
    actionPrompt: 'Draft an executive report formatted for Google Docs: '
  },
  {
    id: 'google_sheets',
    title: 'Google Sheets',
    iconName: 'Activity',
    iconColor: '#0F9D58',
    category: 'google',
    actionPrompt: 'Create a spreadsheet data model with formulas and columns for: '
  },
  {
    id: 'google_calendar',
    title: 'Google Calendar',
    iconName: 'Clock',
    iconColor: '#EA4335',
    category: 'google',
    actionPrompt: 'Plan my daily schedule and calendar appointments for: '
  },
  {
    id: 'github',
    title: 'GitHub Repo',
    iconName: 'Code',
    iconColor: '#f0f6fc',
    category: 'tools',
    actionPrompt: 'Review or write production TypeScript code for: '
  },
  {
    id: 'wikipedia',
    title: 'Wikipedia Explore',
    iconName: 'Globe',
    iconColor: '#ffffff',
    category: 'tools',
    actionPrompt: 'Synthesize comprehensive historical and scientific knowledge regarding: '
  },
  {
    id: 'council_debate',
    title: 'AI Council',
    iconName: 'BrainCircuit',
    iconColor: '#a855f7',
    category: 'ai',
    actionPrompt: 'Convene the AI Council to deliberate and reach consensus on: '
  },
  {
    id: 'deep_research',
    title: 'Deep Research',
    iconName: 'Sparkles',
    iconColor: '#06b6d4',
    category: 'ai',
    actionPrompt: 'Conduct deep multi-source verified research on: '
  },
  {
    id: 'image_gen',
    title: 'Create Studio',
    iconName: 'Image',
    iconColor: '#ec4899',
    category: 'ai',
    actionPrompt: 'Generate a high-resolution cinematic concept artwork of: '
  }
];

export const DEFAULT_WIDGETS: StarterWidgetItem[] = [
  {
    id: 'daily_theme',
    title: 'Daily Theme & Daily Inspiration',
    description: 'Dynamic theme of the day, daily quote, and celestial mood',
    enabled: true,
    order: 0,
    colSpan: 2
  },
  {
    id: 'shortcuts',
    title: 'Google & Quick App Launcher',
    description: '1-click shortcuts for Google Workspace, AI tools, and custom bookmarks',
    enabled: true,
    order: 1,
    colSpan: 2
  },
  {
    id: 'prompts',
    title: 'Discovery & Starter Ideas',
    description: 'Trending prompt cards across coding, research, creative writing, and analysis',
    enabled: true,
    order: 2,
    colSpan: 2
  },
  {
    id: 'daily_briefing',
    title: 'Daily Briefing & Live Clock',
    description: 'Live time, date, personalized greeting, and daily focus goal',
    enabled: true,
    order: 3,
    colSpan: 1
  },
  {
    id: 'scratchpad',
    title: 'Quick Scratchpad & Drafts',
    description: 'Persistent notepad to draft notes and send straight to chat with 1 click',
    enabled: true,
    order: 4,
    colSpan: 1
  },
  {
    id: 'ai_roster',
    title: 'AI Persona & Expert Roster',
    description: 'Instant avatar selector for Council Agents and custom virtual personas',
    enabled: true,
    order: 5,
    colSpan: 1
  },
  {
    id: 'recent_chats',
    title: 'Recent Sessions & History',
    description: 'Quick resume for recent conversations and pinned threads',
    enabled: true,
    order: 6,
    colSpan: 1
  },
  {
    id: 'metrics',
    title: 'System & Token Metrics',
    description: 'Live token consumption, model status, and storage telemetry',
    enabled: false,
    order: 7,
    colSpan: 1
  },
  {
    id: 'inspiration',
    title: 'Daily Brain Teaser & Trivia',
    description: 'Daily intellectual riddle and curiosity question with reveal',
    enabled: false,
    order: 8,
    colSpan: 1
  }
];

export const DEFAULT_DASHBOARD_CONFIG: StarterDashboardConfig = {
  gridColumns: 2,
  widgets: DEFAULT_WIDGETS,
  showHeroBanner: true,
  autoDailyTheme: false
};

export const getStarterDashboardConfig = (): StarterDashboardConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DASHBOARD_CONFIG;
    const parsed = JSON.parse(raw);
    
    // Ensure any newly added widgets are present in the loaded configuration
    const mergedWidgets: StarterWidgetItem[] = DEFAULT_WIDGETS.map((defWidget) => {
      const existing = parsed.widgets?.find((w: StarterWidgetItem) => w.id === defWidget.id);
      return existing ? { ...defWidget, ...existing } : defWidget;
    });

    return {
      ...DEFAULT_DASHBOARD_CONFIG,
      ...parsed,
      widgets: mergedWidgets.sort((a, b) => a.order - b.order)
    };
  } catch {
    return DEFAULT_DASHBOARD_CONFIG;
  }
};

export const saveStarterDashboardConfig = (config: StarterDashboardConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save starter dashboard config', e);
  }
};

export const toggleWidgetEnabled = (widgetId: StarterWidgetId, enabled: boolean): StarterDashboardConfig => {
  const current = getStarterDashboardConfig();
  const updatedWidgets = current.widgets.map(w => w.id === widgetId ? { ...w, enabled } : w);
  const updatedConfig = { ...current, widgets: updatedWidgets };
  saveStarterDashboardConfig(updatedConfig);
  return updatedConfig;
};

export const reorderWidget = (widgetId: StarterWidgetId, direction: 'up' | 'down'): StarterDashboardConfig => {
  const current = getStarterDashboardConfig();
  const sorted = [...current.widgets].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex(w => w.id === widgetId);
  if (index === -1) return current;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return current;

  // Swap orders
  const temp = sorted[index].order;
  sorted[index].order = sorted[targetIndex].order;
  sorted[targetIndex].order = temp;

  const updatedConfig = {
    ...current,
    widgets: sorted.sort((a, b) => a.order - b.order)
  };
  saveStarterDashboardConfig(updatedConfig);
  return updatedConfig;
};

export const updateGridColumns = (cols: 1 | 2 | 3 | 4): StarterDashboardConfig => {
  const current = getStarterDashboardConfig();
  const updatedConfig = { ...current, gridColumns: cols };
  saveStarterDashboardConfig(updatedConfig);
  return updatedConfig;
};

export const getSavedScratchpad = (): string => {
  try {
    return localStorage.getItem(SCRATCHPAD_KEY) || '';
  } catch {
    return '';
  }
};

export const saveScratchpad = (text: string): void => {
  try {
    localStorage.setItem(SCRATCHPAD_KEY, text);
  } catch (e) {
    console.error('Failed to save scratchpad', e);
  }
};

export const getSavedShortcuts = (): DashboardShortcut[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_SHORTCUTS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SHORTCUTS;
  } catch {
    return DEFAULT_SHORTCUTS;
  }
};

export const saveSavedShortcuts = (shortcuts: DashboardShortcut[]): void => {
  try {
    localStorage.setItem(CUSTOM_SHORTCUTS_KEY, JSON.stringify(shortcuts));
  } catch (e) {
    console.error('Failed to save shortcuts', e);
  }
};
