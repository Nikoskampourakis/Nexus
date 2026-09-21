import { ChatSession, VirtualModel, ShortcutItem, ChatFolder, GeneratedImageItem } from '../types';
import { DEFAULT_MODELS, DEFAULT_SHORTCUTS } from '../constants';
import { normalizeModelName } from './geminiService';
import { storeImage, getImage, deleteImage, storeSessionMessages, getSessionMessages, deleteSessionMessages } from './indexedDbService';

const SESSIONS_KEY = 'nexus_chat_history';
const MODELS_KEY = 'nexus_custom_models';
const SETTINGS_KEY = 'nexus_user_settings';
const SHORTCUTS_KEY = 'nexus_shortcuts';
const FOLDERS_KEY = 'nexus_chat_folders';
const CREATIONS_METADATA_KEY = 'nexus_image_metadata';

export interface UserSettings {
  displayName: string;
  defaultVoice: string;
  speechRate?: number;
  expressivityLevel?: number;
  pitch?: number;
  voiceVolume?: number;
  autoInterruptThreshold?: number;
  // Advanced Server & Generation Settings
  defaultTemperature?: number;
  defaultTopP?: number;
  maxOutputTokens?: number;
  searchGroundingEnabled?: boolean;
  streamResponseChunks?: boolean;
  safetyFilterLevel?: 'default' | 'lenient' | 'strict';
}

export const getStoredFolders = (): ChatFolder[] => {
  try {
    const stored = localStorage.getItem(FOLDERS_KEY);
    if (!stored) {
      // Default starter folders
      return [
        { id: 'folder_projects', name: 'Projects & Coding', color: '#6366f1', createdAt: Date.now() - 86400000 },
        { id: 'folder_research', name: 'Deep Research', color: '#06b6d4', createdAt: Date.now() - 172800000 }
      ];
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load folders", e);
    return [];
  }
};

export const saveStoredFolders = (folders: ChatFolder[]) => {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error("Failed to save folders", e);
  }
};

export const createStoredFolder = (name: string, color?: string, icon?: string): ChatFolder[] => {
  const current = getStoredFolders();
  const newFolder: ChatFolder = {
    id: `folder_${Date.now()}`,
    name: name.trim() || 'New Folder',
    color: color || '#6366f1',
    icon: icon || '📁',
    createdAt: Date.now()
  };
  const updated = [newFolder, ...current];
  saveStoredFolders(updated);
  return updated;
};

const persistSessionsMetadata = (sessions: ChatSession[]) => {
  try {
    const shallowSessions = sessions.map(s => ({
      ...s,
      messages: [] // Strip heavy message arrays for localStorage quota safety
    }));
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(shallowSessions));
  } catch (e) {
    console.error("Critical: Failed to save session metadata to localStorage", e);
  }
};

export const deleteStoredFolder = async (folderId: string): Promise<{ folders: ChatFolder[]; sessions: ChatSession[] }> => {
  const folders = getStoredFolders().filter(f => f.id !== folderId);
  saveStoredFolders(folders);

  // Clear folderId from sessions in this folder
  const sessions = getStoredSessions().map(s => {
    if (s.folderId === folderId) {
      const updatedSession = { ...s };
      delete updatedSession.folderId;
      return updatedSession;
    }
    return s;
  });
  
  persistSessionsMetadata(sessions);

  return { folders, sessions };
};

export const updateStoredFolder = (folderId: string, updates: Partial<ChatFolder>): ChatFolder[] => {
  const folders = getStoredFolders().map(f => f.id === folderId ? { ...f, ...updates } : f);
  saveStoredFolders(folders);
  return folders;
};

export const moveSessionToFolder = (sessionId: string, folderId: string | null): ChatSession[] => {
  const sessions = getStoredSessions();
  const target = sessions.find(s => s.id === sessionId);
  if (target) {
    if (folderId) {
      target.folderId = folderId;
    } else {
      delete target.folderId;
    }
    target.updatedAt = Date.now();
    persistSessionsMetadata(sessions);
  }
  return sessions;
};

export const saveSessionAiSummary = (sessionId: string, summary: string): ChatSession[] => {
  const sessions = getStoredSessions();
  const target = sessions.find(s => s.id === sessionId);
  if (target) {
    target.aiSummary = summary;
    target.updatedAt = Date.now();
    persistSessionsMetadata(sessions);
  }
  return sessions;
};

export const getStoredSessions = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (!stored) return [];
    const parsed: ChatSession[] = JSON.parse(stored);
    // Deduplicate sessions with identical IDs
    const seen = new Set<string>();
    const unique: ChatSession[] = [];
    for (const s of parsed) {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        // Ensure messages is at least an empty array if stripped
        if (!s.messages) s.messages = [];
        unique.push(s);
      }
    }
    return unique;
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const getStoredMessages = async (sessionId: string): Promise<Message[]> => {
  return await getSessionMessages(sessionId);
};

export const saveStoredSession = async (session: ChatSession): Promise<ChatSession[]> => {
  if (!session || !session.id) return getStoredSessions();

  // If session is incognito, do not persist to history
  if (session.isIncognito) {
    return getStoredSessions();
  }

  // Save messages to IndexedDB (the bulk of the data)
  await storeSessionMessages(session.id, session.messages);

  const rawSessions = getStoredSessions();
  
  // Strict deduplication by ID
  const existingIdx = rawSessions.findIndex(s => s.id === session.id);
  let updatedSessions: ChatSession[];

  if (existingIdx >= 0) {
    updatedSessions = [...rawSessions];
    updatedSessions[existingIdx] = {
      ...rawSessions[existingIdx],
      ...session,
      updatedAt: Date.now()
    };
  } else {
    // Check for "Ghost" sessions (empty sessions created very recently) to prevent UI duplication
    const ghostIdx = rawSessions.findIndex(s => 
      s.messages.length === 0 && 
      (Date.now() - s.updatedAt) < 15000 &&
      s.modelId === session.modelId
    );

    if (ghostIdx >= 0 && session.messages.length > 0) {
      updatedSessions = [...rawSessions];
      updatedSessions[ghostIdx] = session;
    } else {
      updatedSessions = [session, ...rawSessions];
    }
  }

  // Final safety deduplication
  const uniqueSessionsMap = new Map<string, ChatSession>();
  updatedSessions.forEach(s => {
    if (s && s.id) {
      const existing = uniqueSessionsMap.get(s.id);
      if (!existing || s.updatedAt > existing.updatedAt) {
        uniqueSessionsMap.set(s.id, s);
      }
    }
  });

  const finalSessions = Array.from(uniqueSessionsMap.values())
    .sort((a, b) => b.updatedAt - a.updatedAt);
  
  persistSessionsMetadata(finalSessions);
  return finalSessions;
};

export const renameStoredSession = (sessionId: string, newTitle: string): ChatSession[] => {
  const sessions = getStoredSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.title = newTitle.trim() || 'Untitled Chat';
    session.updatedAt = Date.now();
    persistSessionsMetadata(sessions);
  }
  return sessions;
};

export const deleteStoredSession = async (sessionId: string): Promise<ChatSession[]> => {
  const sessions = getStoredSessions().filter(s => s.id !== sessionId);
  persistSessionsMetadata(sessions);
  await deleteSessionMessages(sessionId);
  return sessions;
};

export const getStoredModels = (): VirtualModel[] => {
    try {
        const stored = localStorage.getItem(MODELS_KEY);
        if (!stored) return DEFAULT_MODELS;
        const parsed: VirtualModel[] = JSON.parse(stored);
        let updated = false;
        const sanitized = parsed.map(m => {
            const normalized = normalizeModelName(m.baseModel);
            if (normalized !== m.baseModel) {
                updated = true;
                return { ...m, baseModel: normalized };
            }
            return m;
        });
        if (updated) {
            saveStoredModels(sanitized);
        }
        return sanitized.length > 0 ? sanitized : DEFAULT_MODELS;
    } catch (e) {
        return DEFAULT_MODELS;
    }
};

export const saveStoredModels = (models: VirtualModel[]) => {
    localStorage.setItem(MODELS_KEY, JSON.stringify(models));
};

export const getUserSettings = (): UserSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return {
      displayName: parsed.displayName || 'User',
      defaultVoice: parsed.defaultVoice || 'Kore',
      speechRate: typeof parsed.speechRate === 'number' ? parsed.speechRate : 1.0,
      expressivityLevel: typeof parsed.expressivityLevel === 'number' ? parsed.expressivityLevel : 80,
      pitch: typeof parsed.pitch === 'number' ? parsed.pitch : 0,
      voiceVolume: typeof parsed.voiceVolume === 'number' ? parsed.voiceVolume : 100,
      autoInterruptThreshold: typeof parsed.autoInterruptThreshold === 'number' ? parsed.autoInterruptThreshold : 50,
    };
  } catch {
    return {
      displayName: 'User',
      defaultVoice: 'Kore',
      speechRate: 1.0,
      expressivityLevel: 80,
      pitch: 0,
      voiceVolume: 100,
      autoInterruptThreshold: 50,
    };
  }
};

export const saveUserSettings = (settings: UserSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getShortcuts = (): ShortcutItem[] => {
  try {
    const stored = localStorage.getItem(SHORTCUTS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_SHORTCUTS;
  } catch {
    return DEFAULT_SHORTCUTS;
  }
};

export const saveShortcuts = (shortcuts: ShortcutItem[]) => {
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
};

const CREATIONS_KEY = 'nexus_image_creations'; // Deprecated for blobs
const CREATIONS_METADATA_KEY_CONST = 'nexus_image_metadata';

export const getStoredCreations = (): GeneratedImageItem[] => {
  try {
    const stored = localStorage.getItem(CREATIONS_METADATA_KEY_CONST);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveStoredCreation = async (item: GeneratedImageItem): Promise<GeneratedImageItem[]> => {
  const list = getStoredCreations();
  const existingIndex = list.findIndex(c => c.id === item.id);
  
  // Store the image blob in IndexedDB
  if (item.url && item.url.startsWith('data:')) {
    await storeImage(item.id, item.url);
  }

  // Store only metadata in localStorage
  const metadataOnly = { ...item, url: `indexeddb://${item.id}` };

  if (existingIndex >= 0) {
    list[existingIndex] = metadataOnly;
  } else {
    list.unshift(metadataOnly);
  }

  localStorage.setItem(CREATIONS_METADATA_KEY_CONST, JSON.stringify(list.slice(0, 100)));
  return list;
};

export const resolveImageUrl = async (metadataUrl: string): Promise<string> => {
  if (metadataUrl.startsWith('indexeddb://')) {
    const id = metadataUrl.replace('indexeddb://', '');
    const data = await getImage(id);
    return data || '';
  }
  return metadataUrl;
};

export const deleteStoredCreation = async (id: string): Promise<GeneratedImageItem[]> => {
  const list = getStoredCreations().filter(c => c.id !== id);
  localStorage.setItem(CREATIONS_METADATA_KEY_CONST, JSON.stringify(list));
  await deleteImage(id);
  return list;
};

const STATS_KEY = 'nexus_user_statistics';

export interface UserStatistics {
  timeSpentSeconds: number;
  totalMessagesUser: number;
  totalMessagesModel: number;
  totalPromptTokens: number;
  totalResponseTokens: number;
  totalImagesCreated: number;
  totalVoiceTranscripts: number;
  firstUsedDate: string;
  lastActiveDate: string;
  dailyUsageDates: string[]; // Set of YYYY-MM-DD
}

const DEFAULT_STATS: UserStatistics = {
  timeSpentSeconds: 0,
  totalMessagesUser: 0,
  totalMessagesModel: 0,
  totalPromptTokens: 0,
  totalResponseTokens: 0,
  totalImagesCreated: 0,
  totalVoiceTranscripts: 0,
  firstUsedDate: new Date().toISOString(),
  lastActiveDate: new Date().toISOString(),
  dailyUsageDates: [new Date().toISOString().slice(0, 10)]
};

export const getUserStatistics = (): UserStatistics => {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (!stored) return DEFAULT_STATS;
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return DEFAULT_STATS;
  }
};

export const saveUserStatistics = (stats: UserStatistics) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("Failed to persist user stats:", e);
  }
};

export const incrementTimeSpent = (seconds: number = 1): number => {
  const stats = getUserStatistics();
  stats.timeSpentSeconds = (stats.timeSpentSeconds || 0) + seconds;
  stats.lastActiveDate = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);
  if (!stats.dailyUsageDates) stats.dailyUsageDates = [];
  if (!stats.dailyUsageDates.includes(today)) {
    stats.dailyUsageDates.push(today);
  }
  saveUserStatistics(stats);
  return stats.timeSpentSeconds;
};

export const trackMessageSent = (role: 'user' | 'model', promptTok: number = 0, respTok: number = 0) => {
  const stats = getUserStatistics();
  if (role === 'user') {
    stats.totalMessagesUser = (stats.totalMessagesUser || 0) + 1;
  } else {
    stats.totalMessagesModel = (stats.totalMessagesModel || 0) + 1;
  }
  if (promptTok > 0) stats.totalPromptTokens = (stats.totalPromptTokens || 0) + promptTok;
  if (respTok > 0) stats.totalResponseTokens = (stats.totalResponseTokens || 0) + respTok;
  stats.lastActiveDate = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);
  if (!stats.dailyUsageDates) stats.dailyUsageDates = [];
  if (!stats.dailyUsageDates.includes(today)) {
    stats.dailyUsageDates.push(today);
  }
  saveUserStatistics(stats);
};

export const trackImageCreation = () => {
  const stats = getUserStatistics();
  stats.totalImagesCreated = (stats.totalImagesCreated || 0) + 1;
  stats.lastActiveDate = new Date().toISOString();
  saveUserStatistics(stats);
};

export const trackVoiceTranscript = () => {
  const stats = getUserStatistics();
  stats.totalVoiceTranscripts = (stats.totalVoiceTranscripts || 0) + 1;
  saveUserStatistics(stats);
};

export const resetUserStatistics = () => {
  localStorage.removeItem(STATS_KEY);
};
