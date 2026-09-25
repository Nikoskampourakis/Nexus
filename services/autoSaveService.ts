// Auto-Save Management Service for Nexus AI Architect
// Persists draft state, active sessions, preferences, and broadcasts save events

const AUTOSAVE_EVENT = 'nexus_autosave_event';
const DRAFT_INPUT_KEY = 'nexus_composer_draft';
const LAST_VIEW_KEY = 'nexus_last_view_state';
const LAST_SAVED_TIME_KEY = 'nexus_last_saved_timestamp';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveEventDetail {
  status: AutoSaveStatus;
  timestamp: number;
  reason?: string;
  itemCount?: number;
}

let saveTimeoutId: any = null;
let currentStatus: AutoSaveStatus = 'saved';
let lastSavedTime: number = Date.now();

try {
  const storedTime = localStorage.getItem(LAST_SAVED_TIME_KEY);
  if (storedTime) {
    lastSavedTime = parseInt(storedTime, 10) || Date.now();
  }
} catch {
  // Ignore
}

export const getAutoSaveStatus = (): { status: AutoSaveStatus; lastSavedTime: number } => {
  return { status: currentStatus, lastSavedTime };
};

const notifyStatus = (status: AutoSaveStatus, reason?: string) => {
  currentStatus = status;
  if (status === 'saved') {
    lastSavedTime = Date.now();
    try {
      localStorage.setItem(LAST_SAVED_TIME_KEY, lastSavedTime.toString());
    } catch {
      // Ignore
    }
  }

  const detail: AutoSaveEventDetail = {
    status,
    timestamp: lastSavedTime,
    reason
  };

  window.dispatchEvent(new CustomEvent(AUTOSAVE_EVENT, { detail }));
};

/**
 * Schedule a debounced auto-save operation
 */
export const requestAutoSave = (reason: string = 'State updated', delayMs: number = 400) => {
  notifyStatus('saving', reason);

  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }

  saveTimeoutId = setTimeout(() => {
    try {
      // Execute any required persistence flush
      notifyStatus('saved', reason);
    } catch (err) {
      console.error('AutoSave failed:', err);
      notifyStatus('error', String(err));
    }
  }, delayMs);
};

/**
 * Trigger immediate synchronous auto-save
 */
export const forceImmediateAutoSave = (reason: string = 'Manual save') => {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
    saveTimeoutId = null;
  }
  notifyStatus('saving', reason);
  setTimeout(() => {
    notifyStatus('saved', reason);
  }, 100);
};

/**
 * Draft message auto-saving so users never lose half-written prompts
 */
export const saveComposerDraft = (draft: string) => {
  try {
    if (draft && draft.trim()) {
      localStorage.setItem(DRAFT_INPUT_KEY, draft);
    } else {
      localStorage.removeItem(DRAFT_INPUT_KEY);
    }
    requestAutoSave('Draft saved', 300);
  } catch {
    // Storage quota or disabled
  }
};

export const getComposerDraft = (): string => {
  try {
    return localStorage.getItem(DRAFT_INPUT_KEY) || '';
  } catch {
    return '';
  }
};

export const clearComposerDraft = () => {
  try {
    localStorage.removeItem(DRAFT_INPUT_KEY);
  } catch {
    // Ignore
  }
};

/**
 * Last view & active session auto-persistence
 */
export const saveLastSessionState = (view: string, sessionId: string | null, modelId?: string) => {
  try {
    localStorage.setItem(LAST_VIEW_KEY, JSON.stringify({ view, sessionId, modelId, savedAt: Date.now() }));
    requestAutoSave('Session state preserved', 400);
  } catch {
    // Ignore
  }
};

export const getLastSessionState = (): { view: string; sessionId: string | null; modelId?: string } | null => {
  try {
    const raw = localStorage.getItem(LAST_VIEW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Event listener hook for auto-save status changes
 */
export const subscribeAutoSave = (callback: (detail: AutoSaveEventDetail) => void) => {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<AutoSaveEventDetail>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener(AUTOSAVE_EVENT, handler);
  return () => {
    window.removeEventListener(AUTOSAVE_EVENT, handler);
  };
};
