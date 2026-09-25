import { HarmBlockThreshold, HarmCategory } from "@google/genai";

export interface WebSourceItem {
  uri: string;
  title: string;
  domain?: string;
  iconUrl?: string;
  snippet?: string;
}

export interface GroundingMetadataInfo {
  searchQueries?: string[];
  webSources?: WebSourceItem[];
  groundingChunks?: any[];
  searchEntryPoint?: any;
}

export interface AgentActionItem {
  id: string;
  type: 'search' | 'image' | 'code' | 'analysis' | 'verification' | 'workspace_tool';
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  detail?: string;
  timestamp?: number;
  toolData?: {
    toolName: string;
    args?: any;
    result?: any;
  };
}

export type WorkspaceAppName = 'gmail' | 'drive' | 'sheets' | 'docs' | 'calendar' | 'tasks';

export interface WorkspaceToolsConfig {
  enabledApps: Record<WorkspaceAppName, boolean>;
}

export interface CodeExecutionOutput {
  id: string;
  language: string;
  code: string;
  output?: string;
  hasMistake?: boolean;
  mistakeNote?: string;
  fixSuggestion?: string;
  previewType?: 'html' | 'canvas' | 'terminal' | 'react' | 'svg';
  executionTimeMs?: number;
}

export interface CouncilPerspective {
  agentName: string;
  role: string;
  avatar: string;
  color: string;
  initialStance: string;
  critique: string;
  revisedStance: string;
}

export interface CouncilDebateData {
  topic: string;
  rounds: number;
  perspectives: CouncilPerspective[];
  consensusReached: boolean;
  consensusSummary: string;
  finalAgreement: string;
}

export type FormattingActionType = 'shorten' | 'longer' | 'simplify' | 'bullets' | 'professional' | 'summarize';

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  isError?: boolean;
  isEdited?: boolean;
  
  // Real-time Search Grounding
  groundingMetadata?: GroundingMetadataInfo;

  // Thinking Process & Reasoning
  thought?: string;
  thinkingDurationMs?: number;
  thinkingSummary?: string;
  
  // Real-time Agent Actions Timeline
  actions?: AgentActionItem[];

  // Multi-Agent Council Mode Deliberation
  councilDebate?: CouncilDebateData;

  // Code Executions & Mistake Inspector
  codeOutputs?: Record<string, CodeExecutionOutput>;

  // Versioning support
  versions?: string[]; // Array of content strings for this specific message node
  currentVersionIndex?: number; // Which version is currently displayed
  
  // Multimodal support
  attachment?: {
    mimeType: string;
    data: string; // base64
  };

  // Generated image support directly in chat
  generatedImage?: {
    url: string;
    prompt: string;
    style?: string;
    aspectRatio?: string;
  };
  isImageGeneration?: boolean;
  tokenCount?: number;
  estimatedCost?: number;

  // In-chat Archive attachment support (.zip, .tar)
  archiveAttachment?: {
    name: string;
    totalFiles: number;
    totalSize: number;
    format: 'zip' | 'tar';
    files: Array<{
      name: string;
      size: number;
      isText: boolean;
      textPreview?: string;
    }>;
  };
}

export interface VirtualModel {
  id: string;
  name: string;
  description: string;
  baseModel: string; // e.g., 'gemini-2.5-flash', 'gemini-3-pro-preview'
  systemInstruction: string;
  knowledgeBase: string; // User provided text to be prepended/injected
  safetySettings: {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }[];
}

export interface ChatFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: number;
  isCollapsed?: boolean;
}

export interface ChatSession {
  id: string;
  modelId: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  isIncognito?: boolean;
  forkedFromSessionId?: string;
  folderId?: string;
  aiSummary?: string;
  expiresAt?: number; // Timestamp when the chat should be deleted/archived
}

export interface AppTheme {
  id: string;
  name: string;
  colors: {
    background: string; // Main app background
    sidebar: string;    // Sidebar background
    card: string;       // Message bubbles (model), panels
    textPrimary: string;
    textSecondary: string;
    accent: string;     // Buttons, user bubbles, highlights (can be gradient)
    border: string;
  };
  isGradientAccent: boolean; // If true, accent is treated as a background-image gradient
}

export interface IconPack {
  id: string;
  name: string;
  description: string;
  badge?: string;
  author?: string;
  recommendedThemeId?: string;
  style: 'lucide' | '3d-glass' | 'cyberpunk-neon' | 'pixel-retro' | 'gold-luxe' | 'doodle-hand' | 'custom' | 'emerald-matrix' | 'synthwave-80s' | 'pastel-duotone' | 'monochrome-slate';
  overrides: Record<string, string>;
  cssFilter?: string;
  previewIcons: Array<{ iconId: string; url?: string; emoji?: string }>;
}

export type StarterWidgetId = 
  | 'daily_theme'
  | 'shortcuts'
  | 'prompts'
  | 'daily_briefing'
  | 'scratchpad'
  | 'ai_roster'
  | 'recent_chats'
  | 'metrics'
  | 'inspiration';

export interface StarterWidgetItem {
  id: StarterWidgetId;
  title: string;
  description: string;
  enabled: boolean;
  order: number;
  colSpan?: 1 | 2;
}

export interface StarterDashboardConfig {
  gridColumns: 1 | 2 | 3 | 4;
  widgets: StarterWidgetItem[];
  showHeroBanner: boolean;
  autoDailyTheme: boolean;
}

export interface KeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export interface ShortcutItem {
  id: string;
  label: string;
  keys: KeyConfig;
}

export type ViewMode = 'chat' | 'builder' | 'settings' | 'create' | 'personalization' | 'connect';

export type PersonaTone = 
  | 'default'
  | 'professional' 
  | 'friendly' 
  | 'honest' 
  | 'irregular' 
  | 'effective' 
  | 'cynical';

export type CharacteristicLevel = 'less' | 'balanced' | 'more';

export interface PersonaCharacteristics {
  warmth: CharacteristicLevel;
  enthusiasm: CharacteristicLevel;
  headersAndLists: CharacteristicLevel;
  emoji: CharacteristicLevel;
}

export interface CustomPromptItem {
  id: string;
  title: string;
  category?: string;
  description: string;
  prompt: string;
}

export interface PersonalizationConfig {
  tone: PersonaTone;
  characteristics: PersonaCharacteristics;
  customInstructions: {
    enabled: boolean;
    aboutUser: string;
    responseStyle: string;
  };
  customPrompts?: CustomPromptItem[];
}

export interface GeneratedImageItem {
  id: string;
  url: string; // base64 data url
  prompt: string;
  style?: string;
  aspectRatio: string;
  createdAt: number;
  originalUrl?: string; // For before/after comparisons
  editType?: 'initial' | 'edit_message' | 'remove_object' | 'move_object' | 'perspective_shift' | 'area_select_edit' | 'extend_image' | 'imagine_scene';
  editNote?: string;
}
