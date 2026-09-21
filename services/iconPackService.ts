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
    description: 'Crisp vector icons with balanced proportions and theme-adaptive coloring.',
    badge: 'Default',
    author: 'Lucide Core',
    style: 'lucide',
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
    name: '3D Glassmorphism',
    description: 'Glossy volumetric icons with soft ambient depth, drop shadows, and subtle gradient sheen.',
    badge: 'Popular',
    author: '3D Studio',
    style: '3d-glass',
    cssFilter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4)) contrast(110%) brightness(115%)',
    overrides: {
      Bot: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      Sparkles: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=100&auto=format&fit=crop&q=80',
      Send: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=100&auto=format&fit=crop&q=80',
      HardDrive: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'
    },
    previewIcons: [
      { iconId: 'Bot', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80' },
      { iconId: 'Sparkles', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=100&auto=format&fit=crop&q=80' },
      { iconId: 'Send', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=100&auto=format&fit=crop&q=80' },
      { iconId: 'HardDrive', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon Glow',
    description: 'Electric cyan and magenta glowing icons with high-frequency aura filters.',
    badge: 'Sci-Fi',
    author: 'Neon City',
    style: 'cyberpunk-neon',
    cssFilter: 'drop-shadow(0 0 6px #06b6d4) drop-shadow(0 0 12px #ec4899) saturate(180%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '⚡' },
      { iconId: 'Sparkles', emoji: '🌌' },
      { iconId: 'Send', emoji: '🛸' },
      { iconId: 'HardDrive', emoji: '💾' }
    ]
  },
  {
    id: 'pixel-retro',
    name: '8-Bit Pixel Arcade',
    description: 'Nostalgic arcade pixel-art icons bringing 80s retro gaming aesthetics.',
    badge: 'Retro',
    author: 'BitCraft',
    style: 'pixel-retro',
    cssFilter: 'saturate(200%) contrast(150%) brightness(120%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '👾' },
      { iconId: 'Sparkles', emoji: '⭐' },
      { iconId: 'Send', emoji: '🎯' },
      { iconId: 'HardDrive', emoji: '📼' }
    ]
  },
  {
    id: 'gold-luxe',
    name: 'Gold Luxe Obsidian',
    description: 'Brushed metallic gold icons crafted for premium dark luxury interfaces.',
    badge: 'Luxury',
    author: 'Aureus Design',
    style: 'gold-luxe',
    cssFilter: 'sepia(100%) hue-rotate(10deg) saturate(300%) contrast(120%) brightness(110%)',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '👑' },
      { iconId: 'Sparkles', emoji: '✨' },
      { iconId: 'Send', emoji: '🏆' },
      { iconId: 'HardDrive', emoji: '💎' }
    ]
  },
  {
    id: 'custom-user',
    name: 'Custom Image Pack',
    description: 'Fully personalized pack where every icon in the app is replaced with custom uploaded images or URLs.',
    badge: 'Custom',
    author: 'You',
    style: 'custom',
    overrides: {},
    previewIcons: [
      { iconId: 'Bot', emoji: '🎨' },
      { iconId: 'Sparkles', emoji: '📸' },
      { iconId: 'Send', emoji: '🖼️' }
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
