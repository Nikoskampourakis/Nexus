import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Folder, 
  Book, 
  Code, 
  Briefcase, 
  Star, 
  Heart, 
  Zap, 
  Search, 
  MessageSquare, 
  Sparkles, 
  Shield, 
  Globe, 
  Music, 
  Camera, 
  Rocket, 
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  MoreVertical,
  Download,
  Share2,
  Activity,
  Settings,
  Menu,
  X,
  PlusCircle,
  Image as ImageIcon,
  Check,
  Edit2,
  Copy,
  LayoutDashboard,
  BrainCircuit,
  Pencil
} from 'lucide-react';
import { VirtualModel, ViewMode, ChatSession, PersonaTone, ChatFolder } from '../types';
import { exportBatchChatsAsZip } from '../services/exportService';
import { getPersonalizationConfig } from '../services/personalizationService';
import { subscribeAuth } from '../services/workspaceAuthService';
import { 
  getStoredFolders, 
  createStoredFolder, 
  deleteStoredFolder, 
  moveSessionToFolder 
} from '../services/storageService';

const PRESET_ICONS = [
  { id: 'Folder', icon: Folder },
  { id: 'Book', icon: Book },
  { id: 'Code', icon: Code },
  { id: 'Briefcase', icon: Briefcase },
  { id: 'Star', icon: Star },
  { id: 'Heart', icon: Heart },
  { id: 'Zap', icon: Zap },
  { id: 'Search', icon: Search },
  { id: 'MessageSquare', icon: MessageSquare },
  { id: 'Sparkles', icon: Sparkles },
  { id: 'Shield', icon: Shield },
  { id: 'Globe', icon: Globe },
  { id: 'Music', icon: Music },
  { id: 'Camera', icon: Camera },
  { id: 'Rocket', icon: Rocket },
  { id: 'Lightbulb', icon: Lightbulb }
];

const FolderIconRenderer = ({ icon, className }: { icon?: string; className?: string }) => {
  if (!icon) return <Folder className={className} />;
  if (icon.startsWith('data:')) {
    return <img src={icon} className={`${className} object-contain rounded-sm`} alt="" />;
  }
  const IconEntry = PRESET_ICONS.find(p => p.id === icon);
  const IconComp = IconEntry ? IconEntry.icon : Folder;
  return <IconComp className={className} />;
};

interface SidebarProps {
  models: VirtualModel[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
  
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession?: (id: string, newTitle: string) => void;
  onForkSession?: (id: string) => void;
  onDownloadSession?: (session: ChatSession) => void;
  onBatchExportSuccess?: (count: number) => void;
  onSessionMoved?: () => void;

  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  isOpen: boolean;
  onToggle: () => void;

  isIncognito?: boolean;
  onToggleIncognito?: () => void;
  onNewChat?: (expiresInMs?: number | null) => void;
  onOpenStats?: () => void;
  activeExpiration?: number | null;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'images';

interface SessionTreeNode {
  session: ChatSession;
  children: SessionTreeNode[];
  level: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  models,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onForkSession,
  onDownloadSession,
  onBatchExportSuccess,
  onSessionMoved,
  currentView,
  onChangeView,
  isOpen,
  onToggle,
  onNewChat,
  onOpenStats,
  activeExpiration
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpirationMenu, setShowExpirationMenu] = useState(false);

  const EXPIRATION_OPTIONS = [
    { label: 'Off', value: null },
    { label: '10 Min', value: 10 * 60 * 1000 },
    { label: '1 Hour', value: 60 * 60 * 1000 },
    { label: '1 Day', value: 24 * 60 * 60 * 1000 },
    { label: '1 Week', value: 7 * 24 * 60 * 60 * 1000 },
    { label: '1 Month', value: 30 * 24 * 60 * 60 * 1000 },
    { label: '3 Months', value: 90 * 24 * 60 * 60 * 1000 },
  ];
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFiltersManual, setShowFiltersManual] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Folder Management State
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#06b6d4');
  const [newFolderIcon, setNewFolderIcon] = useState('Folder');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [activeDropFolderId, setActiveDropFolderId] = useState<string | null | 'root'>(null);
  const [selectedSummarySession, setSelectedSummarySession] = useState<ChatSession | null>(null);
  const folderIconInputRef = useRef<HTMLInputElement>(null);

  // Batch Selection and Export State
  const [isBatchSelecting, setIsBatchSelecting] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');
  const [activeTone, setActiveTone] = useState<PersonaTone>('professional');
  const [isWorkspaceConnected, setIsWorkspaceConnected] = useState(false);

  useEffect(() => {
    setFolders(getStoredFolders());
  }, [sessions]);

  useEffect(() => {
    const config = getPersonalizationConfig();
    setActiveTone(config.tone);
  }, [currentView]);

  useEffect(() => {
    const unsub = subscribeAuth((user, token) => {
      setIsWorkspaceConnected(!!user && !!token);
    });
    return () => unsub();
  }, []);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewFolderIcon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    createStoredFolder(newFolderName.trim(), newFolderColor, newFolderIcon);
    setFolders(getStoredFolders());
    setNewFolderName('');
    setNewFolderIcon('Folder');
    setIsCreatingFolder(false);
  };

  const handleDeleteExistingFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Use a custom modal-like confirmation if needed, but for now just execute as requested
    // "fix folders because you cant delete them"
    await deleteStoredFolder(folderId);
    const updatedFolders = getStoredFolders();
    setFolders(updatedFolders);
    if (onSessionMoved) onSessionMoved();
  };

  const handleDragSessionStart = (e: React.DragEvent, sessionId: string) => {
    e.dataTransfer.setData('text/plain', sessionId);
    setDraggedSessionId(sessionId);
  };

  const handleDragSessionEnd = () => {
    setDraggedSessionId(null);
    setActiveDropFolderId(null);
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolderId?: string) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData('text/plain') || draggedSessionId;
    if (sessionId) {
      moveSessionToFolder(sessionId, targetFolderId);
      setFolders(getStoredFolders());
      if (onSessionMoved) onSessionMoved();
    }
    setDraggedSessionId(null);
    setActiveDropFolderId(null);
  };

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const toggleSelectSession = (sessionId: string) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedSessionIds.size === filteredSessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(filteredSessions.map(s => s.id)));
    }
  };

  const handleExecuteBatchExport = async () => {
    const selected = sessions.filter(s => selectedSessionIds.has(s.id));
    if (selected.length === 0) return;

    setIsBatchExporting(true);
    setBatchProgress(`Processing 0 / ${selected.length}...`);

    try {
      const modelMap: Record<string, string> = {};
      models.forEach(m => { modelMap[m.id] = m.name; });

      await exportBatchChatsAsZip(selected, modelMap, (done, total, title) => {
        setBatchProgress(`${done}/${total}: ${title.slice(0, 14)}...`);
      });

      if (onBatchExportSuccess) {
        onBatchExportSuccess(selected.length);
      }
      setIsBatchSelecting(false);
      setSelectedSessionIds(new Set());
    } catch (err) {
      console.error('Batch ZIP export error:', err);
    } finally {
      setIsBatchExporting(false);
      setBatchProgress('');
    }
  };

  // Helper date formatting
  const formatSessionDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (isYesterday) {
      return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filtered Sessions logic
  const filteredSessions = useMemo(() => {
    const nonIncognito = sessions.filter(s => !s.isIncognito);
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    return nonIncognito.filter(session => {
      // 1. Date Filter check
      if (dateFilter === 'today') {
        const d = new Date(session.updatedAt);
        const today = new Date();
        if (d.toDateString() !== today.toDateString()) return false;
      } else if (dateFilter === 'week') {
        if (now - session.updatedAt > sevenDays) return false;
      } else if (dateFilter === 'month') {
        if (now - session.updatedAt > thirtyDays) return false;
      } else if (dateFilter === 'images') {
        const hasImg = session.messages.some(m => m.attachment || m.generatedImage || m.isImageGeneration);
        if (!hasImg) return false;
      }

      // 2. Search query check
      if (!q) return true;

      // Match Title
      if (session.title.toLowerCase().includes(q)) return true;

      // Match Date string keywords
      const dateStr = new Date(session.updatedAt).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
      const relativeDate = formatSessionDate(session.updatedAt).toLowerCase();
      if (dateStr.includes(q) || relativeDate.includes(q)) return true;

      // Match Message content
      const hasMatchingMessage = session.messages.some(m => m.content && m.content.toLowerCase().includes(q));
      if (hasMatchingMessage) return true;

      return false;
    });
  }, [sessions, searchQuery, dateFilter]);

  // Build hierarchical session tree structure for forked chats
  const sessionTree = useMemo(() => {
    // If active search query or date filter, show linear filtered results for easy searching
    if (searchQuery.trim() !== '' || dateFilter !== 'all') {
      return filteredSessions.map(s => ({ session: s, children: [], level: 0 }));
    }

    const sessionMap = new Map<string, ChatSession>();
    filteredSessions.forEach(s => sessionMap.set(s.id, s));

    const childrenMap = new Map<string, ChatSession[]>();
    const rootSessions: ChatSession[] = [];

    filteredSessions.forEach(s => {
      if (s.forkedFromSessionId && sessionMap.has(s.forkedFromSessionId)) {
        const parentId = s.forkedFromSessionId;
        const list = childrenMap.get(parentId) || [];
        list.push(s);
        childrenMap.set(parentId, list);
      } else {
        rootSessions.push(s);
      }
    });

    const buildTree = (session: ChatSession, level: number): SessionTreeNode => {
      const childSessions = childrenMap.get(session.id) || [];
      return {
        session,
        level,
        children: childSessions.map(child => buildTree(child, level + 1))
      };
    };

    return rootSessions.map(root => buildTree(root, 0));
  }, [filteredSessions, searchQuery, dateFilter]);

  // Helper to extract matching snippet
  const getMatchingSnippet = (session: ChatSession, query: string): string | null => {
    if (!query) return null;
    const q = query.toLowerCase();
    for (const m of session.messages) {
      if (m.content && m.content.toLowerCase().includes(q)) {
        const lower = m.content.toLowerCase();
        const idx = lower.indexOf(q);
        const start = Math.max(0, idx - 20);
        const end = Math.min(m.content.length, idx + q.length + 30);
        let snippet = m.content.slice(start, end).replace(/\n/g, ' ');
        if (start > 0) snippet = '...' + snippet;
        if (end < m.content.length) snippet = snippet + '...';
        return snippet;
      }
    }
    return null;
  };

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (sessionId: string, e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onRenameSession && editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  // Render individual tree item recursively
  const renderSessionItem = (node: SessionTreeNode, isLastChild: boolean = false) => {
    const session = node.session;
    const isCurrent = session.id === currentSessionId;
    const isEditing = editingSessionId === session.id;
    const matchingSnippet = searchQuery ? getMatchingSnippet(session, searchQuery) : null;
    const isForked = Boolean(session.forkedFromSessionId);
    const hasImageCreation = session.messages.some(m => m.generatedImage || m.isImageGeneration);
    const indentPixels = node.level * 16;

    return (
      <div key={session.id} className="relative group/node">
        {/* Tree structural connector lines for forked hierarchy */}
        {node.level > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none"
            style={{ width: `${indentPixels}px` }}
          >
            {/* Vertical stem */}
            <div 
              className="absolute h-full border-l-2 border-cyan-500/20" 
              style={{ left: `${(node.level - 1) * 16 + 10}px` }} 
            />
            {/* Horizontal branch */}
            <div 
              className="absolute border-b-2 border-cyan-500/20" 
              style={{ 
                left: `${(node.level - 1) * 16 + 10}px`, 
                width: '10px',
                top: '50%'
              }} 
            />
          </div>
        )}

        <div
          style={{ paddingLeft: `${node.level > 0 ? indentPixels + 6 : 0}px` }}
          className={`transition-all ${node.level > 0 ? 'mt-0.5' : ''}`}
        >
          <div
            onClick={() => {
              if (isBatchSelecting) {
                toggleSelectSession(session.id);
                return;
              }
              onSelectSession(session.id);
              onChangeView('chat');
              if (window.innerWidth < 1024) onToggle();
            }}
            className={`w-full group text-left px-3 py-2 rounded-xl text-xs transition-all relative flex flex-col cursor-pointer border ${
              isBatchSelecting && selectedSessionIds.has(session.id)
                ? 'bg-cyan-950/60 text-white font-semibold border-cyan-400 shadow-md ring-1 ring-cyan-500/30'
                : isCurrent
                ? 'bg-[var(--card-bg)] text-[var(--text-primary)] font-semibold border-cyan-500/50 shadow-md ring-1 ring-cyan-500/20'
                : isForked
                ? 'border-purple-900/30 hover:border-purple-500/40 text-[var(--text-secondary)] hover:bg-[var(--card-bg)]'
                : 'border-transparent hover:border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isEditing ? (
              <div className="flex items-center space-x-1 w-full" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(session.id);
                    if (e.key === 'Escape') setEditingSessionId(null);
                  }}
                  autoFocus
                  className="w-full bg-[var(--background)] text-xs text-[var(--text-primary)] px-2 py-1 rounded border border-cyan-500 focus:outline-none"
                />
                <button
                  onClick={(e) => handleSaveRename(session.id, e)}
                  className="text-emerald-400 hover:text-emerald-300 p-1"
                  title="Save Title"
                >
                  ✓
                </button>
                <button
                  onClick={handleCancelRename}
                  className="text-gray-400 hover:text-white p-1"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center min-w-0 mr-1.5 flex-1">
                  {/* Batch Selection Checkbox */}
                  {isBatchSelecting ? (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectSession(session.id);
                      }}
                      className={`w-4 h-4 rounded-md border flex items-center justify-center mr-2 flex-shrink-0 transition-all ${
                        selectedSessionIds.has(session.id)
                          ? 'bg-cyan-500 border-cyan-400 text-black shadow-sm'
                          : 'bg-zinc-800/80 border-zinc-600 hover:border-cyan-400'
                      }`}
                    >
                      {selectedSessionIds.has(session.id) && (
                        <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  ) : isForked ? (
                    <svg className="w-3.5 h-3.5 text-purple-400 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  ) : (
                    <svg className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${isCurrent ? 'text-cyan-400' : 'text-[var(--text-secondary)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}

                  <span className={`truncate text-left ${
                    isBatchSelecting && selectedSessionIds.has(session.id)
                      ? 'font-bold text-cyan-200'
                      : isCurrent
                      ? 'font-semibold text-white'
                      : 'text-[var(--text-primary)]'
                  }`}>
                    {session.title}
                  </span>

                  {isForked && (
                    <span className="ml-1.5 px-1 py-0.2 rounded bg-purple-950/80 text-purple-300 text-[9px] border border-purple-800/40 flex-shrink-0 font-mono">
                      Fork
                    </span>
                  )}
                </div>

                {/* Hover Action Buttons - hidden in batch mode */}
                {!isBatchSelecting && (
                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button 
                      onClick={(e) => handleStartRename(session, e)}
                      className="text-[var(--text-secondary)] hover:text-cyan-400 p-1 rounded hover:bg-[var(--background)] transition-colors"
                      title="Rename Chat"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {onDownloadSession && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadSession(session);
                        }}
                        className="text-[var(--text-secondary)] hover:text-cyan-400 p-1 rounded hover:bg-[var(--background)] transition-colors"
                        title="Download Chat (PDF / Markdown)"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    )}

                    {onForkSession && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onForkSession(session.id);
                        }}
                        className="text-[var(--text-secondary)] hover:text-purple-400 p-1 rounded hover:bg-[var(--background)] transition-colors"
                        title="Fork / Branch Conversation"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                      </button>
                    )}

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="text-[var(--text-secondary)] hover:text-red-400 p-1 rounded hover:bg-[var(--background)] transition-colors"
                      title="Delete Chat"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Matching snippet on search */}
            {matchingSnippet && (
              <div className="mt-1.5 px-2 py-1 rounded bg-[var(--background)]/90 border border-cyan-500/20 text-[10px] text-cyan-200 line-clamp-2">
                <span className="opacity-70 font-semibold mr-1">Match:</span>
                {matchingSnippet}
              </div>
            )}

            {/* Meta tags: Date + Image badge + AI Summary badge */}
            <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-secondary)] opacity-80 font-mono">
              <div className="flex items-center gap-1">
                {hasImageCreation && (
                  <span className="px-1 py-0.2 rounded bg-purple-950/60 text-purple-300 text-[9px] border border-purple-800/40">
                    IMG
                  </span>
                )}
                {session.aiSummary && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSummarySession(session);
                    }}
                    className="px-1.5 py-0.2 rounded bg-cyan-950/70 text-cyan-300 hover:text-white text-[9px] border border-cyan-700/50 flex items-center gap-0.5 hover:bg-cyan-900 transition-colors"
                    title="View AI Summary"
                  >
                    <span>Summary</span>
                  </button>
                )}
                <span>{session.messages.length} msgs</span>
              </div>
              <span>{formatSessionDate(session.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Recursive Children (Forked branch tree) */}
        {node.children.length > 0 && (
          <div className="space-y-1 mt-1">
            {node.children.map((child, idx) =>
              renderSessionItem(child, idx === node.children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const showFilters = isSearchFocused || searchQuery.trim() !== '' || showFiltersManual;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onToggle}
      />

      {/* Sidebar Drawer */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-full w-80 transform border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 1. Header with Logo & New Chat */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border-color)] flex-shrink-0 bg-[var(--sidebar-bg)]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow" style={{ background: 'var(--accent-bg)' }}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              Nexus AI
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {onNewChat && (
              <div className="flex items-center space-x-0.5">
                <button
                  onClick={() => {
                    onNewChat();
                    onChangeView('chat');
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={`p-1.5 rounded-l-lg border border-[var(--border-color)] ${activeExpiration ? 'bg-amber-600/20 border-amber-500/30 text-amber-400' : 'bg-[var(--card-bg)] text-[var(--text-secondary)]'} hover:bg-[var(--background)] hover:text-white transition-all shadow-sm`}
                  title={activeExpiration ? `New Timed Chat (Expires in ${EXPIRATION_OPTIONS.find(o => o.value === activeExpiration)?.label})` : "New Chat"}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowExpirationMenu(!showExpirationMenu)}
                    className={`p-1.5 rounded-r-lg border-y border-r border-[var(--border-color)] ${activeExpiration ? 'bg-amber-600/30 border-amber-500/40 text-amber-300' : 'bg-[var(--card-bg)] text-[var(--text-secondary)]'} hover:text-white transition-all`}
                    title="Set Chat Expiration"
                  >
                    <Activity className={`w-4 h-4 ${activeExpiration ? 'animate-pulse' : ''}`} />
                  </button>
                  
                  {showExpirationMenu && (
                    <div className="absolute right-0 top-full mt-2 w-40 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-2 border-b border-[var(--border-color)] bg-[var(--card-bg)]/50">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Auto-Delete Timer</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {EXPIRATION_OPTIONS.map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => {
                              onNewChat(opt.value);
                              setShowExpirationMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--card-bg)] transition-colors flex items-center justify-between ${
                              activeExpiration === opt.value ? 'text-amber-400 font-bold' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {activeExpiration === opt.value && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white lg:hidden"
              title="Close sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. BUMPED UP SEARCH BAR (Directly on top beneath header!) */}
        <div className="p-3 pb-2 flex-shrink-0 bg-[var(--sidebar-bg)] border-b border-[var(--border-color)] space-y-2">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search chat history & messages..."
              className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] pl-8 pr-16 py-2 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
            />
            
            <svg className="w-4 h-4 absolute left-2.5 text-[var(--text-secondary)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

            {/* Quick Actions inside search: Filter Toggle + Clear */}
            <div className="absolute right-2 flex items-center space-x-1">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-white p-0.5 rounded"
                  title="Clear search"
                >
                  ✕
                </button>
              )}

              <button
                onClick={() => setShowFiltersManual(!showFiltersManual)}
                className={`p-1 rounded transition-colors ${
                  showFiltersManual || dateFilter !== 'all'
                    ? 'text-cyan-400 bg-cyan-950/60'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
                title="Toggle search filters"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>

              <button
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className={`p-1 rounded transition-colors ${
                  isCreatingFolder
                    ? 'text-amber-400 bg-amber-950/60'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
                title="Create a new folder"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Create Folder Form */}
          {isCreatingFolder && (
            <form onSubmit={handleCreateNewFolder} className="mt-2 p-3 rounded-2xl bg-[#14141e] border border-amber-500/40 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xl relative z-30 backdrop-blur-xl">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Folder Name</label>
                <input
                  type="text"
                  placeholder="e.g., Marketing Projects"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  className="w-full bg-black/40 text-xs text-[var(--text-primary)] px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Icon Selection</label>
                  <button 
                    type="button" 
                    onClick={() => folderIconInputRef.current?.click()}
                    className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-2.5 h-2.5" />
                    Custom
                  </button>
                </div>
                <input type="file" ref={folderIconInputRef} onChange={handleIconUpload} className="hidden" accept="image/*" />
                
                <div className="grid grid-cols-8 gap-1.5 bg-black/40 p-2 rounded-xl border border-white/5">
                  {PRESET_ICONS.map(({ id, icon: IconComp }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setNewFolderIcon(id)}
                      className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${
                        newFolderIcon === id 
                          ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                          : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  {newFolderIcon.startsWith('data:') && (
                    <div className="flex items-center justify-center p-1 rounded-lg bg-amber-500 shadow-lg shadow-amber-500/20">
                      <img src={newFolderIcon} className="w-3.5 h-3.5 object-contain rounded-sm" alt="" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  {['#06b6d4', '#6366f1', '#ec4899', '#10b981', '#f59e0b'].map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewFolderColor(col)}
                      className={`w-4 h-4 rounded-full transition-all border-2 ${
                        newFolderColor === col 
                          ? 'border-white scale-110 shadow-sm' 
                          : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" disabled={!newFolderName.trim()} className="px-4 py-1.5 text-xs rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-50 transition-all shadow-lg shadow-amber-500/10">Create</button>
                </div>
              </div>
            </form>
          )}

          {/* HIDE FILTERS UNTIL USER IS IN SEARCH OR TOGGLED */}
          {showFilters && (
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none animate-fade-in text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'Past 7 Days' },
                { id: 'month', label: 'Past Month' },
                { id: 'images', label: 'Images' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id as any)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-all ${
                    dateFilter === f.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-white border border-transparent'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Primary Actions: New Chat, Create Studio, & Personalization */}
        <div className="p-3 pb-1 flex-shrink-0 space-y-1.5">
          <button
            onClick={() => {
              if (onNewChat) onNewChat();
              onChangeView('chat');
              if (window.innerWidth < 1024) onToggle();
            }}
            className="w-full py-2 px-3 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-cyan-500/40 text-xs font-semibold flex items-center justify-between transition-all shadow-sm group"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chat</span>
            </span>
          </button>

          <button
            onClick={() => {
              onChangeView('create');
              if (window.innerWidth < 1024) onToggle();
            }}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all shadow-sm ${
              currentView === 'create'
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 ring-1 ring-cyan-500/30'
                : 'bg-[var(--card-bg)] hover:bg-[var(--background)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-cyan-500/40'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span>Create Studio & Art</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Studio
            </span>
          </button>

          {/* Connect Apps (Google Workspace: Gmail, Drive, Sheets, Docs, Calendar, Tasks) */}
          <button
            onClick={() => {
              onChangeView('connect');
              if (window.innerWidth < 1024) onToggle();
            }}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all shadow-sm ${
              currentView === 'connect'
                ? 'bg-blue-950/60 border-blue-500/50 text-blue-300 ring-1 ring-blue-500/30'
                : 'bg-[var(--card-bg)] hover:bg-[var(--background)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-blue-500/40'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Connect Apps</span>
            </span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${
              isWorkspaceConnected
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            }`}>
              {isWorkspaceConnected ? 'Connected' : '6 Apps'}
            </span>
          </button>
        </div>

        {/* 4. Folders & Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
          {/* FOLDERS & CHATS COMBINED LIST */}
          <div className="space-y-0.5">
            {/* Folder list */}
            {folders.length > 0 && (
              <div className="space-y-0.5 mb-1">
                {folders.map(folder => {
                  const folderSessions = filteredSessions.filter(s => s.folderId === folder.id);
                  const isCollapsed = Boolean(collapsedFolders[folder.id]);
                  const isDropTarget = activeDropFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      onDragOver={(e) => { e.preventDefault(); setActiveDropFolderId(folder.id); }}
                      onDragLeave={() => setActiveDropFolderId(null)}
                      onDrop={(e) => handleDropOnFolder(e, folder.id)}
                      className={`rounded-lg transition-all ${
                        isDropTarget 
                          ? 'bg-cyan-950/40 border border-cyan-400 ring-1 ring-cyan-500/20' 
                          : 'hover:bg-[var(--card-bg)]/40'
                      }`}
                    >
                      <div
                        onClick={() => toggleFolderCollapse(folder.id)}
                        className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[var(--text-secondary)] transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                            <ChevronDown className="w-3 h-3" />
                          </span>
                          <span className="flex-shrink-0" style={{ color: folder.color }}>
                            <FolderIconRenderer icon={folder.icon} className="w-3.5 h-3.5" />
                          </span>
                          <span className="truncate text-[var(--text-primary)]">{folder.name}</span>
                          <span className="text-[9px] font-mono text-[var(--text-secondary)] opacity-60">
                            {folderSessions.length}
                          </span>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleDeleteExistingFolder(folder.id, e)}
                            className="text-[var(--text-secondary)] hover:text-red-400 p-1 rounded"
                            title="Delete Folder"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Folder session list */}
                      {!isCollapsed && folderSessions.length > 0 && (
                        <div className="pl-3 pr-1 pb-1 space-y-0.5">
                          {folderSessions.map(session => (
                            <div
                              key={session.id}
                              draggable={!isBatchSelecting}
                              onDragStart={(e) => handleDragSessionStart(e, session.id)}
                              onDragEnd={handleDragSessionEnd}
                            >
                              {renderSessionItem({ session, children: [], level: 0 })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* UNFILTERED / ROOT SESSIONS */}
            <div
              onDragOver={(e) => { e.preventDefault(); setActiveDropFolderId('root'); }}
              onDragLeave={() => setActiveDropFolderId(null)}
              onDrop={(e) => handleDropOnFolder(e, undefined)}
              className={`rounded-lg transition-all ${
                activeDropFolderId === 'root' ? 'bg-cyan-950/20 border border-dashed border-cyan-400/50 p-1' : ''
              }`}
            >
              <div className="space-y-0.5">
                {sessionTree
                  .filter(node => !node.session.folderId || folders.length === 0)
                  .map((node, idx) => (
                    <div
                      key={node.session.id}
                      draggable={!isBatchSelecting}
                      onDragStart={(e) => handleDragSessionStart(e, node.session.id)}
                      onDragEnd={handleDragSessionEnd}
                    >
                      {renderSessionItem(node, idx === sessionTree.length - 1)}
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary Preview Modal */}
        {selectedSummarySession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[var(--card-bg)] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center space-x-1.5 font-semibold text-neutral-100">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>AI Summary</span>
                </div>
                <button
                  onClick={() => setSelectedSummarySession(null)}
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto pr-1 text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-sans bg-[var(--background)]/80 p-3 rounded-xl border border-[var(--border-color)]">
                {selectedSummarySession.aiSummary || 'No summary generated yet.'}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    if (selectedSummarySession.aiSummary) {
                      navigator.clipboard.writeText(selectedSummarySession.aiSummary);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--background)] text-xs text-[var(--text-primary)] font-medium flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copy Summary</span>
                </button>
                <button
                  onClick={() => setSelectedSummarySession(null)}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Export Action Bar */}
        {isBatchSelecting && (
          <div className="p-3 border-t border-cyan-500/40 bg-zinc-950/95 flex-shrink-0 space-y-2 animate-in fade-in slide-in-from-bottom-2">
            <button
              disabled={selectedSessionIds.size === 0 || isBatchExporting}
              onClick={handleExecuteBatchExport}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                selectedSessionIds.size === 0 || isBatchExporting
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/40 active:scale-[0.98]'
              }`}
            >
              {isBatchExporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="truncate">{batchProgress || 'Exporting ZIP...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export {selectedSessionIds.size} {selectedSessionIds.size === 1 ? 'Chat' : 'Chats'} (ZIP)</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-zinc-400">
              Includes formatted PDF & Markdown files in a single archive
            </p>
          </div>
        )}

        {/* 5. Bottom Navigation: Activity Statistics & Settings */}
        <div className="p-3 border-t border-[var(--border-color)] flex-shrink-0 bg-[var(--sidebar-bg)] space-y-1">
          {/* User Activity & Stats Button */}
          {onOpenStats && (
            <button
              onClick={() => {
                onOpenStats();
                if (window.innerWidth < 1024) onToggle();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl text-[var(--text-secondary)] hover:bg-[var(--card-bg)] hover:text-cyan-300 transition-all border border-transparent hover:border-[var(--border-color)]"
            >
              <div className="flex items-center space-x-2.5">
                <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Usage Statistics</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => {
              onChangeView('settings');
              if (window.innerWidth < 1024) onToggle();
            }}
            className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-all ${
              currentView === 'settings' 
                ? 'bg-[var(--card-bg)] text-[var(--text-primary)] font-semibold border border-[var(--border-color)]' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)]'
            }`}
          >
            <svg className="mr-2.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings & Preferences</span>
          </button>
        </div>
      </aside>
    </>
  );
};
