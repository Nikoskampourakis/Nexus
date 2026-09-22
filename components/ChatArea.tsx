import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Plus, 
  PlusCircle, 
  Send, 
  StopCircle, 
  Search, 
  Sparkles, 
  Trash2, 
  FileText, 
  Image as ImageIcon, 
  Settings, 
  Menu, 
  X, 
  Zap, 
  Activity, 
  Mic, 
  MicOff, 
  Copy, 
  RotateCcw, 
  MoreVertical, 
  Clock, 
  User, 
  Bot, 
  Download, 
  Share2, 
  ExternalLink, 
  Code, 
  BrainCircuit, 
  Glasses, 
  Dna, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Type, 
  Check, 
  List, 
  FileEdit, 
  Briefcase, 
  FileCode, 
  Terminal, 
  Wand2, 
  Globe, 
  Shield, 
  ShieldAlert, 
  EyeOff, 
  Eye,
  Camera,
  Archive,
  Play,
  Volume2,
  File as FileIcon,
  Package
} from 'lucide-react';
import { Message, VirtualModel, ShortcutItem, FormattingActionType } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { QuizWidget, VisualCard, MathCalcWidget } from './StudyTools';
import { LatexMath, renderLatexInText } from './LatexMath';
import { AudiblePlayer, AudibleState } from './AudiblePlayer';
import { EnhancedCodeBlock } from './EnhancedCodeBlock';
import { SourcesViewer } from './SourcesViewer';
import { CouncilChamberCard } from './CouncilChamberCard';
import { DeepDiveCard, MediaLinksCard, CorrectionAuditCard } from './ResearchTools';
import { ArchivePackage, unpackArchive, packZipArchive, packTarArchive } from '../services/archiveService';
import { downloadWordFromMarkdown, downloadPptxFromMarkdown } from '../services/docGenService';
import { CameraModal } from './CameraModal';
import { GoogleDriveImportModal } from './GoogleDriveImportModal';
import { AppIcon } from './AppIcon';
import { trackAppCommandExecuted } from '../services/storageService';
import { calculateSessionTokens, formatTokenCount, TokenStats } from '../services/tokenService';
import { generateChatSummary } from '../services/geminiService';
import { 
  AppLinkingMenu, 
  LinkedAppPill, 
  renderTextWithAppLinks, 
  LINKABLE_APPS, 
  LinkableAppItem, 
  executeAppAction 
} from './AppLinkingModal';

interface ChatAreaProps {
  activeModel: VirtualModel;
  messages: Message[];
  isLoading: boolean;
  input: string;
  onInputChange: (val: string) => void;
  onSend: (
    attachment?: { mimeType: string; data: string } | null,
    archiveAttachment?: Message['archiveAttachment'] | null
  ) => void;
  onGenerateImage?: (prompt: string, options?: { stylePrompt?: string, aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' }) => Promise<void>;
  onStop: () => void;
  onRetry: (msgId: string) => void;
  onNavigateVersion: (msgId: string, direction: 'prev' | 'next') => void;
  onDeepSearch: () => void;
  
  researchMode: boolean;
  onToggleResearch: () => void;
  
  thinkMode: boolean;
  onToggleThink: () => void;

  studyMode: boolean;
  onToggleStudy: () => void;

  councilMode?: boolean;
  onToggleCouncil?: () => void;

  correctionMode?: boolean;
  onToggleCorrectionMode?: () => void;
  onRunCorrection?: (messageId: string, content: string) => void;

  searchModeType?: 'web' | 'research';
  onSelectSearchModeType?: (type: 'web' | 'research') => void;
  
  onFormatMessage?: (messageId: string, formatType: FormattingActionType) => void;
  onFormatInput?: (formatType: FormattingActionType) => void;
  
  onStartLiveMode: () => void;
  shortcuts?: ShortcutItem[];

  onLearnFromChat?: () => Promise<void>;
  isLearning?: boolean;
  onUpdateModelKnowledge?: (newKnowledge: string) => void;

  // New features
  isIncognito?: boolean;
  onToggleIncognito?: () => void;
  currentSessionTitle?: string;
  onRenameCurrentSession?: (newTitle: string) => void;
  onForkCurrentSession?: () => void;
  onForkFromMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string, regenerate?: boolean) => void;

  // Mobile navigation props
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
  onOpenCreateTab?: () => void;
  onOpenAppStore?: () => void;
  onSendImageToCreateStudio?: (imageBase64: string, promptText: string) => void;

  // Document & Presentation Features
  onDownloadChat?: () => void;
  onOpenSettings?: (tab?: 'general' | 'advanced' | 'personalization' | 'appearance' | 'shortcuts' | 'usage' | 'iconpack' | 'permissions') => void;
  isForked?: boolean;
  expiresAt?: number;
}

// --- Helper Components ---

const CodeBlock = ({ language, value, onRun }: { language: string, value: string, onRun?: (code: string) => void }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunnable = language === 'html' || language === 'xml' || language === 'javascript' || language === 'css';

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[#0d1117] shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[var(--card-bg)]/90 border-b border-[var(--border-color)]">
        <span className="text-xs font-mono text-[var(--text-secondary)] lowercase">{language || 'code'}</span>
        <div className="flex items-center space-x-2">
          {isRunnable && onRun && (
             <button 
              onClick={() => onRun(value)}
              className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Run</span>
            </button>
          )}
          <button 
            onClick={handleCopy}
            className="flex items-center space-x-1 text-xs text-[var(--text-secondary)] hover:text-white transition-colors px-2 py-0.5 rounded bg-[var(--background)]/60 hover:bg-[var(--background)]"
            title="Copy code"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="p-3.5 overflow-x-auto custom-scrollbar bg-[#090d13]">
        <code className="font-mono text-xs text-gray-200 whitespace-pre">{value}</code>
      </div>
    </div>
  );
};

const CanvasPreview = ({ code, onClose }: { code: string, onClose: () => void }) => {
  return (
    <div className="flex flex-col h-full w-full bg-white rounded-l-2xl lg:rounded-l-none overflow-hidden shadow-2xl border-l border-[var(--border-color)] relative">
      <div className="h-11 bg-gray-100 border-b border-gray-300 flex items-center justify-between px-4">
        <span className="text-xs font-bold text-gray-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          CANVAS SANDBOX
        </span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <iframe 
        className="flex-1 w-full h-full bg-white"
        srcDoc={code}
        sandbox="allow-scripts"
        title="Canvas"
      />
    </div>
  );
};

const SmartContentRenderer = ({ 
  content, 
  onRunCode,
  onAppLinkClick 
}: { 
  content: string; 
  onRunCode: (c: string) => void;
  onAppLinkClick?: (mention: string) => void;
}) => {
    const parts = content.split(/(\|\|VISUAL\|\||\|\|QUIZ\|\||\|\|CALC\|\||\|\|MATH\|\||\|\|DEEP_DIVE\|\||\|\|MEDIA_LINKS\|\||\|\|CORRECTION_AUDIT\|\|)/g);
    
    return (
        <div className="space-y-3">
            {parts.map((part, i) => {
                if (
                  part === '||VISUAL||' || 
                  part === '||QUIZ||' || 
                  part === '||CALC||' || 
                  part === '||MATH||' ||
                  part === '||DEEP_DIVE||' ||
                  part === '||MEDIA_LINKS||' ||
                  part === '||CORRECTION_AUDIT||'
                ) return null;
                
                const prev = parts[i-1];
                
                if (prev === '||VISUAL||') {
                    try {
                        const data = JSON.parse(part.trim());
                        return <VisualCard key={i} data={data} />;
                    } catch (e) {
                        return <div key={i} className="text-red-400 text-xs">Error parsing visual</div>;
                    }
                }
                
                if (prev === '||QUIZ||') {
                    try {
                        const data = JSON.parse(part.trim());
                        return <QuizWidget key={i} data={data} />;
                    } catch (e) {
                        return <div key={i} className="text-red-400 text-xs">Error parsing quiz</div>;
                    }
                }

                if (prev === '||CALC||' || prev === '||MATH||') {
                    try {
                        const data = JSON.parse(part.trim());
                        return <MathCalcWidget key={i} data={data} />;
                    } catch (e) {
                        return <div key={i} className="text-red-400 text-xs">Error parsing mathematical calculation solver</div>;
                    }
                }

                if (prev === '||DEEP_DIVE||') {
                    try {
                        const data = JSON.parse(part.trim());
                        return <DeepDiveCard key={i} data={data} />;
                    } catch (e) {
                        return <div key={i} className="text-red-400 text-xs">Error parsing deep dive summary</div>;
                    }
                }

                if (prev === '||MEDIA_LINKS||') {
                    try {
                        const data = JSON.parse(part.trim());
                        return <MediaLinksCard key={i} data={data} />;
                    } catch (e) {
                        return <div key={i} className="text-red-400 text-xs">Error parsing media links</div>;
                    }
                }

                if (prev === '||CORRECTION_AUDIT||') {
                    try {
                        const data = JSON.parse(part.trim());
                        return <CorrectionAuditCard key={i} data={data} />;
                    } catch (e) {
                        return <div key={i} className="text-red-400 text-xs">Error parsing correction audit</div>;
                    }
                }

                return (
                    <div key={i} className="markdown-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          h1({ children }) {
                            return <h1 className="text-xl sm:text-2xl font-bold text-neutral-100 mt-5 mb-3 pb-1 border-b border-white/10 tracking-tight">{children}</h1>;
                          },
                          h2({ children }) {
                            return <h2 className="text-lg sm:text-xl font-semibold text-neutral-100 mt-4 mb-2 tracking-tight">{children}</h2>;
                          },
                          h3({ children }) {
                            return <h3 className="text-base sm:text-lg font-semibold text-cyan-300 mt-3 mb-1.5">{children}</h3>;
                          },
                          p({ children }) {
                            if (typeof children === 'string' && onAppLinkClick) {
                              return <p className="text-sm text-neutral-200 leading-relaxed my-2">{renderTextWithAppLinks(children, onAppLinkClick)}</p>;
                            }
                            return <p className="text-sm text-neutral-200 leading-relaxed my-2">{children}</p>;
                          },
                          ul({ children }) {
                            return <ul className="list-disc pl-5 my-2 space-y-1 text-sm text-neutral-200">{children}</ul>;
                          },
                          ol({ children }) {
                            return <ol className="list-decimal pl-5 my-2 space-y-1 text-sm text-neutral-200">{children}</ol>;
                          },
                          li({ children }) {
                            if (typeof children === 'string' && onAppLinkClick) {
                              return <li className="leading-relaxed">{renderTextWithAppLinks(children, onAppLinkClick)}</li>;
                            }
                            return <li className="leading-relaxed">{children}</li>;
                          },
                          blockquote({ children }) {
                            return (
                              <blockquote className="border-l-4 border-cyan-500/70 bg-cyan-950/20 pl-3.5 py-1.5 my-2.5 rounded-r-lg text-neutral-300 italic text-sm">
                                {children}
                              </blockquote>
                            );
                          },
                          table({ children }) {
                            return (
                              <div className="overflow-x-auto my-3 rounded-xl border border-white/15 bg-neutral-900/60 custom-scrollbar">
                                <table className="w-full text-xs text-left border-collapse">{children}</table>
                              </div>
                            );
                          },
                          thead({ children }) {
                            return <thead className="bg-white/10 text-neutral-200 uppercase font-semibold text-[11px]">{children}</thead>;
                          },
                          th({ children }) {
                            return <th className="px-3 py-2 border-b border-white/10">{children}</th>;
                          },
                          td({ children }) {
                            return <td className="px-3 py-2 border-b border-white/5 text-neutral-300">{children}</td>;
                          },
                          a({ href, children }) {
                            return (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
                              >
                                {children}
                              </a>
                            );
                          },
                          hr() {
                            return <hr className="my-4 border-white/10" />;
                          },
                          strong({ children }) {
                            return <strong className="font-semibold text-white">{children}</strong>;
                          },
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match;
                            return !isInline && match ? (
                              <EnhancedCodeBlock
                                language={match[1]}
                                value={String(children).replace(/\n$/, '')}
                                onRun={onRunCode}
                              />
                            ) : (
                              <code className="px-1.5 py-0.5 rounded bg-neutral-900 border border-white/10 text-xs font-mono text-cyan-300" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {part}
                      </ReactMarkdown>
                    </div>
                );
            })}
        </div>
    );
};

// --- Main ChatArea Component ---

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeModel,
  messages,
  isLoading,
  input,
  onInputChange,
  onSend,
  onGenerateImage,
  onStop,
  onRetry,
  onNavigateVersion,
  onDeepSearch,
  researchMode,
  onToggleResearch,
  thinkMode,
  onToggleThink,
  studyMode,
  onToggleStudy,
  councilMode = false,
  onToggleCouncil,
  correctionMode = false,
  onToggleCorrectionMode,
  onRunCorrection,
  searchModeType = 'research',
  onSelectSearchModeType,
  onFormatMessage,
  onFormatInput,
  onStartLiveMode,
  shortcuts = [],
  isIncognito,
  onToggleIncognito,
  currentSessionTitle,
  onRenameCurrentSession,
  onForkFromMessage,
  onEditMessage,
  onToggleSidebar,
  onNewChat,
  onOpenCreateTab,
  onOpenAppStore,
  onSendImageToCreateStudio,
  onDownloadChat,
  onOpenSettings,
  isForked = false,
  expiresAt,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [showDriveModal, setShowDriveModal] = useState(false);

  // Countdown timer for expired chats
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) setTimeLeft(`${days}d ${hours % 24}h`);
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes % 60}m`);
      else if (minutes > 0) setTimeLeft(`${minutes}m ${seconds}s`);
      else setTimeLeft(`${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const [pendingAttachment, setPendingAttachment] = useState<{ mimeType: string, data: string } | null>(null);
  const [pendingArchive, setPendingArchive] = useState<ArchivePackage | null>(null);
  const [isUnpackingArchive, setIsUnpackingArchive] = useState(false);
  const [expandedArchiveMsgId, setExpandedArchiveMsgId] = useState<string | null>(null);
  const [activePreviewFile, setActivePreviewFile] = useState<{ path: string; content?: string } | null>(null);
  const [docNotification, setDocNotification] = useState<string | null>(null);

  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasCode, setCanvasCode] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Message Tools Menu and Active Formatting State
  const [activeToolsMenuMsgId, setActiveToolsMenuMsgId] = useState<string | null>(null);
  const [formattingMsgId, setFormattingMsgId] = useState<string | null>(null);
  const [showFormatInputMenu, setShowFormatInputMenu] = useState(false);

  // In-Chat Image Generation Mode State
  const [imageGenMode, setImageGenMode] = useState(false);
  const [imageGenStyle, setImageGenStyle] = useState('Photorealistic, 8k resolution cinematic lighting');
  const [imageGenAspect, setImageGenAspect] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; prompt: string } | null>(null);

  // Voice Recognition (Speech-to-Text) State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Audible State
  const [audibleMessage, setAudibleMessage] = useState<{ id: string; text: string } | null>(null);

  // Smart Auto-Scroll & Scroll-to-Bottom State
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const prevMessagesLengthRef = useRef(messages.length);

  // Message Editing State
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState('');

  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  // Live Token Counter & Inspector State
  const [showTokenInspector, setShowTokenInspector] = useState(false);
  const tokenStats: TokenStats = calculateSessionTokens(messages, activeModel, input);

  // @ App Linking & Mentions State
  const [showAtAppMenu, setShowAtAppMenu] = useState(false);

  // Detect active @ app query in current input
  const getAtAppMentionQuery = (text: string): string | null => {
    const atIndex = text.lastIndexOf('@');
    if (atIndex === -1) return null;
    const slice = text.slice(atIndex);
    // If there is whitespace after @word, mention query is finished
    if (/\s/.test(slice)) return null;
    return slice; // e.g. "@cr", "@d", "@"
  };

  const currentAtMentionQuery = getAtAppMentionQuery(input);
  const isAtMenuOpen = showAtAppMenu || currentAtMentionQuery !== null;

  const handleSelectApp = (app: LinkableAppItem, mode: 'mention' | 'launch') => {
    if (mode === 'launch') {
      executeAppAction(app.id, {
        onOpenCreate: onOpenCreateTab,
        onOpenDrive: () => setShowDriveModal(true),
        onOpenPermissions: () => onOpenSettings?.('permissions'),
        onOpenStats: () => onOpenSettings?.('usage'),
        onToggleResearch,
        onToggleThink,
        onToggleStudy,
        onToggleCouncil,
        onOpenCamera: () => setShowCamera(true),
        onOpenArchive: () => fileInputRef.current?.click(),
        onOpenSettings: () => onOpenSettings?.('general')
      });
      setShowAtAppMenu(false);
      return;
    }

    // Mention mode: replace active @query or append
    if (currentAtMentionQuery !== null) {
      const atIndex = input.lastIndexOf('@');
      const prefix = input.slice(0, atIndex);
      const newInput = `${prefix}${app.mention} `;
      onInputChange(newInput);
    } else {
      const newInput = input ? `${input.trim()} ${app.mention} ` : `${app.mention} `;
      onInputChange(newInput);
    }
    setShowAtAppMenu(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleAppLinkClick = (mention: string) => {
    const cleanLower = mention.toLowerCase();
    const app = LINKABLE_APPS.find(a => 
      a.mention.toLowerCase() === cleanLower || a.aliases.some(alias => alias.toLowerCase() === cleanLower)
    );
    if (!app) return;
    executeAppAction(app.id, {
      onOpenCreate: onOpenCreateTab,
      onOpenDrive: () => setShowDriveModal(true),
      onOpenPermissions: () => onOpenSettings?.('permissions'),
      onOpenStats: () => onOpenSettings?.('usage'),
      onToggleResearch,
      onToggleThink,
      onToggleStudy,
      onToggleCouncil,
      onOpenCamera: () => setShowCamera(true),
      onOpenArchive: () => fileInputRef.current?.click(),
      onOpenSettings: () => onOpenSettings?.('general')
    });
  };

  // Detected @ mentions in input to display as linked badges above the textarea
  const detectedLinkedMentions = Array.from(
    new Set(
      (input.match(/(@(?:Create|Drive|GoogleDrive|Permissions|Privacy|Stats|Statistics|Usage|Research|Web|Think|Study|Quiz|Council|Debate|Camera|Archive|Settings|Studio))\b/gi) || [])
        .map(m => {
          const clean = m.toLowerCase();
          const app = LINKABLE_APPS.find(a => 
            a.mention.toLowerCase() === clean || a.aliases.some(alias => alias.toLowerCase() === clean)
          );
          return app ? app.mention : m;
        })
    )
  );

  const handleRemoveLinkedMention = (mention: string) => {
    const regex = new RegExp(`\\s*${mention}\\b`, 'gi');
    onInputChange(input.replace(regex, '').trim());
  };

  // AI Summary State
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummaryDrawer, setShowSummaryDrawer] = useState(false);

  const handleGenerateSummary = async () => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    setShowSummaryDrawer(true);
    try {
      const summary = await generateChatSummary(messages);
      setChatSummary(summary);
    } catch (err) {
      console.error("AI Summary generation failed:", err);
      setChatSummary("Could not generate summary. Please ensure there are enough conversational messages.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Scroll listener to detect when user scrolls up to review previous responses
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isUp = distanceFromBottom > 100;
    setIsUserScrolledUp(isUp);
    if (!isUp) {
      setHasNewMessagesBelow(false);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setIsUserScrolledUp(false);
      setHasNewMessagesBelow(false);
    }
  }, []);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Toggle Voice Dictation / Speech Recognition
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceNotice("Speech recognition is not supported in this browser. You can still use Live Mode for voice.");
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice("Listening... Speak clearly into your microphone.");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          onInputChange(input ? `${input.trim()} ${finalTranscript}` : finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceNotice("Microphone permission denied. Please allow microphone access in browser settings.");
        } else if (event.error !== 'no-speech') {
          setVoiceNotice(`Speech error: ${event.error}`);
        }
        setTimeout(() => setVoiceNotice(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceNotice(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      setVoiceNotice("Could not start voice recognition. " + (err?.message || ''));
      setTimeout(() => setVoiceNotice(null), 4000);
    }
  };

  // Smart auto-scroll: only scrolls to bottom if user is not scrolled up reading previous responses
  useEffect(() => {
    if (!scrollRef.current) return;
    
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (!isUserScrolledUp) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else if (isNewMessage || isLoading) {
      setHasNewMessagesBelow(true);
    }
  }, [messages, isLoading, isUserScrolledUp]);

  // Keyboard shortcut focus
  useEffect(() => {
    const handleLocalKeyDown = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        if (s.id === 'focus_input') {
          const k = s.keys;
          if (
            e.key.toLowerCase() === k.key.toLowerCase() && 
            !!e.altKey === !!k.alt &&
            !!e.ctrlKey === !!k.ctrl &&
            !!e.shiftKey === !!k.shift &&
            !!e.metaKey === !!k.meta
          ) {
            e.preventDefault();
            textareaRef.current?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleLocalKeyDown);
    return () => window.removeEventListener('keydown', handleLocalKeyDown);
  }, [shortcuts]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isAtMenuOpen) {
      e.preventDefault();
      setShowAtAppMenu(false);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };
  
  const handleExportWord = async (content: string, title?: string) => {
    try {
      setDocNotification('Generating Word document (.docx)...');
      await downloadWordFromMarkdown(title || currentSessionTitle || `${activeModel.name} Document`, content);
      setDocNotification('Word document (.docx) downloaded!');
      setTimeout(() => setDocNotification(null), 3000);
    } catch (err) {
      console.error(err);
      setDocNotification('Failed to generate Word document');
      setTimeout(() => setDocNotification(null), 3000);
    }
  };

  const handleExportPptx = async (content: string, title?: string) => {
    try {
      setDocNotification('Generating PowerPoint slides (.pptx)...');
      await downloadPptxFromMarkdown(title || currentSessionTitle || `${activeModel.name} Presentation`, content);
      setDocNotification('PowerPoint slides (.pptx) downloaded!');
      setTimeout(() => setDocNotification(null), 3000);
    } catch (err) {
      console.error(err);
      setDocNotification('Failed to generate presentation');
      setTimeout(() => setDocNotification(null), 3000);
    }
  };

  const handleExportMarkdown = (content: string, title?: string) => {
    const filename = `${(title || currentSessionTitle || 'response').toLowerCase().replace(/[^a-z0-9_-]+/g, '_')}.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDocNotification('Markdown (.md) downloaded!');
    setTimeout(() => setDocNotification(null), 2500);
  };

  const handleDownloadArchiveFromCard = async (archiveAttachment: NonNullable<Message['archiveAttachment']>, format: 'zip' | 'tar') => {
    try {
      setDocNotification(`Packaging files into .${format}...`);
      const fileEntries = archiveAttachment.files.map(f => ({
        path: f.name,
        name: f.name.split('/').pop() || f.name,
        size: f.size,
        isDirectory: false,
        isText: f.isText,
        content: f.textPreview || '',
      }));
      if (format === 'zip') {
        await packZipArchive(fileEntries, archiveAttachment.name.replace(/\.[^.]+$/, '') + '.zip');
      } else {
        await packTarArchive(fileEntries, archiveAttachment.name.replace(/\.[^.]+$/, '') + '.tar');
      }
      setDocNotification(`Archive (.${format}) downloaded!`);
      setTimeout(() => setDocNotification(null), 3000);
    } catch (err) {
      console.error(err);
      setDocNotification(`Failed to download .${format}`);
      setTimeout(() => setDocNotification(null), 3000);
    }
  };

  const handleDriveImportSuccess = (file: { name: string; mimeType: string; content: string }) => {
    const importedText = `📄 [IMPORTED FROM GOOGLE DRIVE: ${file.name}]\nMIME Type: ${file.mimeType}\n\n--- DOCUMENT CONTENT START ---\n${file.content.slice(0, 18000)}\n--- DOCUMENT CONTENT END ---\n\nPlease analyze this Google Drive document.`;
    onInputChange(importedText);
    setDocNotification(`Imported "${file.name}" from Google Drive into prompt!`);
    setTimeout(() => setDocNotification(null), 4500);
  };

  const handleSlashCommand = (cmdText: string): boolean => {
    const trimmed = cmdText.trim();
    if (!trimmed.startsWith('/')) return false;

    trackAppCommandExecuted();
    const lower = trimmed.toLowerCase();

    if (lower === '/drive' || lower.startsWith('/drive ')) {
      setShowDriveModal(true);
      onInputChange('');
      return true;
    }
    if (lower === '/stats' || lower === '/usage' || lower.startsWith('/stats ') || lower.startsWith('/usage ')) {
      if (onOpenSettings) onOpenSettings('usage');
      onInputChange('');
      return true;
    }
    if (lower === '/settings' || lower.startsWith('/settings ')) {
      if (onOpenSettings) onOpenSettings('general');
      onInputChange('');
      return true;
    }
    if (lower === '/clear' || lower === '/new') {
      if (onNewChat) onNewChat();
      onInputChange('');
      return true;
    }
    if (lower === '/export') {
      if (onDownloadChat) onDownloadChat();
      onInputChange('');
      return true;
    }
    if (lower === '/research') {
      if (onToggleResearch) onToggleResearch();
      onInputChange('');
      return true;
    }
    if (lower === '/think') {
      if (onToggleThink) onToggleThink();
      onInputChange('');
      return true;
    }
    if (lower === '/study') {
      if (onToggleStudy) onToggleStudy();
      onInputChange('');
      return true;
    }
    if (lower === '/council') {
      if (onToggleCouncil) onToggleCouncil();
      onInputChange('');
      return true;
    }
    if (lower === '/camera') {
      setShowCamera(true);
      onInputChange('');
      return true;
    }
    if (lower === '/help' || lower === '/commands') {
      setDocNotification("Commands: /drive, /stats, /settings, /image <prompt>, /research, /think, /study, /council, /camera, /clear, /export");
      setTimeout(() => setDocNotification(null), 8000);
      onInputChange('');
      return true;
    }
    return false;
  };

  const handleSendClick = async () => {
    if (!input.trim() && !pendingAttachment && !pendingArchive) return;
    
    // Stop voice listening if active
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
    }

    const trimmed = input.trim();

    // Check if app command or slash command was entered
    if (handleSlashCommand(trimmed)) {
      return;
    }

    // Check if Image Generation Mode or /image command was used
    const isImageCommand = trimmed.startsWith('/image ') || trimmed.startsWith('/draw ') || trimmed.startsWith('/generate ');
    if ((imageGenMode || isImageCommand) && onGenerateImage) {
      const promptOnly = isImageCommand ? trimmed.replace(/^\/(image|draw|generate)\s+/i, '') : trimmed;
      setImageGenMode(false);
      await onGenerateImage(promptOnly, {
        stylePrompt: imageGenStyle,
        aspectRatio: imageGenAspect
      });
      return;
    }

    setIsUserScrolledUp(false);
    setHasNewMessagesBelow(false);

    let archiveAttachmentData: Message['archiveAttachment'] | undefined = undefined;
    if (pendingArchive) {
      archiveAttachmentData = {
        name: pendingArchive.filename,
        totalFiles: pendingArchive.files.length,
        totalSize: pendingArchive.totalSize,
        format: pendingArchive.type === 'tar' || pendingArchive.type === 'tgz' ? 'tar' : 'zip',
        files: pendingArchive.files.map(f => ({
          name: f.path,
          size: f.size,
          isText: f.isText,
          textPreview: f.content?.slice(0, 3000)
        }))
      };
    }

    onSend(pendingAttachment, archiveAttachmentData || null);
    setPendingAttachment(null);
    setPendingArchive(null);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 40);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isArchive =
        /\.(zip|tar|tar\.gz|tgz)$/i.test(file.name) ||
        file.type === 'application/zip' ||
        file.type === 'application/x-tar' ||
        file.type === 'application/gzip' ||
        file.type === 'application/x-gzip';

      if (isArchive) {
        setIsUnpackingArchive(true);
        unpackArchive(file, file.name)
          .then((pkg) => {
            setPendingArchive(pkg);
            setDocNotification(`Loaded archive "${pkg.filename}" (${pkg.files.length} files) into chat`);
            setTimeout(() => setDocNotification(null), 3500);
          })
          .catch((err) => {
            console.error('Failed to unpack archive:', err);
            setDocNotification('Failed to read archive');
            setTimeout(() => setDocNotification(null), 3000);
          })
          .finally(() => {
            setIsUnpackingArchive(false);
          });

        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowUploadMenu(false);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setPendingAttachment({
          mimeType: file.type || 'application/octet-stream',
          data: base64Data
        });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowUploadMenu(false);
  };

  const handlePlayAudio = (msgId: string, text: string) => {
    if (audibleMessage?.id === msgId) {
      setAudibleMessage(null);
    } else {
      setAudibleMessage({ id: msgId, text });
    }
  };

  const handleRunCode = (code: string) => {
    let finalCode = code;
    if (!code.includes('<!DOCTYPE html>') && !code.includes('<html>')) {
      finalCode = `
      <!DOCTYPE html>
      <html>
      <head><style>body { font-family: sans-serif; padding: 16px; margin: 0; }</style></head>
      <body>${code}</body>
      </html>`;
    }
    setCanvasCode(finalCode);
    setCanvasOpen(true);
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleStartEditMessage = (msg: Message, content: string) => {
    setEditingMsgId(msg.id);
    setEditMessageText(content);
  };

  const handleSaveMessageEdit = (msgId: string, role: string, regenerate: boolean) => {
    if (onEditMessage && editMessageText.trim()) {
      onEditMessage(msgId, editMessageText.trim(), role === 'user' ? regenerate : false);
    }
    setEditingMsgId(null);
  };

  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30)}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const starterPrompts = [
    { label: "Create 3D Pixar Avatar", prompt: "/image A cute futuristic robotic companion in Disney Pixar 3D animated style, expressive glowing eyes, cinematic volumetric light" },
    { label: "Architecture Audit", prompt: "Audit the scalability and latency bottlenecks of a modern distributed microservices architecture." },
    { label: "Deep Python Script", prompt: "Write an asynchronous Python script using asyncio and httpx to stream and process real-time telemetry." },
    { label: "Cyberpunk Cityscape", prompt: "/image A rainy neon cyberpunk city boulevard at midnight with flying vehicles and holographic advertisements, 8k resolution" }
  ];

  // Preset styles for in-chat image generator
  const IMAGE_STYLES = [
    { label: 'Photorealistic', prompt: 'Photorealistic, hyper-detailed 8k resolution, cinematic lighting' },
    { label: 'Anime / Manga', prompt: 'Vibrant modern Japanese anime style, clean line art, studio anime aesthetic' },
    { label: '3D Disney / Pixar', prompt: 'Disney Pixar 3D animated character render, subsurface scattering, vivid colors' },
    { label: 'Minimalist Sketch', prompt: 'Minimalist black and white graphite pencil sketch, fine line art illustration' },
    { label: "'80s Retro Flash", prompt: 'Authentic 1980s color flash photography, retro film grain, warm nostalgic lighting' },
    { label: 'Cyberpunk Neon', prompt: 'Cyberpunk aesthetic, glowing neon lights, rain reflections, volumetric fog' },
    { label: 'Watercolor Art', prompt: 'Soft delicate watercolor painting with textured paper bleeding edges' }
  ];

  // Helper for real-time token count and interaction cost calculation
  const calculateMessageTokens = (msg: Message, baseModel: string) => {
    const textChars = msg.content ? msg.content.length : 0;
    let tokens = Math.max(1, Math.round(textChars / 3.8));
    if (msg.attachment) tokens += 258;
    if (msg.generatedImage) tokens += 1200;

    const isPro = baseModel.toLowerCase().includes('pro');
    const ratePerToken = isPro ? 1.25 / 1000000 : 0.075 / 1000000;
    const cost = tokens * ratePerToken;

    return {
      tokens,
      cost: cost < 0.00001 ? '<$0.0001' : `$${cost.toFixed(5)}`,
      rawCost: cost
    };
  };

  // Calculate session-wide aggregate token statistics
  const sessionTotalTokens = messages.reduce((acc, m) => {
    const info = calculateMessageTokens(m, activeModel.baseModel);
    return acc + info.tokens;
  }, 0);

  const sessionTotalCostRaw = messages.reduce((acc, m) => {
    const info = calculateMessageTokens(m, activeModel.baseModel);
    return acc + info.rawCost;
  }, 0);

  const sessionTotalCost = sessionTotalCostRaw < 0.00001 ? '<$0.0001' : `$${sessionTotalCostRaw.toFixed(4)}`;

  const renderMenuCategories = () => (
    <div className="divide-y divide-white/10 text-xs">
      {/* Quick @ App Linking */}
      <div className="pb-2">
        <button
          type="button"
          onClick={() => {
            setShowUploadMenu(false);
            setShowAtAppMenu(true);
          }}
          className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-cyan-500/20 rounded-xl flex items-center justify-between transition-colors group mb-1 border border-cyan-500/30 bg-cyan-950/20"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold font-mono text-sm">
              @
            </div>
            <div>
              <div className="font-semibold text-cyan-200 flex items-center gap-1.5">
                <span>Link App or Tool</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200 font-mono">@ app</span>
              </div>
              <div className="text-[10px] text-neutral-400">Mention Create, Drive, Stats, Permissions & more</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
            Link
          </span>
        </button>
      </div>

      {/* Category 1: Media & Files */}
      <div className="py-2">
        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 py-1">
          Media & Files
        </div>

        {/* Google Drive Import */}
        <button
          type="button"
          onClick={() => {
            setShowDriveModal(true);
            setShowUploadMenu(false);
          }}
          className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors group mb-1"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/25">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 001-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-neutral-100 flex items-center gap-1.5">
                <span>Google Drive Import</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">Workspace</span>
              </div>
              <div className="text-[10px] text-neutral-400">Import Docs, Sheets, Slides for AI</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
            Drive
          </span>
        </button>

        {/* Single Unified Upload Icon */}
        <button
          type="button"
          onClick={() => {
            fileInputRef.current?.click();
            setShowUploadMenu(false);
          }}
          className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/25">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-neutral-100">Upload Files & Archives</div>
              <div className="text-[10px] text-neutral-400">Photos, docs, .zip, .tar</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
            Upload
          </span>
        </button>

        {/* Take Photo */}
        <button
          type="button"
          onClick={() => {
            setShowCamera(true);
            setShowUploadMenu(false);
          }}
          className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-white/10 rounded-xl flex items-center space-x-2.5 transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/25">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div>
            <div className="font-semibold text-neutral-100">Take Photo</div>
            <div className="text-[10px] text-neutral-400">Capture with camera</div>
          </div>
        </button>
      </div>

      {/* Category 2: Creative & Visuals */}
      <div className="py-2">
        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 py-1">
          Creative & Visuals
        </div>

        <button
          type="button"
          onClick={() => {
            setImageGenMode(!imageGenMode);
            setShowUploadMenu(false);
          }}
          className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-neutral-100">Generate Image</div>
              <div className="text-[10px] text-neutral-400">AI visual synthesis</div>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${imageGenMode ? 'bg-amber-400 text-black' : 'text-neutral-400 bg-white/5'}`}>
            {imageGenMode ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Category 3: Document Drafting */}
      <div className="py-2">
        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 py-1">
          Document Drafting
        </div>

        <button
          type="button"
          onClick={() => {
            onInputChange("Please draft a comprehensive, structured Word document with clear headings, analysis, and conclusions on: ");
            setShowUploadMenu(false);
            textareaRef.current?.focus();
          }}
          className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-white/10 rounded-xl flex items-center space-x-2.5 transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/25">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-neutral-100">Draft Word Document</div>
            <div className="text-[10px] text-neutral-400">Structured .docx format</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onInputChange("Please create an executive PowerPoint presentation with slide titles, structured bullets, and key takeaways on: ");
            setShowUploadMenu(false);
            textareaRef.current?.focus();
          }}
          className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-white/10 rounded-xl flex items-center space-x-2.5 transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/25">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-neutral-100">Draft Slide Deck</div>
            <div className="text-[10px] text-neutral-400">Presentation slides .pptx</div>
          </div>
        </button>
      </div>

      {/* Category 4: Intelligence & Reasoning Modes */}
      <div className="pt-2">
        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 py-1">
          Intelligence & Modes
        </div>

        {/* Correction Mode Button */}
        {onToggleCorrectionMode && (
          <button
            type="button"
            onClick={() => {
              onToggleCorrectionMode();
              setShowUploadMenu(false);
            }}
            className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-rose-500/10 rounded-xl flex items-center justify-between transition-colors group mb-1 border border-rose-500/20"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-rose-200">Correction Mode</div>
                <div className="text-[10px] text-rose-300/70">Audit & check if research is wrong</div>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${correctionMode ? 'bg-rose-500 text-white' : 'text-neutral-400 bg-white/5'}`}>
              {correctionMode ? 'ON' : 'OFF'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onToggleResearch();
            setShowUploadMenu(false);
          }}
          className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <div>
              <div className="font-semibold text-neutral-100">
                {searchModeType === 'research' ? 'Deep Research' : 'Web Search'}
              </div>
              <div className="text-[10px] text-neutral-400">
                {searchModeType === 'research' ? 'Questions, video/image links & deep dive' : 'Live search grounding'}
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${researchMode ? 'bg-blue-500 text-white' : 'text-neutral-400 bg-white/5'}`}>
            {researchMode ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Research Mode Sub-selector (Deep Research vs Fast Web Search) */}
        {researchMode && onSelectSearchModeType && (
          <div className="mx-2 my-1.5 p-1.5 bg-black/40 rounded-lg border border-blue-500/20 flex gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => onSelectSearchModeType('web')}
              className={`flex-1 py-1 px-1.5 rounded text-center transition-all ${
                searchModeType === 'web'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Fast Web
            </button>
            <button
              type="button"
              onClick={() => onSelectSearchModeType('research')}
              className={`flex-1 py-1 px-1.5 rounded text-center transition-all ${
                searchModeType === 'research'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Deep Research
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onToggleThink();
            setShowUploadMenu(false);
          }}
          className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <div className="font-semibold text-neutral-100">Deep Think</div>
              <div className="text-[10px] text-neutral-400">Reasoning mode</div>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${thinkMode ? 'bg-purple-500 text-white' : 'text-neutral-400 bg-white/5'}`}>
            {thinkMode ? 'ON' : 'OFF'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onToggleStudy();
            setShowUploadMenu(false);
          }}
          className="w-full text-left px-2.5 py-2 text-xs text-neutral-200 hover:bg-white/10 rounded-xl flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <div>
              <div className="font-semibold text-neutral-100">Study Mode</div>
              <div className="text-[10px] text-neutral-400">Socratic learning</div>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${studyMode ? 'bg-emerald-500 text-white' : 'text-neutral-400 bg-white/5'}`}>
            {studyMode ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Category 5: Quick Draft Formatting */}
      {input.trim().length > 0 && onFormatInput && (
        <div className="pt-2">
          <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-2 py-1">
            Format Prompt
          </div>
          <div className="grid grid-cols-2 gap-1 px-1">
            <button
              type="button"
              onClick={() => {
                onFormatInput('shorten');
                setShowUploadMenu(false);
              }}
              className="text-left px-2 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-200 text-xs font-medium"
            >
              Shorten
            </button>
            <button
              type="button"
              onClick={() => {
                onFormatInput('longer');
                setShowUploadMenu(false);
              }}
              className="text-left px-2 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-200 text-xs font-medium"
            >
              Elaborate
            </button>
            <button
              type="button"
              onClick={() => {
                onFormatInput('simplify');
                setShowUploadMenu(false);
              }}
              className="text-left px-2 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-200 text-xs font-medium"
            >
              Simplify
            </button>
            <button
              type="button"
              onClick={() => {
                onFormatInput('bullets');
                setShowUploadMenu(false);
              }}
              className="text-left px-2 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-200 text-xs font-medium"
            >
              Bullets
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full bg-[var(--app-bg)] relative overflow-hidden">
      
      {showCamera && (
        <CameraModal 
          onCapture={(base64) => setPendingAttachment({ mimeType: 'image/jpeg', data: base64 })}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Main Chat Column */}
      <div className={`flex flex-col h-full transition-all duration-300 ${canvasOpen ? 'w-full lg:w-1/2' : 'w-full'}`}>
        
        {/* Single Unified Header (Mobile-First) */}
        <header className="flex-none h-14 border-b border-[var(--border-color)] flex items-center justify-between px-3 sm:px-4 bg-[var(--sidebar-bg)]/90 backdrop-blur-md sticky top-0 z-20">
          
          <div className="flex items-center space-x-2.5 min-w-0">
            {onToggleSidebar && (
              <button 
                onClick={onToggleSidebar}
                className="lg:hidden text-[var(--text-secondary)] hover:text-white p-1.5 -ml-1 rounded-lg hover:bg-[var(--card-bg)] transition-colors flex-shrink-0"
                title="Open Navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center space-x-2 min-w-0">
              {onNewChat && (
                <button
                  onClick={onNewChat}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all shadow-sm group"
                  title="Start a fresh conversation"
                >
                  <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                  <span className="text-xs font-bold hidden sm:inline">New Chat</span>
                </button>
              )}

              <div className="flex flex-col min-w-0 ml-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[100px] sm:max-w-[200px]">
                    {currentSessionTitle || activeModel.name}
                  </h2>
                  {isForked && (
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-bold border border-purple-500/30 flex items-center gap-1">
                      <BrainCircuit className="w-2.5 h-2.5" />
                      FORKED
                    </span>
                  )}
                </div>
                {timeLeft && (
                  <div className="flex items-center space-x-1 mt-0.5 animate-pulse">
                    <Clock className="w-2.5 h-2.5 text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tight">Expires: {timeLeft}</span>
                  </div>
                )}
              </div>

              {/* Subtle Token Indicator in Header */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTokenInspector(!showTokenInspector)}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg border transition-all text-[10px] font-mono shadow-sm flex-shrink-0 ${
                    tokenStats.percentageUsed > 80 
                      ? 'border-amber-500/50 bg-amber-950/30 text-amber-300' 
                      : 'border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-cyan-300 hover:border-cyan-500/30'
                  }`}
                  title="Session Token Usage"
                >
                  <Zap className="w-2.5 h-2.5 text-cyan-400" />
                  <span className="font-semibold">{formatTokenCount(tokenStats.totalTokens)}</span>
                </button>

                {showTokenInspector && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTokenInspector(false)} />
                    <div className="absolute left-0 top-full mt-2 w-64 bg-[#14141e] border border-[var(--border-color)] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 text-xs backdrop-blur-2xl">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                        <div className="flex items-center space-x-1.5 font-semibold text-neutral-100">
                          <Activity className="w-4 h-4 text-cyan-400" />
                          <span>Token Usage</span>
                        </div>
                        <button onClick={() => setShowTokenInspector(false)} className="text-neutral-400 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1.5 bg-black/40 rounded-xl p-2.5 border border-white/5 font-mono text-[10px]">
                        <div className="flex justify-between text-neutral-400">
                          <span>Usage:</span>
                          <span className="text-cyan-300 font-bold">{tokenStats.percentageUsed}%</span>
                        </div>
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-cyan-500"
                            style={{ width: `${Math.min(100, tokenStats.percentageUsed || 1)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-neutral-400 pt-1">
                          <span>Total:</span>
                          <span className="text-neutral-200">{tokenStats.totalTokens.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">

            {/* Create Tab Quick Switcher */}
            {onOpenCreateTab && (
              <button
                onClick={onOpenCreateTab}
                className="px-2.5 py-1 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 hover:text-white transition-all text-xs flex items-center space-x-1.5 shadow-sm"
                title="Open Create Tab (Images & Art Styles)"
              >
                <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="hidden xs:inline font-semibold">Create</span>
              </button>
            )}

            {/* App Store Tab Quick Switcher */}
            {onOpenAppStore && (
              <button
                onClick={onOpenAppStore}
                className="px-2.5 py-1 rounded-lg border border-blue-500/40 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 hover:text-white transition-all text-xs flex items-center space-x-1.5 shadow-sm"
                title="Open App Store (Gmail, Drive, Sheets, Docs, Calendar, Tasks)"
              >
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="hidden xs:inline font-semibold">Store</span>
              </button>
            )}

            {/* Canvas Toggle */}
            {canvasCode && !canvasOpen && (
              <button 
                onClick={() => setCanvasOpen(true)}
                className="text-xs bg-[var(--card-bg)] hover:bg-[var(--sidebar-bg)] text-[var(--text-primary)] px-2.5 py-1 rounded-full border border-[var(--border-color)] transition-colors"
              >
                Canvas
              </button>
            )}
          </div>
        </header>

        {/* Floating Audible Notification Player (Like ChatGPT Screenshot 2) */}
        {audibleMessage && (
          <AudiblePlayer
            messageId={audibleMessage.id}
            rawText={audibleMessage.text}
            modelName={activeModel.name}
            onClose={() => setAudibleMessage(null)}
          />
        )}

        {/* Out-of-context AI Summary Drawer */}
        {showSummaryDrawer && (
          <div className="border-b border-purple-500/30 bg-purple-950/20 px-4 py-3 animate-in slide-in-from-top-2">
            <div className="max-w-4xl mx-auto flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                    AI Summary
                  </span>
                  {isSummarizing && (
                    <span className="text-xs text-purple-300 animate-pulse font-mono">
                      Generating structured summary out-of-context...
                    </span>
                  )}
                </div>
                {chatSummary && (
                  <div className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--card-bg)]/80 p-3 rounded-xl border border-[var(--border-color)] max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {chatSummary}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {chatSummary && (
                  <button
                    onClick={() => navigator.clipboard.writeText(chatSummary)}
                    className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--card-bg)] text-xs text-[var(--text-secondary)] hover:text-white"
                    title="Copy Summary"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setShowSummaryDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--card-bg)] text-xs text-[var(--text-secondary)] hover:text-white"
                  title="Dismiss Summary"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Messages Area */}
        <div 
          className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 custom-scrollbar relative" 
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-xl mx-auto py-12">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg mb-3" style={{ background: 'var(--accent-bg)' }}>
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                {activeModel.name}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-sm">
                {activeModel.description}
              </p>

              {/* Starter Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
                {starterPrompts.map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onInputChange(starter.prompt);
                      textareaRef.current?.focus();
                    }}
                    className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-[var(--sidebar-bg)] hover:border-cyan-500/40 transition-all text-xs group"
                  >
                    <div className="font-semibold text-[var(--text-primary)] group-hover:text-cyan-400 mb-0.5">
                      {starter.label}
                    </div>
                    <div className="text-[var(--text-secondary)] text-[11px] line-clamp-2">
                      {starter.prompt}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const currentContent = (msg.versions && msg.currentVersionIndex !== undefined) 
                ? msg.versions[msg.currentVersionIndex] 
                : msg.content;
            
            const hasVersions = msg.versions && msg.versions.length > 1;
            const versionIdx = msg.currentVersionIndex || 0;
            const totalVersions = msg.versions?.length || 1;
            const isEditing = editingMsgId === msg.id;

            return (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative max-w-[92%] sm:max-w-[85%] ${msg.role === 'user' ? 'ml-auto' : 'mr-auto group'}`}>
                  
                  {/* Message Bubble Container */}
                  <div 
                    className={`p-3.5 sm:p-4 rounded-2xl shadow-sm overflow-hidden break-words min-w-0 transition-all ${
                      msg.role === 'user' 
                        ? 'rounded-br-sm text-white' 
                        : 'rounded-bl-sm text-[var(--text-primary)] border border-[var(--border-color)]'
                    }`}
                    style={{
                      background: msg.role === 'user' ? 'var(--accent-bg)' : 'var(--card-bg)'
                    }}
                  >
                    {/* User Prompt Attachment */}
                    {msg.attachment && (
                      <div className="mb-2.5">
                        <img 
                          src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} 
                          alt="Attachment" 
                          className="max-h-56 rounded-xl border border-gray-700/50 shadow-md object-contain cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setLightboxImage({
                            url: `data:${msg.attachment!.mimeType};base64,${msg.attachment!.data}`,
                            prompt: msg.content || 'Attached Image'
                          })}
                        />
                      </div>
                    )}

                    {/* In-Chat Archive Attachment Card */}
                    {msg.archiveAttachment && (
                      <div className="mb-3 rounded-xl bg-black/40 border border-amber-500/30 p-3 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-amber-200 flex items-center space-x-1.5">
                                <span>{msg.archiveAttachment.name}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-mono uppercase">
                                  {msg.archiveAttachment.format}
                                </span>
                              </div>
                              <div className="text-[11px] text-neutral-400">
                                {msg.archiveAttachment.totalFiles} files • {(msg.archiveAttachment.totalSize / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadArchiveFromCard(msg.archiveAttachment!, 'zip')}
                              className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors border border-amber-500/30 flex items-center space-x-1"
                              title="Download as .zip"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span>.ZIP</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadArchiveFromCard(msg.archiveAttachment!, 'tar')}
                              className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors border border-amber-500/30 flex items-center space-x-1"
                              title="Download as .tar"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span>.TAR</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setExpandedArchiveMsgId(expandedArchiveMsgId === msg.id ? null : msg.id)}
                              className="px-2 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/15 text-neutral-300 transition-colors border border-white/10"
                            >
                              {expandedArchiveMsgId === msg.id ? 'Hide Files ▲' : 'View Files ▼'}
                            </button>
                          </div>
                        </div>

                        {expandedArchiveMsgId === msg.id && (
                          <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar text-xs font-mono">
                              {msg.archiveAttachment.files.map((file, fIdx) => (
                                <div
                                  key={fIdx}
                                  onClick={() => {
                                    if (file.isText && file.textPreview) {
                                      setActivePreviewFile(activePreviewFile?.path === file.name ? null : { path: file.name, content: file.textPreview });
                                    }
                                  }}
                                  className={`p-1.5 rounded flex items-center justify-between text-xs transition-colors ${
                                    file.isText ? 'cursor-pointer hover:bg-white/10' : ''
                                  } ${activePreviewFile?.path === file.name ? 'bg-amber-500/20 text-amber-200' : 'text-neutral-300'}`}
                                >
                                  <div className="flex items-center space-x-1.5 truncate">
                                    <span>{file.isText ? '📄' : '📦'}</span>
                                    <span className="truncate">{file.name}</span>
                                  </div>
                                  <span className="text-[10px] text-neutral-400 font-mono ml-2">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </span>
                                </div>
                              ))}
                            </div>

                            {activePreviewFile && (
                              <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-neutral-200 max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                <div className="text-[10px] font-bold text-amber-300 pb-1 mb-1 border-b border-white/10">
                                  Preview: {activePreviewFile.path}
                                </div>
                                {activePreviewFile.content}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generated AI Image Card (In-Chat Image Generation) */}
                    {msg.generatedImage && (
                      <div className="mb-3 space-y-2">
                        <div className="relative group/img rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/40">
                          <img 
                            src={msg.generatedImage.url} 
                            alt={msg.generatedImage.prompt}
                            className="w-full h-auto max-h-[420px] object-contain rounded-xl transition-transform duration-200 cursor-pointer"
                            onClick={() => setLightboxImage({
                              url: msg.generatedImage!.url,
                              prompt: msg.generatedImage!.prompt
                            })}
                          />

                          {/* Quick Overlay Action Bar on Hover */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px] p-4">
                            <button
                              onClick={() => setLightboxImage({
                                url: msg.generatedImage!.url,
                                prompt: msg.generatedImage!.prompt
                              })}
                              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-md flex items-center space-x-1.5 transition-all shadow"
                              title="Full Screen Lightbox"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                              <span>View</span>
                            </button>

                            <button
                              onClick={() => downloadImage(msg.generatedImage!.url, msg.generatedImage!.prompt)}
                              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold flex items-center space-x-1.5 transition-all shadow"
                              title="Download Image"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              <span>Download</span>
                            </button>

                            {onSendImageToCreateStudio && (
                              <button
                                onClick={() => onSendImageToCreateStudio(msg.generatedImage!.url, msg.generatedImage!.prompt)}
                                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow"
                                title="Edit and Transform in Create Studio"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                                <span>Studio</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Image Metadata Chips */}
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[10px] text-neutral-400 px-1">
                          <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            Aspect: {msg.generatedImage.aspectRatio || '1:1'}
                          </span>
                          {msg.generatedImage.style && (
                            <span className="truncate max-w-[200px] bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              {msg.generatedImage.style}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Image Generation Loading Animation */}
                    {msg.isImageGeneration && !msg.generatedImage && !msg.isError && (
                      <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex flex-col items-center justify-center space-y-3 my-2">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
                          <svg className="w-6 h-6 text-cyan-300 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-cyan-300">Synthesizing Image with Gemini...</div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">Generating high-resolution artwork</div>
                        </div>
                      </div>
                    )}

                    {/* Inline Message Editor */}
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <textarea
                          value={editMessageText}
                          onChange={(e) => setEditMessageText(e.target.value)}
                          rows={3}
                          className="w-full bg-[var(--background)] text-xs sm:text-sm text-[var(--text-primary)] p-2.5 rounded-xl border border-cyan-500 focus:outline-none leading-relaxed font-mono"
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setEditingMsgId(null)}
                            className="px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:text-white rounded-lg"
                          >
                            Cancel
                          </button>
                          {msg.role === 'user' && (
                            <button
                              onClick={() => handleSaveMessageEdit(msg.id, msg.role, true)}
                              className="px-2.5 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium shadow"
                            >
                              Save & Regenerate
                            </button>
                          )}
                          <button
                            onClick={() => handleSaveMessageEdit(msg.id, msg.role, false)}
                            className="px-2.5 py-1 text-xs bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--sidebar-bg)] text-[var(--text-primary)] rounded-lg font-medium"
                          >
                            Save Text
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.role === 'model' ? (
                          <>
                            <SmartContentRenderer 
                              content={currentContent} 
                              onRunCode={handleRunCode} 
                              onAppLinkClick={handleAppLinkClick}
                            />

                            {/* Rich Sources Viewer, Favicons, Thinking Process & Council Deliberation */}
                            <SourcesViewer 
                              metadata={msg.groundingMetadata}
                              actions={msg.actions}
                              thought={msg.thought}
                              thinkingDurationMs={msg.thinkingDurationMs}
                              thinkingSummary={msg.thinkingSummary}
                              councilMode={councilMode}
                              councilDebate={msg.councilDebate}
                              onToggleCouncil={onToggleCouncil}
                            />
                          </>
                        ) : (
                          <div>
                            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {renderTextWithAppLinks(currentContent, handleAppLinkClick)}
                            </div>
                            {msg.isEdited && (
                              <span className="text-[10px] opacity-75 italic block mt-1">(edited)</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Clean Action Bar Under Bubble */}
                  <div className="mt-1 flex items-center justify-between px-1 text-[11px] text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono opacity-80">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                      {/* Version Navigation */}
                      {msg.role === 'model' && hasVersions && (
                        <div className="flex items-center bg-[var(--card-bg)] rounded-full px-1.5 py-0.5 border border-[var(--border-color)] ml-1">
                          <button 
                            onClick={() => onNavigateVersion(msg.id, 'prev')}
                            disabled={versionIdx === 0}
                            className="text-[var(--text-secondary)] hover:text-white disabled:opacity-30"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <span className="text-[9px] font-mono mx-1">{versionIdx + 1}/{totalVersions}</span>
                          <button 
                            onClick={() => onNavigateVersion(msg.id, 'next')}
                            disabled={versionIdx === totalVersions - 1}
                            className="text-[var(--text-secondary)] hover:text-white disabled:opacity-30"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Copy, Edit, Fork, Retry, Audio, and Consolidated More Options */}
                    <div className="flex items-center space-x-1 relative">
                      {/* Copy */}
                      <button 
                        onClick={() => handleCopyMessage(msg.id, currentContent)}
                        className="p-1 rounded hover:bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-white transition-colors"
                        title="Copy text"
                      >
                        {copiedMsgId === msg.id ? (
                          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>

                      {/* Edit Message Button */}
                      {onEditMessage && !isEditing && (
                        <button
                          onClick={() => handleStartEditMessage(msg, currentContent)}
                          className="p-1 rounded hover:bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-cyan-400 transition-colors"
                          title="Edit message"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}

                      {/* Fork Conversation */}
                      {onForkFromMessage && (
                        <button
                          onClick={() => onForkFromMessage(msg.id)}
                          className="p-1 rounded hover:bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-purple-400 transition-colors"
                          title="Fork conversation from here"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                          </svg>
                        </button>
                      )}

                      {/* Retry */}
                      {msg.role === 'model' && !isLoading && (
                        <button 
                          onClick={() => onRetry(msg.id)}
                          className="p-1 rounded hover:bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-white transition-colors"
                          title="Regenerate"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      )}
                      
                      {/* Audio Speak */}
                      {msg.role === 'model' && !msg.isError && (
                        <button 
                          onClick={() => handlePlayAudio(msg.id, currentContent)}
                          className={`p-1 rounded hover:bg-[var(--card-bg)] transition-colors ${
                            audibleMessage?.id === msg.id ? 'text-cyan-300' : 'text-[var(--text-secondary)] hover:text-cyan-400'
                          }`}
                          title="Read aloud"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        </button>
                      )}

                      {/* Unified More Options Dropdown Menu for Model Messages */}
                      {msg.role === 'model' && !msg.isError && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveToolsMenuMsgId(activeToolsMenuMsgId === msg.id ? null : msg.id)}
                            className={`p-1 rounded hover:bg-[var(--card-bg)] transition-all ${
                              activeToolsMenuMsgId === msg.id 
                                ? 'bg-cyan-500/20 text-cyan-300' 
                                : 'text-[var(--text-secondary)] hover:text-white'
                            }`}
                            title="More options, formatting & audit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>

                          {/* Dropdown Menu Modal - Opens Upwards */}
                          {activeToolsMenuMsgId === msg.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={() => setActiveToolsMenuMsgId(null)} 
                              />
                              <div className="absolute right-0 bottom-full mb-1.5 w-64 max-w-[calc(100vw-32px)] max-h-[380px] overflow-y-auto bg-[#181822] border border-white/20 rounded-2xl shadow-2xl p-2.5 z-40 text-xs animate-in fade-in slide-in-from-bottom-1 backdrop-blur-2xl custom-scrollbar">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1 border-b border-white/10 flex items-center justify-between">
                                  <span>Message Options</span>
                                  <span className="text-[9px] text-cyan-400 font-mono">Tools</span>
                                </div>

                              {/* Formatting Actions */}
                              <div className="py-1 space-y-0.5">
                                <button
                                  onClick={() => {
                                    if (onFormatMessage) onFormatMessage(msg.id, 'shorten');
                                    setActiveToolsMenuMsgId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/15 text-neutral-200 hover:text-cyan-300 flex items-center justify-between transition-colors group"
                                >
                                  <span className="font-medium">Make Shorter</span>
                                  <span className="text-[10px] text-neutral-500 group-hover:text-cyan-400 font-mono">Trim</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (onFormatMessage) onFormatMessage(msg.id, 'longer');
                                    setActiveToolsMenuMsgId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/15 text-neutral-200 hover:text-cyan-300 flex items-center justify-between transition-colors group"
                                >
                                  <span className="font-medium">Make Longer</span>
                                  <span className="text-[10px] text-neutral-500 group-hover:text-cyan-400 font-mono">Expand</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (onFormatMessage) onFormatMessage(msg.id, 'simplify');
                                    setActiveToolsMenuMsgId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/15 text-neutral-200 hover:text-cyan-300 flex items-center justify-between transition-colors group"
                                >
                                  <span className="font-medium">Simplify (ELI5)</span>
                                  <span className="text-[10px] text-neutral-500 group-hover:text-cyan-400 font-mono">Plain</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (onFormatMessage) onFormatMessage(msg.id, 'bullets');
                                    setActiveToolsMenuMsgId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/15 text-neutral-200 hover:text-cyan-300 flex items-center justify-between transition-colors group"
                                >
                                  <span className="font-medium">Convert to Bullets</span>
                                  <span className="text-[10px] text-neutral-500 group-hover:text-cyan-400 font-mono">List</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (onFormatMessage) onFormatMessage(msg.id, 'professional');
                                    setActiveToolsMenuMsgId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/15 text-neutral-200 hover:text-cyan-300 flex items-center justify-between transition-colors group"
                                >
                                  <span className="font-medium">Professional Tone</span>
                                  <span className="text-[10px] text-neutral-500 group-hover:text-cyan-400 font-mono">Pro</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (onFormatMessage) onFormatMessage(msg.id, 'summarize');
                                    setActiveToolsMenuMsgId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/15 text-neutral-200 hover:text-cyan-300 flex items-center justify-between transition-colors group"
                                >
                                  <span className="font-medium">Executive Summary</span>
                                  <span className="text-[10px] text-neutral-500 group-hover:text-cyan-400 font-mono">TL;DR</span>
                                </button>
                              </div>

                              {/* Correction Mode Verification Audit */}
                              {onRunCorrection && (
                                <div className="pt-1.5 pb-1 border-t border-white/10">
                                  <button
                                    onClick={() => {
                                      onRunCorrection(msg.id, currentContent);
                                      setActiveToolsMenuMsgId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 flex items-center justify-between transition-colors group"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="font-semibold text-rose-200">Audit in Correction Mode</span>
                                    </div>
                                    <span className="text-[10px] text-rose-400 font-mono">Verify</span>
                                  </button>
                                </div>
                              )}

                              {/* Document Exports */}
                              <div className="pt-1.5 mt-1 border-t border-white/10">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 pb-1">
                                  Export Document
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                  <button
                                    onClick={() => {
                                      handleExportWord(currentContent);
                                      setActiveToolsMenuMsgId(null);
                                    }}
                                    className="px-2 py-1.5 rounded-lg bg-blue-950/40 border border-blue-500/30 hover:bg-blue-900/60 text-blue-300 text-[11px] flex flex-col items-center justify-center font-medium transition-colors"
                                  >
                                    <span className="font-semibold">Word</span>
                                    <span className="text-[9px] opacity-70">.docx</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleExportPptx(currentContent);
                                      setActiveToolsMenuMsgId(null);
                                    }}
                                    className="px-2 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/60 text-amber-300 text-[11px] flex flex-col items-center justify-center font-medium transition-colors"
                                  >
                                    <span className="font-semibold">Slides</span>
                                    <span className="text-[9px] opacity-70">.pptx</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleExportMarkdown(currentContent);
                                      setActiveToolsMenuMsgId(null);
                                    }}
                                    className="px-2 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/60 text-emerald-300 text-[11px] flex flex-col items-center justify-center font-medium transition-colors"
                                  >
                                    <span className="font-semibold">Markdown</span>
                                    <span className="text-[9px] opacity-70">.md</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[var(--card-bg)] px-3.5 py-2.5 rounded-2xl rounded-bl-sm border border-[var(--border-color)] flex space-x-1.5 items-center shadow-md">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <span className="text-xs text-[var(--text-secondary)] font-mono ml-1.5">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Jump to Latest / Back to Bottom Button */}
        {isUserScrolledUp && (
          <div className="relative w-full flex justify-center z-30 pointer-events-none">
            <button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto absolute -top-12 px-4 py-2 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-2xl flex items-center space-x-2 backdrop-blur-md border border-cyan-400/50 hover:scale-105 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-2"
            >
              <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span>{hasNewMessagesBelow ? 'New response below ↓' : 'Back to Latest ↓'}</span>
            </button>
          </div>
        )}

        {/* Floating Mobile-First ChatGPT-Style Input Dock */}
        <div className="flex-none p-2.5 sm:p-4 bg-gradient-to-t from-[var(--app-bg)] via-[var(--app-bg)] to-transparent">
          <div className="max-w-3xl mx-auto space-y-2 relative">
            
            {/* Active Voice Listening Banner */}
            {isListening && (
              <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-2.5 flex items-center justify-between shadow-xl backdrop-blur-md animate-pulse">
                <div className="flex items-center space-x-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-semibold text-emerald-300">Listening to your voice... Speak now</span>
                </div>
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow"
                >
                  Done Speaking
                </button>
              </div>
            )}

            {/* Voice Notice / Permission Alert */}
            {voiceNotice && !isListening && (
              <div className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center justify-between">
                <span>{voiceNotice}</span>
                <button onClick={() => setVoiceNotice(null)} className="text-neutral-400 hover:text-white ml-2">✕</button>
              </div>
            )}

            {/* In-Chat Image Generation Mode Settings Panel */}
            {imageGenMode && (
              <div className="bg-[#18181f] border border-cyan-500/40 rounded-2xl p-3 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <span className="text-xs font-bold text-cyan-300">Generate Image Mode</span>
                  </div>
                  <button 
                    onClick={() => setImageGenMode(false)}
                    className="text-xs text-neutral-400 hover:text-white p-1 rounded hover:bg-white/10"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Style Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Style Preset</label>
                    <select
                      value={imageGenStyle}
                      onChange={(e) => setImageGenStyle(e.target.value)}
                      className="w-full bg-[#24242e] text-xs text-neutral-200 p-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-400"
                    >
                      {IMAGE_STYLES.map((st, i) => (
                        <option key={i} value={st.prompt}>{st.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Aspect Ratio Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Aspect Ratio</label>
                    <div className="flex items-center gap-1">
                      {(['1:1', '16:9', '9:16', '4:3'] as const).map((aspect) => (
                        <button
                          key={aspect}
                          type="button"
                          onClick={() => setImageGenAspect(aspect)}
                          className={`flex-1 py-1 text-[11px] rounded-lg font-mono font-medium transition-all ${
                            imageGenAspect === aspect
                              ? 'bg-cyan-500 text-black font-bold shadow'
                              : 'bg-[#24242e] text-neutral-300 hover:bg-white/10 border border-white/10'
                          }`}
                        >
                          {aspect}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Mode Badges (Clean icons, no emojis, compact for mobile) */}
            {(researchMode || thinkMode || studyMode || councilMode || correctionMode || imageGenMode) && (
              <div className="flex items-center gap-1.5 px-2 flex-wrap">
                {correctionMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-sm">
                    <svg className="w-3 h-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Correction Mode</span>
                    {onToggleCorrectionMode && <button onClick={onToggleCorrectionMode} className="hover:text-white ml-0.5">✕</button>}
                  </span>
                )}
                {imageGenMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm">
                    <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Create Image</span>
                    <button onClick={() => setImageGenMode(false)} className="hover:text-white ml-0.5">✕</button>
                  </span>
                )}
                {councilMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse">
                    <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Council Debate</span>
                    {onToggleCouncil && <button onClick={onToggleCouncil} className="hover:text-white ml-0.5">✕</button>}
                  </span>
                )}
                {researchMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-sm">
                    <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>{searchModeType === 'research' ? 'Deep Research' : 'Web Search'}</span>
                    <button onClick={onToggleResearch} className="hover:text-white ml-0.5">✕</button>
                  </span>
                )}
                {thinkMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-sm">
                    <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Deep Think</span>
                    <button onClick={onToggleThink} className="hover:text-white ml-0.5">✕</button>
                  </span>
                )}
                {studyMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Study Mode</span>
                    <button onClick={onToggleStudy} className="hover:text-white ml-0.5">✕</button>
                  </span>
                )}
              </div>
            )}

            {/* Pending Attachment Preview */}
            {pendingAttachment && (
              <div className="bg-[var(--card-bg)] rounded-2xl p-2 border border-[var(--border-color)] flex items-center justify-between shadow-xl max-w-sm">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <img 
                    src={`data:${pendingAttachment.mimeType};base64,${pendingAttachment.data}`} 
                    className="h-10 w-10 object-cover rounded-xl border border-[var(--border-color)] flex-shrink-0" 
                    alt="Preview" 
                  />
                  <span className="text-xs text-[var(--text-secondary)] truncate">Image attached</span>
                </div>
                <button 
                  onClick={() => setPendingAttachment(null)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-[var(--background)] rounded-full transition-colors"
                  title="Remove image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            {/* Pending Archive Preview Pill */}
            {pendingArchive && (
              <div className="bg-amber-500/15 rounded-2xl p-2.5 border border-amber-500/30 flex items-center justify-between shadow-xl max-w-md">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-amber-200 truncate">
                      {pendingArchive.filename}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {pendingArchive.files.length} files • {(pendingArchive.totalSize / 1024).toFixed(1)} KB uncompressed
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPendingArchive(null)}
                  className="p-1 text-amber-300 hover:text-white hover:bg-amber-500/20 rounded-full transition-colors ml-2"
                  title="Remove archive"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            {/* Unpacking Archive Loading Indicator */}
            {isUnpackingArchive && (
              <div className="bg-amber-950/60 rounded-xl p-2 border border-amber-500/40 flex items-center space-x-2 text-xs text-amber-200 animate-pulse">
                <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <span>Reading archive contents into chat...</span>
              </div>
            )}

            {/* In-Chat Notification Toast */}
            {docNotification && (
              <div className="bg-neutral-900/90 backdrop-blur-md rounded-xl px-3 py-1.5 border border-cyan-500/40 flex items-center space-x-2 text-xs text-cyan-200 shadow-lg animate-in fade-in slide-in-from-bottom-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>{docNotification}</span>
              </div>
            )}

            {/* Active Linked Apps Pill Bar */}
            {detectedLinkedMentions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap px-3 py-1.5 mb-2 bg-[#14141e]/80 border border-cyan-500/30 rounded-2xl backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-bottom-1">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  Linked:
                </span>
                {detectedLinkedMentions.map((mention) => (
                  <LinkedAppPill
                    key={mention}
                    mention={mention}
                    onRemove={() => handleRemoveLinkedMention(mention)}
                    onClick={() => handleAppLinkClick(mention)}
                  />
                ))}
              </div>
            )}

            {/* Main Rounded Input Pill (Like ChatGPT Mobile Screenshot 2) */}
            <div className="relative bg-[var(--card-bg)] rounded-3xl border border-[var(--border-color)] focus-within:border-white/30 transition-all shadow-xl flex items-end p-1.5 sm:p-2">
              
              <input 
                type="file" 
                accept="*/*" 
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Plus Button on Left */}
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowUploadMenu(!showUploadMenu)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    showUploadMenu || pendingAttachment || pendingArchive
                      ? 'bg-white/20 text-white rotate-45'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
                  }`}
                  title="Add attachment or features (+)"
                >
                  <Plus className="w-5 h-5 transition-transform duration-200" />
                </button>

                {/* Options Menu: Desktop Floating Upwards + Mobile Native Bottom Sheet */}
                {showUploadMenu && (
                  <>
                    {/* Backdrop Overlay for Both Mobile & Desktop to close cleanly on click outside */}
                    <div 
                      className="fixed inset-0 bg-black/60 sm:bg-transparent z-40 backdrop-blur-sm sm:backdrop-blur-none"
                      onClick={() => setShowUploadMenu(false)}
                    />

                    {/* Mobile Native Bottom Sheet Drawer */}
                    <div className="fixed inset-x-0 bottom-0 z-50 p-4 bg-[#14141e] border-t border-white/20 rounded-t-3xl shadow-2xl max-h-[75vh] overflow-y-auto sm:hidden animate-in slide-in-from-bottom duration-200 custom-scrollbar pb-8">
                      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                        <span className="font-semibold text-neutral-200 text-sm tracking-wide">Options & Tools</span>
                        <button
                          type="button"
                          onClick={() => setShowUploadMenu(false)}
                          className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {renderMenuCategories()}
                    </div>

                    {/* Desktop Floating Menu - Anchored Upwards with Viewport-Safe Max Height */}
                    <div className="hidden sm:block absolute bottom-full left-0 mb-2.5 bg-[#181822] border border-white/20 rounded-2xl shadow-2xl p-2.5 w-80 max-w-[calc(100vw-32px)] max-h-[min(480px,calc(100vh-140px))] overflow-y-auto z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 custom-scrollbar">
                      {renderMenuCategories()}
                    </div>
                  </>
                )}
              </div>

              {/* @ App Linking Button */}
              <div className="relative flex-shrink-0 ml-0.5">
                <button
                  type="button"
                  onClick={() => setShowAtAppMenu(!showAtAppMenu)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm transition-all ${
                    showAtAppMenu || isAtMenuOpen
                      ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                      : 'text-[var(--text-secondary)] hover:text-cyan-300 hover:bg-white/10'
                  }`}
                  title="Link an App or Tool (@ App)"
                >
                  @
                </button>
              </div>

              {/* @ App Linking Autocomplete Popover */}
              {isAtMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAtAppMenu(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-3 w-full max-w-lg z-50">
                    <AppLinkingMenu
                      filterQuery={currentAtMentionQuery || ''}
                      onSelectApp={handleSelectApp}
                      onClose={() => setShowAtAppMenu(false)}
                    />
                  </div>
                </>
              )}

              {/* App Commands Slash Autocomplete Popover */}
              {input.trim().startsWith('/') && (
                <div className="absolute bottom-full left-0 mb-2.5 w-full max-w-md bg-[#161622]/95 border border-cyan-500/30 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 custom-scrollbar max-h-60 overflow-y-auto">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-2 py-1 border-b border-white/10 mb-1 flex items-center justify-between">
                    <span>App Commands</span>
                    <span className="text-neutral-500 font-mono">Select or type</span>
                  </div>
                  {[
                    { cmd: '/drive', label: 'Import Google Drive', desc: 'Browse Docs, Sheets, Slides' },
                    { cmd: '/stats', label: 'Usage & AI Use Stats', desc: 'View token & API statistics' },
                    { cmd: '/image', label: 'Generate AI Image', desc: 'Create visuals with Gemini' },
                    { cmd: '/research', label: 'Toggle Research Mode', desc: 'Enable live web research' },
                    { cmd: '/think', label: 'Toggle Deep Think', desc: 'Multi-step reasoning engine' },
                    { cmd: '/study', label: 'Toggle Study Mode', desc: 'Socratic learning assistant' },
                    { cmd: '/council', label: 'Toggle Council Debate', desc: 'Multi-expert deliberation' },
                    { cmd: '/camera', label: 'Open Camera', desc: 'Take photo with camera' },
                    { cmd: '/clear', label: 'New Conversation', desc: 'Clear history & start fresh' },
                    { cmd: '/settings', label: 'Open Settings', desc: 'Configure system settings' },
                    { cmd: '/export', label: 'Export Transcript', desc: 'Download chat document' },
                    { cmd: '/help', label: 'Commands List', desc: 'Show all app slash commands' },
                  ]
                  .filter(item => item.cmd.toLowerCase().startsWith(input.trim().toLowerCase().split(' ')[0]))
                  .map((item) => (
                    <button
                      key={item.cmd}
                      type="button"
                      onClick={() => handleSlashCommand(item.cmd)}
                      className="w-full text-left px-3 py-1.5 rounded-xl text-xs hover:bg-cyan-500/20 hover:text-white text-neutral-200 flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded text-[11px] group-hover:bg-cyan-500 group-hover:text-black">
                          {item.cmd}
                        </span>
                        <span className="font-medium text-neutral-200">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 truncate max-w-[150px]">{item.desc}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={imageGenMode ? "Describe the image you want to create (e.g. A futuristic glass city...)" : `Ask ${activeModel.name}... (or type /image)`}
                className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] py-2 px-2.5 max-h-32 min-h-[38px] outline-none resize-none text-sm leading-relaxed custom-scrollbar"
                rows={1}
                disabled={isLoading}
              />

              {/* Right Action Buttons */}
              <div className="flex-shrink-0 flex items-center space-x-1 pl-1">
                
                {/* Voice Dictation (Speech to Text) Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`px-3 h-9 rounded-full flex items-center justify-center space-x-1.5 transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-lg ring-2 ring-red-400'
                      : 'bg-cyan-500/10 text-cyan-400 hover:text-white hover:bg-cyan-500/30'
                  }`}
                  title={isListening ? "Stop voice dictation" : "Dictate with voice"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-[10px] font-bold hidden xs:inline">STT</span>
                </button>

                {/* Send / Stop / Live Mode Button */}
                {isLoading ? (
                  <button
                    type="button"
                    onClick={onStop}
                    className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow"
                    title="Stop generation"
                  >
                    <div className="w-3 h-3 bg-black rounded-sm"></div>
                  </button>
                ) : input.trim() || pendingAttachment ? (
                  <button
                    type="button"
                    onClick={handleSendClick}
                    className={`w-9 h-9 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow font-bold ${
                      imageGenMode ? 'bg-cyan-400 text-black' : 'bg-white text-black'
                    }`}
                    title={imageGenMode ? "Generate Image" : "Send message"}
                  >
                    {imageGenMode ? (
                      <AppIcon name="Sparkles" className="w-4 h-4 text-black" />
                    ) : (
                      <AppIcon name="Send" className="w-4 h-4 text-black" />
                    )}
                  </button>
                ) : (
                  /* Live Voice Conversation Mode */
                  <button
                    type="button"
                    onClick={onStartLiveMode}
                    className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                    title="Start Live Voice Conversation"
                  >
                    <div className="flex items-center justify-center space-x-0.5 h-4">
                      <span className="w-0.5 h-2.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-0.5 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                      <span className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                    </div>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Prompt and Close */}
            <div className="w-full flex items-center justify-between text-white mb-2.5 px-2">
              <p className="text-xs text-neutral-300 font-mono truncate max-w-lg">{lightboxImage.prompt}</p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadImage(lightboxImage.url, lightboxImage.prompt)}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold rounded-lg shadow"
                >
                  Download
                </button>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 text-sm font-bold px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Image */}
            <img 
              src={lightboxImage.url} 
              alt={lightboxImage.prompt}
              className="max-h-[80vh] w-auto object-contain rounded-2xl border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Canvas Sandbox Sidebar Panel */}
      {canvasOpen && canvasCode && (
        <div className="w-full lg:w-1/2 h-full absolute inset-0 lg:static z-30">
          <CanvasPreview 
            code={canvasCode} 
            onClose={() => setCanvasOpen(false)} 
          />
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraModal
          onCapture={(base64, mimeType) => {
            setPendingAttachment({ mimeType, data: base64 });
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Google Drive Import Modal */}
      {showDriveModal && (
        <GoogleDriveImportModal
          onClose={() => setShowDriveModal(false)}
          onImportContent={(fileName, mimeType, extractedText) => handleDriveImportSuccess({ name: fileName, mimeType, content: extractedText })}
          onFileSelect={handleDriveImportSuccess}
        />
      )}

    </div>
  );
};
