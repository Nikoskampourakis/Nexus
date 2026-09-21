import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ModelBuilder } from './components/ModelBuilder';
import { LiveInterface } from './components/LiveInterface';
import { Settings } from './components/Settings';
import { CreateTab } from './components/CreateTab';
import { ConnectHub } from './components/ConnectHub';
import { DownloadChatModal } from './components/DownloadChatModal';
import { VirtualModel, Message, ViewMode, ChatSession, ShortcutItem, FormattingActionType, CouncilDebateData } from './types';
import { ArchivePackage } from './services/archiveService';
import { streamGeminiResponse, synthesizeAndLearnKnowledge, generateSingleImage, formatTextWithGemini, streamCouncilDebateResponse, streamCorrectionAudit } from './services/geminiService';
import { 
  getStoredSessions, 
  saveStoredSession, 
  deleteStoredSession, 
  renameStoredSession,
  getStoredModels, 
  saveStoredModels,
  getShortcuts,
  saveStoredCreation,
  getStoredMessages
} from './services/storageService';
import { applyTheme, getSavedTheme } from './services/themeService';

const App: React.FC = () => {
  // State
  const [models, setModels] = useState<VirtualModel[]>([]);
  const [activeModelId, setActiveModelId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [view, setView] = useState<ViewMode>('chat');
  const [isLoading, setIsLoading] = useState(false);
  
  // Model Knowledge Learning State
  const [isLearning, setIsLearning] = useState(false);
  const [learningNotification, setLearningNotification] = useState<string | null>(null);

  // Incognito Mode State
  const [isIncognito, setIsIncognito] = useState(false);

  // Staged Image for Create Studio Bridge
  const [stagedCreateImage, setStagedCreateImage] = useState<{ url: string; prompt: string } | null>(null);

  // Tool States
  const [researchMode, setResearchMode] = useState(false);
  const [searchModeType, setSearchModeType] = useState<'web' | 'research'>('research');
  const [thinkMode, setThinkMode] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [councilMode, setCouncilMode] = useState(false);
  const [correctionMode, setCorrectionMode] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // History State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  // Keep currentSessionIdRef always synchronized
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);
  
  // Shortcuts State
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);

  // Export & Download Chat Modal State
  const [downloadingSession, setDownloadingSession] = useState<ChatSession | null>(null);

  const handleOpenDownloadChat = (sessionToDownload?: ChatSession) => {
    if (sessionToDownload) {
      setDownloadingSession(sessionToDownload);
    } else {
      const activeSession = sessions.find((s) => s.id === currentSessionId);
      if (activeSession) {
        setDownloadingSession(activeSession);
      } else {
        setDownloadingSession({
          id: 'current',
          title: currentSessionTitle || 'Active Conversation',
          timestamp: Date.now(),
          messages: messages,
          modelId: activeModelId,
        });
      }
    }
  };

  // Stream Controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialization
  useEffect(() => {
    applyTheme(getSavedTheme());

    const storedModels = getStoredModels();
    setModels(storedModels);
    if (storedModels.length > 0) {
      setActiveModelId(storedModels[0].id);
    }
    setSessions(getStoredSessions());
    setShortcuts(getShortcuts());
  }, []);

  const refreshData = () => {
      setSessions(getStoredSessions());
      setModels(getStoredModels());
      setShortcuts(getShortcuts());
  };

  const activeModel = models.find(m => m.id === activeModelId) || models[0];

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentSessionTitle = currentSession?.title;
  
  // --- Shortcut Handler ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement;
          const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
          
          for (const s of shortcuts) {
              const k = s.keys;
              if (
                  e.key.toLowerCase() === k.key.toLowerCase() && 
                  !!e.altKey === !!k.alt &&
                  !!e.ctrlKey === !!k.ctrl &&
                  !!e.shiftKey === !!k.shift &&
                  !!e.metaKey === !!k.meta
              ) {
                  if (isInput && !k.alt && !k.ctrl && !k.meta) continue;

                  e.preventDefault();
                  
                  switch(s.id) {
                      case 'new_chat':
                          handleNewChat();
                          break;
                      case 'toggle_sidebar':
                          setSidebarOpen(prev => !prev);
                          break;
                      case 'open_settings':
                          setView('settings');
                          break;
                      case 'toggle_research':
                          setResearchMode(prev => !prev);
                          break;
                      case 'toggle_think':
                          setThinkMode(prev => !prev);
                          break;
                      case 'toggle_study':
                          setStudyMode(prev => !prev);
                          break;
                  }
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, activeModelId]);

  const executeGeminiStream = async (
      historyForModel: Message[], 
      prompt: string,
      attachment: { mimeType: string, data: string } | null,
      updateMessageId: string,
      isRetry: boolean = false
  ) => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoading(true);

      let fullResponseText = "";
      let fullThoughtText = "";
      let finalMetadata: any = undefined;
      const startTime = Date.now();

      try {
        if (councilMode) {
          // Stream Council Mode Multi-Agent Deliberation
          await streamCouncilDebateResponse(
            prompt,
            (textChunk) => {
              fullResponseText = textChunk;
              setMessages(prev => prev.map(msg => {
                if (msg.id === updateMessageId) {
                  return {
                    ...msg,
                    content: fullResponseText,
                    thought: fullThoughtText || msg.thought,
                    thinkingDurationMs: Date.now() - startTime
                  };
                }
                return msg;
              }));
            },
            (thoughtChunk) => {
              fullThoughtText += thoughtChunk;
              setMessages(prev => prev.map(msg => {
                if (msg.id === updateMessageId) {
                  return { ...msg, thought: fullThoughtText };
                }
                return msg;
              }));
            },
            controller.signal
          );
        } else {
          await streamGeminiResponse(
            activeModel,
            historyForModel, 
            prompt,
            attachment,
            researchMode,
            thinkMode,
            studyMode,
            (textChunk) => {
              fullResponseText += textChunk;
            setMessages(prev => prev.map(msg => {
              if (msg.id === updateMessageId) {
                // Dynamically detect code blocks and actions in real time
                const hasCode = /```(?:html|javascript|js|typescript|ts|python|py|jsx|tsx|css|json)/i.test(fullResponseText);
                const hasImageIntent = /\/image|\/draw|synthesiz|generat.*image/i.test(prompt);

                const dynamicActions = [
                  ...(researchMode ? [{
                    id: 'act_search',
                    type: 'search' as const,
                    title: 'Real-time Web Search Grounding',
                    status: 'completed' as const,
                    timestamp: startTime
                  }] : []),
                  ...(hasCode ? [{
                    id: 'act_code',
                    type: 'code' as const,
                    title: 'Synthesized Code Block & UI Preview',
                    status: 'completed' as const,
                    timestamp: startTime + 500
                  }] : [])
                ];

                if (isRetry && msg.versions) {
                    const updatedVersions = [...msg.versions];
                    updatedVersions[updatedVersions.length - 1] = fullResponseText;
                    return { 
                      ...msg, 
                      versions: updatedVersions, 
                      content: fullResponseText, 
                      thought: fullThoughtText || msg.thought,
                      thinkingDurationMs: Date.now() - startTime,
                      actions: dynamicActions.length > 0 ? dynamicActions : msg.actions
                    };
                } else {
                    return { 
                      ...msg, 
                      content: fullResponseText, 
                      thought: fullThoughtText || msg.thought,
                      thinkingDurationMs: Date.now() - startTime,
                      actions: dynamicActions.length > 0 ? dynamicActions : msg.actions
                    };
                }
              }
              return msg;
            }));
          },
          (metadata) => {
              finalMetadata = metadata;
              setMessages(prev => prev.map(msg => {
                  if (msg.id === updateMessageId) {
                      return { 
                        ...msg, 
                        groundingMetadata: metadata.groundingMetadata || metadata,
                        thought: metadata.thought || msg.thought
                      };
                  }
                  return msg;
              }));
          },
          (thoughtChunk) => {
            fullThoughtText += thoughtChunk;
            setMessages(prev => prev.map(msg => {
              if (msg.id === updateMessageId) {
                return { ...msg, thought: fullThoughtText };
              }
              return msg;
            }));
          },
          (actionItem) => {
            setMessages(prev => prev.map(msg => {
              if (msg.id === updateMessageId) {
                const existingActions = msg.actions || [];
                const idx = existingActions.findIndex(a => a.id === actionItem.id);
                let updatedActions: AgentActionItem[];
                if (idx >= 0) {
                  updatedActions = [...existingActions];
                  updatedActions[idx] = actionItem;
                } else {
                  updatedActions = [...existingActions, actionItem];
                }
                return { ...msg, actions: updatedActions };
              }
              return msg;
            }));
          },
          controller.signal
        );
        }
  
        // Post-Stream Logic (Parsing Council & Saving)
        setMessages(prev => {
            const updatedMessages = prev.map(msg => {
                if (msg.id === updateMessageId) {
                    let finalContent = fullResponseText;
                    const finalGrounding = finalMetadata?.groundingMetadata || finalMetadata || msg.groundingMetadata;
                    const finalThought = fullThoughtText || finalMetadata?.thought || msg.thought;
                    
                    // Parse Council Data payload if present
                    let parsedCouncil: CouncilDebateData | undefined = undefined;
                    const councilMatch = finalContent.match(/\|\|COUNCIL_DATA\|\|\s*([\s\S]*?)\s*\|\|COUNCIL_DATA\|\|/);
                    if (councilMatch && councilMatch[1]) {
                      try {
                        parsedCouncil = JSON.parse(councilMatch[1]);
                        // Clean the trailing JSON delimiter from readable text for clean presentation
                        finalContent = finalContent.replace(/\|\|COUNCIL_DATA\|\|[\s\S]*?\|\|COUNCIL_DATA\|\|/, '').trim();
                      } catch (e) {
                        console.warn('Failed to parse council JSON block:', e);
                      }
                    }

                    if (isRetry && msg.versions) {
                         const updatedVersions = [...msg.versions];
                         updatedVersions[updatedVersions.length - 1] = finalContent;
                         return { 
                           ...msg, 
                           versions: updatedVersions, 
                           content: finalContent, 
                           groundingMetadata: finalGrounding,
                           thought: finalThought,
                           councilDebate: parsedCouncil || msg.councilDebate,
                           thinkingDurationMs: Date.now() - startTime
                         };
                    }
                    return { 
                      ...msg, 
                      content: finalContent, 
                      groundingMetadata: finalGrounding,
                      thought: finalThought,
                      councilDebate: parsedCouncil || msg.councilDebate,
                      thinkingDurationMs: Date.now() - startTime
                    };
                }
                return msg;
            });
            
            saveCurrentSessionState(updatedMessages);
            return updatedMessages;
        });

      } catch (error: any) {
        if (error.name !== 'AbortError') {
             setMessages(prev => prev.map(msg => {
                if (msg.id === updateMessageId) {
                  return { ...msg, isError: true, content: msg.content + "\n\n[Error: Generation Failed. Check your network or API status.]" };
                }
                return msg;
              }));
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
  };

  // AI Formatting Action for Messages
  const handleFormatMessage = async (msgId: string, formatType: FormattingActionType) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg || !targetMsg.content || isLoading) return;

    setIsLoading(true);
    try {
      const formattedText = await formatTextWithGemini(targetMsg.content, formatType);
      
      setMessages(prev => {
        const updated = prev.map(msg => {
          if (msg.id === msgId) {
            const currentVersions = msg.versions && msg.versions.length > 0 ? msg.versions : [msg.content];
            const newVersions = [...currentVersions, formattedText];
            return {
              ...msg,
              content: formattedText,
              versions: newVersions,
              currentVersionIndex: newVersions.length - 1,
              isEdited: true
            };
          }
          return msg;
        });
        saveCurrentSessionState(updated);
        return updated;
      });
    } catch (error) {
      console.error('Failed to format message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // AI Formatting Action for Input Box
  const handleFormatInput = async (formatType: FormattingActionType) => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const formatted = await formatTextWithGemini(input, formatType);
      setInput(formatted);
    } catch (error) {
      console.error('Failed to format input:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Correction Mode Audit Action: Checks if research or statements are wrong
  const handleRunCorrection = async (msgId: string, content: string) => {
    if (!content || isLoading) return;

    // Check if there is already a correction audit for this specific message in the chat
    const alreadyAudited = messages.some(m => m.content.includes("[CORRECTION MODE AUDIT]") || (m.role === 'model' && m.content.includes("### Research Audit Analysis")));
    // Actually, let's be more specific. We'll check the very last message.
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'model' && lastMsg.content.includes("### Research Audit Analysis")) {
      return; // Already auditing/audited recently
    }

    if (!currentSessionIdRef.current) {
      const newId = 'session_' + Date.now();
      currentSessionIdRef.current = newId;
      setCurrentSessionId(newId);
    }

    const auditUserMsgId = "audit_user_" + Date.now();
    const auditUserMsg: Message = {
      id: auditUserMsgId,
      role: 'user',
      content: `Please run Correction Mode on the previous research response. Audit all claims, investigate counter-evidence, cross-reference with live web sources, and identify any errors, outdated information, or misleading points.`,
      timestamp: Date.now()
    };

    const auditModelMsgId = "audit_model_" + (Date.now() + 1);
    const auditModelMsg: Message = {
      id: auditModelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now()
    };

    const newHistory = [...messages, auditUserMsg, auditModelMsg];
    setMessages(newHistory);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const startTime = Date.now();
    let accumulatedText = '';
    let accumulatedThought = '';

    try {
      await streamCorrectionAudit(
        content,
        (chunk) => {
          accumulatedText += chunk;
          setMessages(prev => prev.map(m => m.id === auditModelMsgId ? { ...m, content: accumulatedText } : m));
        },
        (thoughtChunk) => {
          accumulatedThought += thoughtChunk;
          setMessages(prev => prev.map(m => m.id === auditModelMsgId ? { ...m, thought: accumulatedThought } : m));
        },
        controller.signal
      );

      setMessages(prev => {
        const finalMsgs = prev.map(m => {
          if (m.id === auditModelMsgId) {
            return {
              ...m,
              content: accumulatedText,
              thought: accumulatedThought,
              thinkingDurationMs: Date.now() - startTime
            };
          }
          return m;
        });
        saveCurrentSessionState(finalMsgs);
        return finalMsgs;
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === auditModelMsgId ? {
          ...m,
          isError: true,
          content: accumulatedText + '\n\n[Correction Mode: Audit could not be completed. Please try again.]'
        } : m));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async (
    attachment?: { mimeType: string; data: string } | null,
    archiveAttachment?: Message['archiveAttachment'] | null
  ) => {
    if ((!input.trim() && !attachment && !archiveAttachment) || isLoading || !activeModel) return;

    const effectivePrompt = input.trim() || (archiveAttachment ? `Please inspect and analyze the uploaded archive: ${archiveAttachment.name}` : '');
    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: effectivePrompt,
      timestamp: Date.now(),
      attachment: attachment || undefined,
      archiveAttachment: archiveAttachment || undefined,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');

    // Ensure session ID exists synchronously
    if (!currentSessionIdRef.current) {
      const newId = 'session_' + Date.now();
      currentSessionIdRef.current = newId;
      setCurrentSessionId(newId);
    }

    const modelMsgId = (Date.now() + 1).toString();
    const placeholderMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      versions: [''], 
      currentVersionIndex: 0,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, placeholderMsg]);
    
    // Prepare prompt with archive overview if present
    let promptForModel = effectivePrompt;
    if (correctionMode) {
      promptForModel = `[CORRECTION MODE AUDIT]: Please check and verify whether the following claim, premise, or existing research is wrong, outdated, or flawed. Cross-reference with live web grounding, investigate counter-evidence, and deliver an adversarial verification audit:\n\n${effectivePrompt}`;
    }
    if (archiveAttachment) {
      const fileList = archiveAttachment.files.map(f => {
        if (f.isText && f.textPreview) {
          return `\nFile: ${f.name} (${f.size} bytes)\n\`\`\`\n${f.textPreview.slice(0, 2000)}\n\`\`\``;
        }
        return `- ${f.name} (${f.size} bytes)`;
      }).join('\n');

      promptForModel = `${promptForModel}\n\n[USER ATTACHED ${archiveAttachment.format.toUpperCase()} ARCHIVE: "${archiveAttachment.name}" (${archiveAttachment.totalFiles} files, ${(archiveAttachment.totalSize/1024).toFixed(1)} KB)]:\nFiles Included:\n${fileList}\n\nPlease inspect the files, explain the structure, identify potential issues or enhancements, and provide code suggestions or fixes directly.`;
    }

    await executeGeminiStream(newHistory, promptForModel, attachment || null, modelMsgId, true); 
  };

  // In-Chat Direct Image Generation Handler
  const handleGenerateImageInChat = async (
    promptText: string,
    options?: { stylePrompt?: string; style?: string; aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' }
  ) => {
    if (!promptText.trim() || isLoading) return;

    if (!currentSessionIdRef.current) {
      const newId = 'session_' + Date.now();
      currentSessionIdRef.current = newId;
      setCurrentSessionId(newId);
    }

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: `/image ${promptText}`,
      timestamp: Date.now()
    };

    const modelMsgId = (Date.now() + 1).toString();
    const placeholderMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isImageGeneration: true
    };

    const updatedHistory = [...messages, userMsg, placeholderMsg];
    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const stylePrompt = options?.stylePrompt || options?.style;
      const aspectRatio = options?.aspectRatio || '1:1';

      const imageUrl = await generateSingleImage({
        prompt: promptText.trim(),
        stylePrompt: stylePrompt,
        aspectRatio: aspectRatio as any
      });

      const finalMessages = updatedHistory.map(msg => {
        if (msg.id === modelMsgId) {
          return {
            ...msg,
            content: `Synthesized image for "${promptText}"`,
            isImageGeneration: true,
            generatedImage: {
              url: imageUrl,
              prompt: promptText,
              style: stylePrompt,
              aspectRatio: aspectRatio
            }
          };
        }
        return msg;
      });

      setMessages(finalMessages);
      saveCurrentSessionState(finalMessages);

      // Save to library gallery as well
      saveStoredCreation({
        id: 'img_' + Date.now(),
        type: 'image',
        title: promptText.slice(0, 40),
        prompt: promptText,
        result: imageUrl,
        style: stylePrompt,
        aspectRatio: aspectRatio,
        createdAt: Date.now()
      });
    } catch (error: any) {
      console.error("Chat image generation failed:", error);
      const errorMessages = updatedHistory.map(msg => {
        if (msg.id === modelMsgId) {
          return {
            ...msg,
            isError: true,
            content: `[Image Generation Error: ${error.message || 'Failed to generate image. Please try again.'}]`
          };
        }
        return msg;
      });
      setMessages(errorMessages);
      saveCurrentSessionState(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendImageToCreateStudio = (imageUrl: string, promptText: string) => {
    setStagedCreateImage({
      url: imageUrl,
      prompt: promptText
    });
    setView('create');
  };

  const handleSendImageCreationToChat = async (imageBase64: string, promptText: string) => {
    setView('chat');
    if (!activeModel) return;

    if (!currentSessionIdRef.current) {
      const newId = 'session_' + Date.now();
      currentSessionIdRef.current = newId;
      setCurrentSessionId(newId);
    }

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: promptText || 'Analyze this created image',
      timestamp: Date.now(),
      attachment: {
        mimeType: 'image/png',
        data: imageBase64
      }
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    const modelMsgId = (Date.now() + 1).toString();
    const placeholderMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      versions: [''],
      currentVersionIndex: 0,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, placeholderMsg]);

    await executeGeminiStream(
      newHistory,
      userMsg.content,
      { mimeType: 'image/png', data: imageBase64 },
      modelMsgId,
      true
    );
  };

  const handleStop = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setIsLoading(false);
      }
  };

  const handleRetry = async (msgId: string) => {
      const msgIndex = messages.findIndex(m => m.id === msgId);
      if (msgIndex === -1) return;

      const promptMsg = messages[msgIndex - 1];
      if (!promptMsg || promptMsg.role !== 'user') return;

      const historyForContext = messages.slice(0, msgIndex); 

      setMessages(prev => prev.map((msg, idx) => {
          if (idx === msgIndex) {
              const newVersions = [...(msg.versions || [msg.content]), ''];
              return {
                  ...msg,
                  versions: newVersions,
                  currentVersionIndex: newVersions.length - 1,
                  content: '', 
                  isError: false
              };
          }
          return msg;
      }));

      await executeGeminiStream(
          historyForContext, 
          promptMsg.content, 
          promptMsg.attachment || null, 
          msgId, 
          true
      );
  };

  const handleDeepSearch = () => {
      const deepQuery = "Perform a deep, comprehensive research dive on the previous topic. Search for conflicting viewpoints, statistical data, and recent developments.";
      setInput(deepQuery);
      setResearchMode(true);
      
      setTimeout(() => {
           const userMsgId = Date.now().toString();
           const userMsg: Message = {
             id: userMsgId,
             role: 'user',
             content: deepQuery,
             timestamp: Date.now()
           };

           setMessages(prev => [...prev, userMsg]);
           
           const modelMsgId = (Date.now() + 1).toString();
           const placeholderMsg: Message = {
             id: modelMsgId,
             role: 'model',
             content: '',
             versions: [''], 
             currentVersionIndex: 0,
             timestamp: Date.now()
           };
           setMessages(prev => [...prev, placeholderMsg]);
           
           const historyForModel = [...messages, userMsg];
           executeGeminiStream(historyForModel, deepQuery, null, modelMsgId, true);
           setInput('');
      }, 100);
  };

  const handleNavigateVersion = (msgId: string, direction: 'prev' | 'next') => {
      setMessages(prev => prev.map(msg => {
          if (msg.id === msgId && msg.versions) {
              let newIndex = msg.currentVersionIndex || 0;
              if (direction === 'prev') newIndex = Math.max(0, newIndex - 1);
              if (direction === 'next') newIndex = Math.min(msg.versions.length - 1, newIndex + 1);
              return { ...msg, currentVersionIndex: newIndex };
          }
          return msg;
      }));
  };

  const saveCurrentSessionState = async (currentMessages: Message[]) => {
      if (isIncognito) {
        return; // Never persist incognito sessions to disk
      }

      let sessionIdToSave = currentSessionIdRef.current || currentSessionId;
      if (!sessionIdToSave) {
        sessionIdToSave = 'session_' + Date.now();
        currentSessionIdRef.current = sessionIdToSave;
        setCurrentSessionId(sessionIdToSave);
      }

      let title = "New Chat";
      const firstUserMsg = currentMessages.find(m => m.role === 'user');
      if (firstUserMsg) {
         // Clean /image prefix from title if present
         const cleanPrompt = firstUserMsg.content.replace(/^\/image\s+/i, '');
         title = cleanPrompt.slice(0, 30) + (cleanPrompt.length > 30 ? '...' : '');
      } else {
         const existingSession = sessions.find(s => s.id === sessionIdToSave);
         if (existingSession) title = existingSession.title;
      }

      const sessionToSave: ChatSession = {
        id: sessionIdToSave,
        modelId: activeModelId,
        title: title,
        messages: currentMessages,
        updatedAt: Date.now(),
        isIncognito: false
      };

      const updatedSessions = await saveStoredSession(sessionToSave);
      setSessions(updatedSessions);
  };

  // --- Incognito Mode Toggle ---
  const handleToggleIncognito = () => {
    const nextState = !isIncognito;
    setIsIncognito(nextState);
    if (nextState) {
      setLearningNotification("Incognito Mode Active: Chat history will not be saved.");
    } else {
      setLearningNotification("Incognito Mode turned off. Normal session history restored.");
    }
    setTimeout(() => setLearningNotification(null), 4000);
  };

  // --- Fork Conversation Handlers ---
  const handleForkCurrentSession = async () => {
    if (messages.length === 0) return;
    const newSessionId = 'fork_' + Date.now();
    const currentTitle = currentSession?.title || 'Chat';
    const forkedTitle = `Fork: ${currentTitle}`;

    const forkedSession: ChatSession = {
      id: newSessionId,
      modelId: activeModelId,
      title: forkedTitle,
      messages: JSON.parse(JSON.stringify(messages)),
      updatedAt: Date.now(),
      isIncognito,
      forkedFromSessionId: currentSessionId || undefined
    };

    if (!isIncognito) {
      const updated = await saveStoredSession(forkedSession);
      setSessions(updated);
    }

    currentSessionIdRef.current = newSessionId;
    setCurrentSessionId(newSessionId);
    setLearningNotification(`Forked conversation into "${forkedTitle}"`);
    setTimeout(() => setLearningNotification(null), 4000);
  };

  const handleForkFromMessage = async (messageId: string) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const slicedMessages = messages.slice(0, msgIndex + 1);
    const newSessionId = 'fork_msg_' + Date.now();
    const currentTitle = currentSession?.title || 'Chat';
    const forkedTitle = `Branch @ #${msgIndex + 1}: ${currentTitle}`;

    const forkedSession: ChatSession = {
      id: newSessionId,
      modelId: activeModelId,
      title: forkedTitle,
      messages: JSON.parse(JSON.stringify(slicedMessages)),
      updatedAt: Date.now(),
      isIncognito,
      forkedFromSessionId: currentSessionId || undefined
    };

    if (!isIncognito) {
      const updated = await saveStoredSession(forkedSession);
      setSessions(updated);
    }

    currentSessionIdRef.current = newSessionId;
    setCurrentSessionId(newSessionId);
    setMessages(slicedMessages);
    setLearningNotification(`Forked branch at message #${msgIndex + 1}`);
    setTimeout(() => setLearningNotification(null), 4000);
  };

  // --- Edit Pre-Existing Chats / Messages Handlers ---
  const handleRenameSession = (sessionId: string, newTitle: string) => {
    const updated = renameStoredSession(sessionId, newTitle);
    setSessions(updated);
  };

  const handleRenameCurrentSession = (newTitle: string) => {
    if (currentSessionId) {
      handleRenameSession(currentSessionId, newTitle);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string, regenerate: boolean = false) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const targetMsg = messages[msgIndex];

    if (regenerate && targetMsg.role === 'user') {
      // Slicing history up to this edited user message
      const updatedUserMsg: Message = {
        ...targetMsg,
        content: newContent,
        isEdited: true,
        timestamp: Date.now()
      };

      const truncatedHistory = [...messages.slice(0, msgIndex), updatedUserMsg];
      
      const modelMsgId = (Date.now() + 1).toString();
      const placeholderMsg: Message = {
        id: modelMsgId,
        role: 'model',
        content: '',
        versions: [''],
        currentVersionIndex: 0,
        timestamp: Date.now()
      };

      const newHistory = [...truncatedHistory, placeholderMsg];
      setMessages(newHistory);

      await executeGeminiStream(
        truncatedHistory,
        newContent,
        targetMsg.attachment || null,
        modelMsgId,
        true
      );
    } else {
      // Just update text content inline
      const updatedMessages = messages.map((m, idx) => {
        if (idx === msgIndex) {
          return {
            ...m,
            content: newContent,
            isEdited: true
          };
        }
        return m;
      });

      setMessages(updatedMessages);
      saveCurrentSessionState(updatedMessages);
    }

    setLearningNotification("Message updated successfully.");
    setTimeout(() => setLearningNotification(null), 3000);
  };

  // --- New Chat Handler ---
  const handleNewChat = () => {
    currentSessionIdRef.current = null;
    setCurrentSessionId(null);
    setMessages([]);
    setView('chat');
  };

  // --- Handlers ---
  const handleLearnModelKnowledge = async () => {
    if (!activeModel || messages.length === 0) return;
    setIsLearning(true);
    try {
      const result = await synthesizeAndLearnKnowledge(activeModel, messages);
      if (result && result.updatedKnowledgeBase) {
        const updatedModels = models.map(m => {
          if (m.id === activeModel.id) {
            return {
              ...m,
              knowledgeBase: result.updatedKnowledgeBase
            };
          }
          return m;
        });
        setModels(updatedModels);
        saveStoredModels(updatedModels);

        const factsCount = result.learnedFacts?.length || 0;
        setLearningNotification(`Model learned ${factsCount} new insight${factsCount === 1 ? '' : 's'} and updated its knowledge base!`);
        setTimeout(() => setLearningNotification(null), 5000);
      }
    } catch (e: any) {
      console.error("Learning error:", e);
      setLearningNotification(`Error learning: ${e.message || 'Unknown error'}`);
      setTimeout(() => setLearningNotification(null), 5000);
    } finally {
      setIsLearning(false);
    }
  };

  const handleUpdateModelKnowledge = (newKnowledge: string) => {
    if (!activeModel) return;
    const updatedModels = models.map(m => {
      if (m.id === activeModel.id) {
        return {
          ...m,
          knowledgeBase: newKnowledge
        };
      }
      return m;
    });
    setModels(updatedModels);
    saveStoredModels(updatedModels);
  };

  const handleSaveModel = (newModel: VirtualModel) => {
    const updatedModels = [...models, newModel];
    setModels(updatedModels);
    saveStoredModels(updatedModels);
    setActiveModelId(newModel.id);
    currentSessionIdRef.current = null;
    setCurrentSessionId(null);
    setMessages([]);
    setView('chat');
  };

  const handleSelectModel = (id: string) => {
    setActiveModelId(id);
    currentSessionIdRef.current = null;
    setCurrentSessionId(null);
    setMessages([]); 
    setView('chat');
  };

  const handleSelectSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const modelExists = models.find(m => m.id === session.modelId);
      if (modelExists) {
        setActiveModelId(session.modelId);
      }
      currentSessionIdRef.current = session.id;
      setCurrentSessionId(session.id);
      
      // Load messages from IndexedDB as they are stripped from localStorage metadata
      const storedMessages = await getStoredMessages(session.id);
      if (storedMessages && storedMessages.length > 0) {
        setMessages(storedMessages);
      } else {
        setMessages(session.messages || []);
      }
      
      setView('chat');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const updated = await deleteStoredSession(sessionId);
    setSessions(updated);
    if (currentSessionIdRef.current === sessionId || currentSessionId === sessionId) {
        currentSessionIdRef.current = null;
        setCurrentSessionId(null);
        setMessages([]);
    }
  };

  if (models.length === 0) return <div className="h-screen bg-black text-white flex items-center justify-center font-mono text-sm">Initializing Nexus Architect...</div>;

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--text-primary)] overflow-hidden font-sans selection:bg-[var(--accent-solid)] selection:text-white">
      {/* Sidebar */}
      <Sidebar
        models={models}
        activeModelId={activeModelId}
        onSelectModel={handleSelectModel}
        
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onForkSession={(sessionId) => {
          const s = sessions.find(item => item.id === sessionId);
          if (s) {
            handleSelectSession(sessionId);
            setTimeout(() => handleForkCurrentSession(), 50);
          }
        }}
        onSessionMoved={refreshData}

        currentView={view}
        onChangeView={setView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}

        isIncognito={isIncognito}
        onToggleIncognito={handleToggleIncognito}
        onNewChat={handleNewChat}

        onDownloadSession={handleOpenDownloadChat}
        onBatchExportSuccess={(count) => {
          setLearningNotification(`Successfully exported ${count} chat sessions to ZIP archive with PDFs and Markdown!`);
          setTimeout(() => setLearningNotification(null), 5000);
        }}
        onOpenDocumentStudio={() => handleOpenDocumentStudio()}
        onOpenArchiveStudio={() => handleOpenArchiveStudio()}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative transition-all duration-300 ease-in-out w-full bg-[var(--app-bg)] overflow-hidden">
        
        {/* Notification Toast */}
        {learningNotification && (
          <div className="absolute top-4 right-4 z-50 max-w-md bg-[var(--sidebar-bg)]/95 border border-cyan-500/50 text-[var(--text-primary)] px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">{learningNotification}</span>
            <button 
              onClick={() => setLearningNotification(null)}
              className="text-[var(--text-secondary)] hover:text-white p-1 ml-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {view === 'chat' && activeModel && (
          <ChatArea 
            activeModel={activeModel}
            messages={messages}
            isLoading={isLoading}
            input={input}
            onInputChange={setInput}
            onSend={handleSendMessage}
            onStop={handleStop}
            onRetry={handleRetry}
            onNavigateVersion={handleNavigateVersion}
            onDeepSearch={handleDeepSearch}
            
            researchMode={researchMode}
            onToggleResearch={() => setResearchMode(!researchMode)}
            
            thinkMode={thinkMode}
            onToggleThink={() => setThinkMode(!thinkMode)}

            studyMode={studyMode}
            onToggleStudy={() => setStudyMode(!studyMode)}

            councilMode={councilMode}
            onToggleCouncil={() => setCouncilMode(!councilMode)}

            correctionMode={correctionMode}
            onToggleCorrectionMode={() => setCorrectionMode(!correctionMode)}
            onRunCorrection={handleRunCorrection}
            searchModeType={searchModeType}
            onSelectSearchModeType={setSearchModeType}
            
            onFormatMessage={handleFormatMessage}
            onFormatInput={handleFormatInput}
            
            onStartLiveMode={() => setLiveMode(true)}
            shortcuts={shortcuts}
            onLearnFromChat={handleLearnModelKnowledge}
            isLearning={isLearning}
            onUpdateModelKnowledge={handleUpdateModelKnowledge}

            // In-Chat Image Creation & Create Studio Bridge
            onGenerateImage={handleGenerateImageInChat}
            onSendImageToCreateStudio={handleSendImageToCreateStudio}

            // New Features
            isIncognito={isIncognito}
            onToggleIncognito={handleToggleIncognito}
            currentSessionTitle={currentSessionTitle}
            onRenameCurrentSession={handleRenameCurrentSession}
            onForkCurrentSession={handleForkCurrentSession}
            onForkFromMessage={handleForkFromMessage}
            onEditMessage={handleEditMessage}
            isForked={Boolean(currentSession?.forkedFromSessionId)}

            // Mobile-first single header navigation
            onToggleSidebar={() => setSidebarOpen(true)}
            onNewChat={handleNewChat}
            onOpenCreateTab={() => setView('create')}
            onOpenConnectTab={() => setView('connect')}

            // Document & Presentation & Archive Features
            onDownloadChat={() => handleOpenDownloadChat()}
          />
        )}

        {view === 'connect' && (
          <ConnectHub
            onToggleSidebar={() => setSidebarOpen(true)}
            onBackToChat={() => setView('chat')}
            onSendToChat={(text) => {
              setInput(text);
              setView('chat');
            }}
          />
        )}

        {view === 'create' && (
          <CreateTab
            onToggleSidebar={() => setSidebarOpen(true)}
            onBackToChat={() => setView('chat')}
            onSendToChat={handleSendImageCreationToChat}
            initialImage={stagedCreateImage}
          />
        )}

        {view === 'personalization' && (
          <Settings
             onClose={() => setView('chat')}
             onSettingsChanged={refreshData}
             models={models}
             initialTab="personalization"
          />
        )}

        {view === 'builder' && (
          <ModelBuilder
            onSave={handleSaveModel}
            onCancel={() => setView('chat')}
            existingModels={models}
          />
        )}

        {view === 'settings' && (
          <Settings
             onClose={() => setView('chat')}
             onSettingsChanged={refreshData}
             models={models}
          />
        )}

        {liveMode && (
          <LiveInterface 
            onClose={() => setLiveMode(false)} 
            activeModel={activeModel}
            searchEnabled={researchMode}
            onToggleSearch={() => setResearchMode(!researchMode)}
            thinkingEnabled={thinkMode}
            onToggleThinking={() => setThinkMode(!thinkMode)}
            studentEnabled={studyMode}
            onToggleStudent={() => setStudyMode(!studyMode)}
          />
        )}

        {/* Download Chat Modal */}
        {downloadingSession && (
          <DownloadChatModal
            session={downloadingSession}
            onClose={() => setDownloadingSession(null)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
