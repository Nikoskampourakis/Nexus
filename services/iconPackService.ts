import { IconPack } from '../types';

const ICON_PACK_KEY = 'nexus_active_icon_pack';
const CUSTOM_OVERRIDES_KEY = 'nexus_custom_icon_overrides';

export interface IconPackState {
  activePackId: string;
  customOverrides: Record<string, string>; // iconId -> image URL / base64
}

export interface AppIconCatalogItem {
  id: string;
  label: string;
  category: 'Identity' | 'Action' | 'AI Tools' | 'Navigation' | 'Media & Inputs' | 'Developer';
  description: string;
  aliases?: string[];
}

export const APP_ICON_CATALOG: AppIconCatalogItem[] = [
  { id: 'Bot', label: 'AI Model / Assistant Avatar', category: 'Identity', description: 'Avatar icon for AI assistant messages across chat views.', aliases: ['AI', 'Assistant'] },
  { id: 'User', label: 'User Profile Avatar', category: 'Identity', description: 'Avatar icon for user messages and profile identity.', aliases: ['Profile', 'Account'] },
  { id: 'Send', label: 'Send Message Button', category: 'Action', description: 'Primary action icon inside the chat message composer.', aliases: ['Submit', 'Post'] },
  { id: 'Plus', label: 'Upload & Attach Menu (+)', category: 'Action', description: 'Trigger button for attachments, camera, drive, and media options.', aliases: ['Add', 'Attach'] },
  { id: 'HardDrive', label: 'Google Drive Integration', category: 'Media & Inputs', description: 'Icon for importing documents and spreadsheets from Google Drive.', aliases: ['Drive', 'GoogleDrive'] },
  { id: 'Gmail', label: 'Gmail Inbox & Mail', category: 'Media & Inputs', description: 'Official transparent icon for Gmail inbox search and email actions.', aliases: ['Mail', 'Email', 'gmail'] },
  { id: 'GoogleDocs', label: 'Google Docs Document', category: 'Media & Inputs', description: 'Official transparent icon for Google Docs text documents.', aliases: ['Docs', 'Document', 'docs'] },
  { id: 'GoogleSheets', label: 'Google Sheets Spreadsheet', category: 'Media & Inputs', description: 'Official transparent icon for Google Sheets spreadsheets and formulas.', aliases: ['Sheets', 'Spreadsheet', 'sheets'] },
  { id: 'GoogleCalendar', label: 'Google Calendar & Schedule', category: 'Media & Inputs', description: 'Official transparent icon for Google Calendar meetings and schedule.', aliases: ['Calendar', 'Schedule', 'calendar'] },
  { id: 'GoogleTasks', label: 'Google Tasks & To-Do', category: 'Media & Inputs', description: 'Official transparent icon for Google Tasks reminders and check items.', aliases: ['Tasks', 'Todo', 'tasks'] },
  { id: 'GoogleSlides', label: 'Google Slides Presentation', category: 'Media & Inputs', description: 'Official transparent icon for Google Slides presentations.', aliases: ['Slides', 'Presentation', 'slides'] },
  { id: 'Sparkles', label: 'AI Generation & Studio', category: 'AI Tools', description: 'Icon for AI magic, image generation, and quick prompt enhancement.', aliases: ['Magic', 'AiGen'] },
  { id: 'Settings', label: 'System Configuration', category: 'Navigation', description: 'Icon for opening system settings, preferences, and theme builder.', aliases: ['Gear', 'Config'] },
  { id: 'Search', label: 'Search Bar & Navigation', category: 'Navigation', description: 'Icon for searching chat sessions, archives, and web results.', aliases: ['Find', 'Glass'] },
  { id: 'Camera', label: 'Camera Photo Capture', category: 'Media & Inputs', description: 'Icon for taking real-time snapshot photos from camera.', aliases: ['Photo', 'Snapshot'] },
  { id: 'Mic', label: 'Voice Microphone Input', category: 'Media & Inputs', description: 'Icon for voice dictation and speech-to-text input.', aliases: ['Audio', 'Voice'] },
  { id: 'Trash', label: 'Delete & Clear History', category: 'Action', description: 'Icon for deleting chat sessions, clearing logs, or resetting icons.', aliases: ['Trash2', 'Delete', 'Remove'] },
  { id: 'Share', label: 'Share & Export Document', category: 'Action', description: 'Icon for sharing conversations, exporting PDFs, and generating ZIPs.', aliases: ['Share2', 'Export'] },
  { id: 'Folder', label: 'Chat Folders & Categories', category: 'Navigation', description: 'Icon for organizational chat folders and grouped conversations.', aliases: ['Directory', 'Category'] },
  { id: 'BrainCircuit', label: 'Council Debate Mode', category: 'AI Tools', description: 'Icon for Council Chamber debate mode and multi-agent reasoning.', aliases: ['Council', 'Debate'] },
  { id: 'Globe', label: 'Live Web Research', category: 'AI Tools', description: 'Icon for live Google web search grounding and deep research.', aliases: ['Research', 'Web'] },
  { id: 'Glasses', label: 'Socratic Study Assistant', category: 'AI Tools', description: 'Icon for Socratic study tutor and quiz flashcard tools.', aliases: ['Study', 'Tutor'] },
  { id: 'Code', label: 'Code Execution Sandbox', category: 'Developer', description: 'Icon for developer code blocks, terminal, and IDE view.', aliases: ['Dev', 'Script'] },
  { id: 'Terminal', label: 'Terminal / Output Window', category: 'Developer', description: 'Icon for running code execution output and logs.', aliases: ['Console', 'Cli'] },
  { id: 'Image', label: 'Image Creation Studio', category: 'Media & Inputs', description: 'Icon for generating and editing images in Create Studio.', aliases: ['ImageIcon', 'Photo', 'Art'] },
  { id: 'Download', label: 'Download & Export Chat', category: 'Action', description: 'Icon for downloading chat sessions as PDF, Word, or Markdown.', aliases: ['Save', 'ExportDoc'] },
  { id: 'Zap', label: 'Think Mode & Deep Reasoning', category: 'AI Tools', description: 'Icon for fast inference and chain-of-thought think mode.', aliases: ['Fast', 'Reasoning'] },
  { id: 'Copy', label: 'Copy Code / Text', category: 'Action', description: 'Icon for copying response text or code snippets to clipboard.', aliases: ['Clipboard'] },
  { id: 'Check', label: 'Success / Completed Action', category: 'Action', description: 'Icon indicating successful copy, save, or completed task.', aliases: ['Done', 'Success'] },
  { id: 'Edit2', label: 'Edit & Rename Title', category: 'Action', description: 'Icon for editing message text, model names, or renaming sessions.', aliases: ['Rename', 'Pencil'] },
  { id: 'Menu', label: 'Toggle Sidebar Drawer', category: 'Navigation', description: 'Icon for toggling sidebar drawer on mobile and desktop views.', aliases: ['Hamburger', 'Sidebar'] },
  { id: 'Briefcase', label: 'Workspace & Work Projects', category: 'Navigation', description: 'Icon for work folders and professional project workspaces.', aliases: ['Work', 'Jobs'] },
  { id: 'Book', label: 'Documentation & Knowledge', category: 'Navigation', description: 'Icon for knowledge base files, documentation, and guides.', aliases: ['Read', 'Docs'] },
  { id: 'Shield', label: 'Safety & Incognito Mode', category: 'Identity', description: 'Icon for incognito safe mode and security auditing.', aliases: ['Incognito', 'Security'] },
  { id: 'Rocket', label: 'Connect Hub & Integrations', category: 'Navigation', description: 'Icon for integrations hub, APIs, and app shortcuts.', aliases: ['Launch', 'Hub'] }
];

export const PRESET_ICON_PACKS: IconPack[] = [
  {
    id: 'lucide-default',
    name: 'Modern Minimalist',
    description: 'Crisp vector icons with balanced geometric proportions and adaptive theme coloring.',
    badge: 'Default',
    author: 'Lucide Core',
    style: 'lucide',
    recommendedThemeId: 'default',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '🤖' },
      { iconId: 'Sparkles', emoji: '✨' },
      { iconId: 'Send', emoji: '🚀' },
      { iconId: 'HardDrive', emoji: '📂' },
      { iconId: 'Settings', emoji: '⚙️' }
    ]
  },
  {
    id: '3d-glass',
    name: '3D Glassmorphism & Clay',
    description: 'Glossy volumetric icons with soft ambient depth, bevel highlights, and 3D shadow.',
    badge: 'Volumetric',
    author: 'Nexus 3D Labs',
    style: '3d-glass',
    recommendedThemeId: 'oled_dark',
    cssFilter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45)) contrast(115%) brightness(110%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '🔮' },
      { iconId: 'Sparkles', emoji: '💎' },
      { iconId: 'Send', emoji: '🚀' },
      { iconId: 'HardDrive', emoji: '📦' },
      { iconId: 'Settings', emoji: '⚙️' }
    ]
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon Glow',
    description: 'Electric cyan and magenta glowing neon outlines with dual-frequency aura radiance.',
    badge: 'Sci-Fi',
    author: 'Night City',
    style: 'cyberpunk-neon',
    recommendedThemeId: 'cyberpunk',
    cssFilter: 'drop-shadow(0 0 5px #00f0ff) drop-shadow(0 0 10px #ff007f) saturate(200%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '⚡' },
      { iconId: 'Sparkles', emoji: '🌌' },
      { iconId: 'Send', emoji: '🛸' },
      { iconId: 'HardDrive', emoji: '💾' },
      { iconId: 'Settings', emoji: '🧬' }
    ]
  },
  {
    id: 'pixel-retro',
    name: '8-Bit Pixel Arcade',
    description: 'Nostalgic arcade pixel-art icons bringing authentic 80s retro gaming aesthetics.',
    badge: 'Retro',
    author: 'BitCraft 80s',
    style: 'pixel-retro',
    recommendedThemeId: 'default',
    cssFilter: 'contrast(160%) saturate(180%) brightness(115%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '👾' },
      { iconId: 'Sparkles', emoji: '⭐' },
      { iconId: 'Send', emoji: '🎯' },
      { iconId: 'HardDrive', emoji: '📼' },
      { iconId: 'Settings', emoji: '🕹️' }
    ]
  },
  {
    id: 'gold-luxe',
    name: 'Gold Luxe Obsidian',
    description: 'Brushed metallic 24K gold icons crafted for premium dark luxury interfaces.',
    badge: 'Luxury',
    author: 'Aureus Design',
    style: 'gold-luxe',
    recommendedThemeId: 'solar_amber',
    cssFilter: 'sepia(100%) hue-rotate(5deg) saturate(320%) contrast(125%) brightness(115%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '👑' },
      { iconId: 'Sparkles', emoji: '✨' },
      { iconId: 'Send', emoji: '🏆' },
      { iconId: 'HardDrive', emoji: '💎' },
      { iconId: 'Settings', emoji: '🪙' }
    ]
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix Phosphor',
    description: 'High-tech terminal phosphor green CRT glow for cyberpunk and developer aesthetics.',
    badge: 'Hacker',
    author: 'Cyberdeck 99',
    style: 'emerald-matrix',
    recommendedThemeId: 'emerald_matrix',
    cssFilter: 'drop-shadow(0 0 6px #00ff66) contrast(140%) saturate(250%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '🟢' },
      { iconId: 'Sparkles', emoji: '❇️' },
      { iconId: 'Send', emoji: '📟' },
      { iconId: 'HardDrive', emoji: '💾' },
      { iconId: 'Settings', emoji: '⚙️' }
    ]
  },
  {
    id: 'synthwave-80s',
    name: 'Midnight Synthwave',
    description: 'Ultraviolet & outrun neon magenta glow with nostalgic sunset gradient sheen.',
    badge: 'Outrun',
    author: 'Kavinsky Wave',
    style: 'synthwave-80s',
    recommendedThemeId: 'synthwave',
    cssFilter: 'drop-shadow(0 0 6px #d946ef) drop-shadow(0 0 12px #8b5cf6) saturate(190%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '🌆' },
      { iconId: 'Sparkles', emoji: '💜' },
      { iconId: 'Send', emoji: '🚀' },
      { iconId: 'HardDrive', emoji: '📼' },
      { iconId: 'Settings', emoji: '🔮' }
    ]
  },
  {
    id: 'pastel-duotone',
    name: 'Pastel Duotone',
    description: 'Friendly rounded duotone icons with soft complementary lavender and mint accents.',
    badge: 'Soft',
    author: 'Nordic Studio',
    style: 'pastel-duotone',
    recommendedThemeId: 'white',
    cssFilter: 'contrast(105%) brightness(108%) saturate(120%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '🌸' },
      { iconId: 'Sparkles', emoji: '✨' },
      { iconId: 'Send', emoji: '🌿' },
      { iconId: 'HardDrive', emoji: '📁' },
      { iconId: 'Settings', emoji: '🫧' }
    ]
  },
  {
    id: 'monochrome-slate',
    name: 'Bauhaus Monochrome',
    description: 'Stark high-contrast minimalist architectural icons with clean black & white lines.',
    badge: 'Brutalist',
    author: 'Bauhaus Core',
    style: 'monochrome-slate',
    recommendedThemeId: 'monochrome_slate',
    cssFilter: 'grayscale(100%) contrast(150%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '◼️' },
      { iconId: 'Sparkles', emoji: '◻️' },
      { iconId: 'Send', emoji: '▲' },
      { iconId: 'HardDrive', emoji: '📁' },
      { iconId: 'Settings', emoji: '⚙️' }
    ]
  },
  {
    id: 'custom-user',
    name: 'Custom Image Pack',
    description: 'Fully personalized pack where every icon in the app can be replaced with custom uploads or image URLs.',
    badge: 'Custom',
    author: 'You',
    style: 'custom',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '🎨' },
      { iconId: 'Sparkles', emoji: '📸' },
      { iconId: 'Send', emoji: '🖼️' },
      { iconId: 'HardDrive', emoji: '💾' },
      { iconId: 'Settings', emoji: '🛠️' }
    ]
  }
];

export const getIconPackState = (): IconPackState => {
  try {
    const packId = localStorage.getItem(ICON_PACK_KEY) || 'lucide-default';
    const overridesRaw = localStorage.getItem(CUSTOM_OVERRIDES_KEY);
    const customOverrides = overridesRaw ? JSON.parse(overridesRaw) : {};
    return { activePackId: packId, customOverrides };
  } catch {
    return { activePackId: 'lucide-default', customOverrides: {} };
  }
};

export const saveIconPackState = (state: IconPackState) => {
  try {
    localStorage.setItem(ICON_PACK_KEY, state.activePackId);
    localStorage.setItem(CUSTOM_OVERRIDES_KEY, JSON.stringify(state.customOverrides));
    window.dispatchEvent(new Event('iconpack-updated'));
  } catch (e) {
    console.error('Failed to save icon pack state:', e);
  }
};

export const setIconOverride = (iconId: string, customUrl: string) => {
  const current = getIconPackState();
  const updatedOverrides = { ...current.customOverrides, [iconId]: customUrl };
  saveIconPackState({ ...current, customOverrides: updatedOverrides });
};

export const removeIconOverride = (iconId: string) => {
  const current = getIconPackState();
  const updatedOverrides = { ...current.customOverrides };
  delete updatedOverrides[iconId];
  saveIconPackState({ ...current, customOverrides: updatedOverrides });
};

export const resetAllIconOverrides = () => {
  saveIconPackState({ activePackId: 'lucide-default', customOverrides: {} });
};

export const exportIconPackAsJson = () => {
  const state = getIconPackState();
  const exportPayload = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    activePackId: state.activePackId,
    customOverrides: state.customOverrides
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `nexus_icon_pack_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const importIconPackFromJson = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === 'object') {
      const activePackId = parsed.activePackId || 'custom-user';
      const customOverrides = parsed.customOverrides || parsed.overrides || {};
      saveIconPackState({ activePackId, customOverrides });
      return true;
    }
  } catch (e) {
    console.error("Failed to import icon pack JSON:", e);
  }
  return false;
};
