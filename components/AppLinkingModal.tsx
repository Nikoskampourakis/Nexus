import React, { useState } from 'react';
import { 
  Sparkles, 
  HardDrive, 
  Shield, 
  Activity, 
  Globe, 
  BrainCircuit, 
  GraduationCap, 
  Users, 
  Camera, 
  Archive, 
  Settings as SettingsIcon,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';

export interface LinkableAppItem {
  id: string;
  mention: string; // e.g. '@Create'
  aliases: string[];
  name: string;
  category: 'Studio' | 'Cloud' | 'Security' | 'Analytics' | 'Intelligence' | 'Learning' | 'System';
  description: string;
  badge: string;
  accentColor: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const LINKABLE_APPS: LinkableAppItem[] = [
  {
    id: 'create',
    mention: '@Create',
    aliases: ['@studio', '@image', '@art', '@create-studio'],
    name: 'Create Studio',
    category: 'Studio',
    description: 'AI Image Synthesis, 3D Perspective Shift, Area Select & Link, Object Removal & Power Options',
    badge: 'Image & 3D',
    accentColor: '#a855f7',
    bgGradient: 'from-purple-950/70 to-purple-900/30',
    borderColor: 'border-purple-500/40',
    textColor: 'text-purple-300',
    icon: Sparkles
  },
  {
    id: 'drive',
    mention: '@Drive',
    aliases: ['@googledrive', '@docs', '@sheets', '@gdrive'],
    name: 'Google Drive',
    category: 'Cloud',
    description: 'Connect Google Workspace, import Docs, Sheets, Slides, and cloud documents directly into prompts',
    badge: 'Workspace',
    accentColor: '#3b82f6',
    bgGradient: 'from-blue-950/70 to-blue-900/30',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-300',
    icon: HardDrive
  },
  {
    id: 'permissions',
    mention: '@Permissions',
    aliases: ['@privacy', '@access', '@perms', '@security'],
    name: 'Permissions Center',
    category: 'Security',
    description: 'Hardware and browser permission toggles: Camera, Microphone, Geolocation, Storage & Network controls',
    badge: 'Privacy & Access',
    accentColor: '#10b981',
    bgGradient: 'from-emerald-950/70 to-emerald-900/30',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-300',
    icon: Shield
  },
  {
    id: 'stats',
    mention: '@Stats',
    aliases: ['@statistics', '@usage', '@tokens', '@analytics'],
    name: 'Usage & Statistics',
    category: 'Analytics',
    description: 'Real-time token analytics, daily usage history graphs, hourly activity chart & lifetime tracking',
    badge: 'Real-time Data',
    accentColor: '#06b6d4',
    bgGradient: 'from-cyan-950/70 to-cyan-900/30',
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-300',
    icon: Activity
  },
  {
    id: 'research',
    mention: '@Research',
    aliases: ['@web', '@search', '@google', '@websearch'],
    name: 'Deep Web Research',
    category: 'Intelligence',
    description: 'Live Google Search grounding, multi-source citations, and adversarial fact-verification audit',
    badge: 'Live Grounding',
    accentColor: '#38bdf8',
    bgGradient: 'from-sky-950/70 to-sky-900/30',
    borderColor: 'border-sky-500/40',
    textColor: 'text-sky-300',
    icon: Globe
  },
  {
    id: 'think',
    mention: '@Think',
    aliases: ['@deepthink', '@reasoning', '@thought'],
    name: 'Deep Think Engine',
    category: 'Intelligence',
    description: 'Multi-step deliberate chain-of-thought analysis with full thinking duration and transparency logs',
    badge: 'Reasoning',
    accentColor: '#8b5cf6',
    bgGradient: 'from-violet-950/70 to-violet-900/30',
    borderColor: 'border-violet-500/40',
    textColor: 'text-violet-300',
    icon: BrainCircuit
  },
  {
    id: 'study',
    mention: '@Study',
    aliases: ['@quiz', '@flashcards', '@learn', '@socratic'],
    name: 'Study & Socratic Tools',
    category: 'Learning',
    description: 'Interactive quizzes, concept visual cards, LaTeX math solving, and Socratic dialogue tutor',
    badge: 'Education',
    accentColor: '#10b981',
    bgGradient: 'from-teal-950/70 to-teal-900/30',
    borderColor: 'border-teal-500/40',
    textColor: 'text-teal-300',
    icon: GraduationCap
  },
  {
    id: 'council',
    mention: '@Council',
    aliases: ['@debate', '@deliberation', '@chamber'],
    name: 'Council Chamber',
    category: 'Intelligence',
    description: 'Multi-agent panel debate: Skeptic, Synthesizer, Domain Specialist, and Consensus Arbiter',
    badge: 'Multi-Agent',
    accentColor: '#f59e0b',
    bgGradient: 'from-amber-950/70 to-amber-900/30',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-300',
    icon: Users
  },
  {
    id: 'camera',
    mention: '@Camera',
    aliases: ['@photo', '@webcam', '@snapshot'],
    name: 'Live Camera Capture',
    category: 'Studio',
    description: 'Instant webcam photo capture and attached visual scene understanding',
    badge: 'Vision',
    accentColor: '#ec4899',
    bgGradient: 'from-pink-950/70 to-pink-900/30',
    borderColor: 'border-pink-500/40',
    textColor: 'text-pink-300',
    icon: Camera
  },
  {
    id: 'archive',
    mention: '@Archive',
    aliases: ['@zip', '@tar', '@files', '@pack'],
    name: 'Archive Explorer',
    category: 'System',
    description: 'Unpack and inspect ZIP / TAR files, view source trees, and package conversation outputs',
    badge: 'Developer',
    accentColor: '#eab308',
    bgGradient: 'from-yellow-950/70 to-yellow-900/30',
    borderColor: 'border-yellow-500/40',
    textColor: 'text-yellow-300',
    icon: Archive
  },
  {
    id: 'settings',
    mention: '@Settings',
    aliases: ['@config', '@options', '@preferences'],
    name: 'System Settings',
    category: 'System',
    description: 'System parameters, custom themes, custom icon packs, and keyboard shortcuts',
    badge: 'Config',
    accentColor: '#64748b',
    bgGradient: 'from-slate-900/80 to-slate-800/40',
    borderColor: 'border-slate-600/40',
    textColor: 'text-slate-300',
    icon: SettingsIcon
  }
];

export interface AppActionHandlers {
  onOpenCreate?: () => void;
  onOpenDrive?: () => void;
  onOpenPermissions?: () => void;
  onOpenStats?: () => void;
  onToggleResearch?: () => void;
  onToggleThink?: () => void;
  onToggleStudy?: () => void;
  onToggleCouncil?: () => void;
  onOpenCamera?: () => void;
  onOpenArchive?: () => void;
  onOpenSettings?: () => void;
}

export const executeAppAction = (appId: string, handlers: AppActionHandlers) => {
  switch (appId) {
    case 'create':
      handlers.onOpenCreate?.();
      break;
    case 'drive':
      handlers.onOpenDrive?.();
      break;
    case 'permissions':
      handlers.onOpenPermissions?.();
      break;
    case 'stats':
      handlers.onOpenStats?.();
      break;
    case 'research':
      handlers.onToggleResearch?.();
      break;
    case 'think':
      handlers.onToggleThink?.();
      break;
    case 'study':
      handlers.onToggleStudy?.();
      break;
    case 'council':
      handlers.onToggleCouncil?.();
      break;
    case 'camera':
      handlers.onOpenCamera?.();
      break;
    case 'archive':
      handlers.onOpenArchive?.();
      break;
    case 'settings':
      handlers.onOpenSettings?.();
      break;
    default:
      break;
  }
};

interface AppLinkingMenuProps {
  filterQuery: string;
  onSelectApp: (app: LinkableAppItem, mode: 'mention' | 'launch') => void;
  onClose: () => void;
}

export const AppLinkingMenu: React.FC<AppLinkingMenuProps> = ({
  filterQuery,
  onSelectApp,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const cleanQuery = filterQuery.replace(/^@/, '').toLowerCase().trim();

  const filteredApps = LINKABLE_APPS.filter(app => {
    const matchesCategory = selectedCategory === 'all' || app.category.toLowerCase() === selectedCategory.toLowerCase();
    if (!cleanQuery) return matchesCategory;

    const matchesQuery = 
      app.mention.toLowerCase().includes(cleanQuery) ||
      app.name.toLowerCase().includes(cleanQuery) ||
      app.description.toLowerCase().includes(cleanQuery) ||
      app.aliases.some(a => a.toLowerCase().includes(cleanQuery));

    return matchesCategory && matchesQuery;
  });

  const categories = ['all', 'Studio', 'Cloud', 'Security', 'Analytics', 'Intelligence', 'Learning', 'System'];

  return (
    <div className="bg-[#14141e]/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 text-xs">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs">
            @
          </div>
          <div>
            <span className="font-semibold text-neutral-200">Link an App</span>
            <span className="text-[10px] text-neutral-400 ml-2 hidden sm:inline">Type @ to link apps & tools into prompts</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="px-3 py-1.5 border-b border-white/5 flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
              selectedCategory === cat 
                ? 'bg-cyan-500 text-black font-bold' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* App List */}
      <div className="max-h-72 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filteredApps.length === 0 ? (
          <div className="p-4 text-center text-neutral-400 text-xs">
            No matching app found for <span className="text-cyan-400 font-mono">@{cleanQuery}</span>
          </div>
        ) : (
          filteredApps.map(app => {
            const Icon = app.icon;
            return (
              <div
                key={app.id}
                className="group p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.07] border border-transparent hover:border-white/10 transition-all flex items-center justify-between gap-3"
              >
                <div 
                  className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer"
                  onClick={() => onSelectApp(app, 'mention')}
                >
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${app.bgGradient} border ${app.borderColor} flex items-center justify-center flex-shrink-0 ${app.textColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-cyan-400 group-hover:text-cyan-300 text-xs">
                        {app.mention}
                      </span>
                      <span className="text-[10px] text-neutral-300 font-semibold truncate">
                        {app.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-neutral-400 hidden sm:inline">
                        {app.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {app.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectApp(app, 'mention')}
                    className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold transition-colors"
                    title="Insert @mention into message"
                  >
                    + Link
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectApp(app, 'launch')}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 text-[10px] font-medium transition-colors flex items-center space-x-1"
                    title="Directly launch this app tool"
                  >
                    <span>Launch</span>
                    <ChevronRight className="w-3 h-3 text-neutral-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Tip */}
      <div className="px-3 py-1.5 bg-black/40 border-t border-white/5 text-[10px] text-neutral-400 flex items-center justify-between">
        <span>Click <strong className="text-cyan-300">+ Link</strong> to append tag, or <strong className="text-white">Launch</strong> to open immediately</span>
        <span className="text-neutral-500 font-mono">ESC to dismiss</span>
      </div>
    </div>
  );
};

interface LinkedAppPillProps {
  mention: string;
  onRemove?: () => void;
  onClick?: () => void;
}

export const LinkedAppPill: React.FC<LinkedAppPillProps> = ({
  mention,
  onRemove,
  onClick
}) => {
  const clean = mention.toLowerCase();
  const app = LINKABLE_APPS.find(a => 
    a.mention.toLowerCase() === clean || a.aliases.some(alias => alias.toLowerCase() === clean)
  ) || LINKABLE_APPS[0];

  const Icon = app.icon;

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${app.bgGradient} border ${app.borderColor} ${app.textColor} shadow-sm backdrop-blur-md cursor-pointer hover:brightness-125 transition-all select-none`}
      onClick={onClick}
      title={`Linked: ${app.name} (${app.description})`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{app.mention}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:text-white ml-0.5 p-0.5 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

/**
 * Parses user text or markdown text to render interactive @App chips
 */
export const renderTextWithAppLinks = (
  text: string, 
  onAppLinkClick: (mention: string) => void
): React.ReactNode => {
  if (!text || !text.includes('@')) return text;

  // Regex pattern matching @AppName
  const regex = /(@(?:Create|Drive|GoogleDrive|Permissions|Privacy|Stats|Statistics|Usage|Research|Web|Think|Study|Quiz|Council|Debate|Camera|Archive|Settings|Studio))\b/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const matchedMention = match[0];
    const cleanLower = matchedMention.toLowerCase();
    const app = LINKABLE_APPS.find(a => 
      a.mention.toLowerCase() === cleanLower || a.aliases.some(alias => alias.toLowerCase() === cleanLower)
    );

    if (app) {
      const Icon = app.icon;
      parts.push(
        <button
          key={`app-link-${match.index}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAppLinkClick(matchedMention);
          }}
          className={`inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md text-xs font-mono font-bold border transition-all hover:scale-105 active:scale-95 shadow-sm align-baseline ${app.borderColor} ${app.textColor} bg-white/10 hover:bg-white/20`}
          title={`Click to open ${app.name}`}
        >
          <Icon className="w-3 h-3" />
          <span>{matchedMention}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </button>
      );
    } else {
      parts.push(matchedMention);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};
