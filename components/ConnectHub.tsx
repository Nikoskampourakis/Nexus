import React, { useState, useEffect } from 'react';
import { 
  googleSignIn, 
  logout, 
  subscribeAuth, 
  getAccessToken 
} from '../services/workspaceAuthService';
import { 
  listGmailMessages, 
  getGmailMessageFull, 
  sendGmailMessage,
  listDriveFiles,
  createDriveTextFile,
  deleteDriveFile,
  listSpreadsheets,
  getSpreadsheetDetails,
  getSheetValues,
  appendSheetRow,
  createSpreadsheet,
  listGoogleDocs,
  getGoogleDocContent,
  appendGoogleDocText,
  createGoogleDoc,
  listCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  listTaskLists,
  listTasksInList,
  createTask,
  updateTaskStatus,
  deleteTask,
  GmailMessageSummary,
  DriveFileItem,
  SpreadsheetSummary,
  DocumentSummary,
  CalendarEventItem,
  TaskListItem,
  TaskItem,
  SheetTabInfo
} from '../services/workspaceApiService';
import { 
  getWorkspaceToolsConfig, 
  toggleWorkspaceApp, 
  setFullStack, 
  isFullStackEnabled, 
  subscribeWorkspaceTools 
} from '../services/workspaceToolService';
import { WorkspaceAppName, WorkspaceToolsConfig } from '../types';
import { User } from 'firebase/auth';

interface ConnectHubProps {
  onToggleSidebar?: () => void;
  onSendToChat?: (text: string) => void;
  onBackToChat: () => void;
}

type TabType = 'agent_tools' | 'gmail' | 'drive' | 'sheets' | 'docs' | 'calendar' | 'tasks';

export const ConnectHub: React.FC<ConnectHubProps> = ({
  onToggleSidebar,
  onSendToChat,
  onBackToChat
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('agent_tools');
  const [toolsConfig, setToolsConfig] = useState<WorkspaceToolsConfig>(getWorkspaceToolsConfig());

  useEffect(() => {
    return subscribeWorkspaceTools((cfg) => setToolsConfig(cfg));
  }, []);

  // Confirmation Modal state for mutating/destructive operations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'danger' | 'primary';
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);

  // Status banners / toasts
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Subscribe to auth state
  useEffect(() => {
    const unsubscribe = subscribeAuth((user, token) => {
      setCurrentUser(user);
      setHasToken(!!token);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        showToast('Successfully connected to Google Workspace apps!');
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Failed to authenticate with Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      showToast('Disconnected from Google Workspace.');
    } catch (err: any) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // GMAIL STATE
  // -------------------------------------------------------------
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [gmailSearch, setGmailSearch] = useState('');
  const [isGmailLoading, setIsGmailLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<{
    id: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    body: string;
    snippet: string;
  } | null>(null);
  const [isEmailDetailLoading, setIsEmailDetailLoading] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const loadGmail = async (query = gmailSearch) => {
    if (!hasToken) return;
    setIsGmailLoading(true);
    try {
      const data = await listGmailMessages(query);
      setGmailMessages(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsGmailLoading(false);
    }
  };

  const handleViewEmail = async (msgId: string) => {
    setIsEmailDetailLoading(true);
    try {
      const full = await getGmailMessageFull(msgId);
      setSelectedEmail(full);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsEmailDetailLoading(false);
    }
  };

  const promptSendEmail = () => {
    if (!composeTo || !composeSubject) {
      showToast('Recipient and Subject are required.', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Sending Email',
      description: `Are you sure you want to send this email to "${composeTo}" with subject "${composeSubject}"?`,
      actionType: 'primary',
      confirmLabel: 'Send Email',
      onConfirm: async () => {
        await sendGmailMessage(composeTo, composeSubject, composeBody);
        showToast('Email sent successfully!');
        setIsComposeOpen(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        loadGmail();
      }
    });
  };

  // -------------------------------------------------------------
  // GOOGLE DRIVE STATE
  // -------------------------------------------------------------
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveSearch, setDriveSearch] = useState('');
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isNewDriveFileOpen, setIsNewDriveFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');

  const loadDrive = async (q = driveSearch) => {
    if (!hasToken) return;
    setIsDriveLoading(true);
    try {
      const files = await listDriveFiles(q);
      setDriveFiles(files);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleCreateDriveFile = async () => {
    if (!newFileName.trim()) return;
    try {
      await createDriveTextFile(newFileName.trim(), newFileContent);
      showToast(`Created file "${newFileName}" in Google Drive!`);
      setIsNewDriveFileOpen(false);
      setNewFileName('');
      setNewFileContent('');
      loadDrive();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const promptDeleteDriveFile = (file: DriveFileItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete File from Google Drive',
      description: `Are you sure you want to permanently delete "${file.name}"? This action cannot be undone.`,
      actionType: 'danger',
      confirmLabel: 'Delete File',
      onConfirm: async () => {
        await deleteDriveFile(file.id);
        showToast(`Deleted "${file.name}"`);
        loadDrive();
      }
    });
  };

  // -------------------------------------------------------------
  // GOOGLE SHEETS STATE
  // -------------------------------------------------------------
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetSummary[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [sheetDetails, setSheetDetails] = useState<{ title: string; sheets: SheetTabInfo[] } | null>(null);
  const [activeTabTitle, setActiveTabTitle] = useState<string>('');
  const [sheetGrid, setSheetGrid] = useState<string[][]>([]);
  const [isSheetsLoading, setIsSheetsLoading] = useState(false);
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [isAppendRowOpen, setIsAppendRowOpen] = useState(false);
  const [appendRowInputs, setAppendRowInputs] = useState<string>('');

  const loadSpreadsheets = async () => {
    if (!hasToken) return;
    setIsSheetsLoading(true);
    try {
      const list = await listSpreadsheets();
      setSpreadsheets(list);
      if (list.length > 0 && !selectedSheetId) {
        handleSelectSpreadsheet(list[0].id);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleSelectSpreadsheet = async (id: string) => {
    setSelectedSheetId(id);
    setIsSheetsLoading(true);
    try {
      const details = await getSpreadsheetDetails(id);
      setSheetDetails(details);
      const firstTab = details.sheets[0]?.title || 'Sheet1';
      setActiveTabTitle(firstTab);
      const values = await getSheetValues(id, `${firstTab}!A1:Z50`);
      setSheetGrid(values);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleSwitchSheetTab = async (tabName: string) => {
    if (!selectedSheetId) return;
    setActiveTabTitle(tabName);
    setIsSheetsLoading(true);
    try {
      const values = await getSheetValues(selectedSheetId, `${tabName}!A1:Z50`);
      setSheetGrid(values);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const promptAppendRow = () => {
    if (!appendRowInputs.trim() || !selectedSheetId) return;
    const values = appendRowInputs.split(',').map(s => s.trim());

    setConfirmModal({
      isOpen: true,
      title: 'Append Row to Spreadsheet',
      description: `Append ${values.length} value(s) to "${sheetDetails?.title || 'Spreadsheet'}" in tab "${activeTabTitle}"?`,
      actionType: 'primary',
      confirmLabel: 'Append Row',
      onConfirm: async () => {
        await appendSheetRow(selectedSheetId, `${activeTabTitle}!A1`, values);
        showToast('Row appended successfully!');
        setIsAppendRowOpen(false);
        setAppendRowInputs('');
        handleSwitchSheetTab(activeTabTitle);
      }
    });
  };

  const handleCreateSpreadsheet = async () => {
    if (!newSheetTitle.trim()) return;
    try {
      const res = await createSpreadsheet(newSheetTitle.trim(), ['Item', 'Category', 'Date', 'Notes']);
      showToast(`Created spreadsheet "${newSheetTitle}"!`);
      setIsNewSheetOpen(false);
      setNewSheetTitle('');
      loadSpreadsheets();
      if (res.spreadsheetId) {
        handleSelectSpreadsheet(res.spreadsheetId);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // GOOGLE DOCS STATE
  // -------------------------------------------------------------
  const [docsList, setDocsList] = useState<DocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [activeDocContent, setActiveDocContent] = useState<{ title: string; text: string } | null>(null);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocInitialText, setNewDocInitialText] = useState('');
  const [isAppendDocOpen, setIsAppendDocOpen] = useState(false);
  const [appendDocTextVal, setAppendDocTextVal] = useState('');

  const loadDocs = async () => {
    if (!hasToken) return;
    setIsDocsLoading(true);
    try {
      const docs = await listGoogleDocs();
      setDocsList(docs);
      if (docs.length > 0 && !selectedDocId) {
        handleSelectDoc(docs[0].id);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsDocsLoading(false);
    }
  };

  const handleSelectDoc = async (id: string) => {
    setSelectedDocId(id);
    setIsDocsLoading(true);
    try {
      const content = await getGoogleDocContent(id);
      setActiveDocContent(content);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsDocsLoading(false);
    }
  };

  const promptAppendDocText = () => {
    if (!appendDocTextVal.trim() || !selectedDocId) return;

    setConfirmModal({
      isOpen: true,
      title: 'Update Google Document',
      description: `Insert new text into document "${activeDocContent?.title || 'Document'}"?`,
      actionType: 'primary',
      confirmLabel: 'Insert Text',
      onConfirm: async () => {
        await appendGoogleDocText(selectedDocId, appendDocTextVal.trim());
        showToast('Text added to document!');
        setIsAppendDocOpen(false);
        setAppendDocTextVal('');
        handleSelectDoc(selectedDocId);
      }
    });
  };

  const handleCreateDoc = async () => {
    if (!newDocTitle.trim()) return;
    try {
      const res = await createGoogleDoc(newDocTitle.trim(), newDocInitialText);
      showToast(`Created document "${newDocTitle}"!`);
      setIsNewDocOpen(false);
      setNewDocTitle('');
      setNewDocInitialText('');
      loadDocs();
      if (res.documentId) {
        handleSelectDoc(res.documentId);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // GOOGLE CALENDAR STATE
  // -------------------------------------------------------------
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [eventSummary, setEventSummary] = useState('');
  const [eventStart, setEventStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [eventEnd, setEventEnd] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [eventLocation, setEventLocation] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  const loadCalendar = async () => {
    if (!hasToken) return;
    setIsCalendarLoading(true);
    try {
      const events = await listCalendarEvents();
      setCalendarEvents(events);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventSummary.trim()) {
      showToast('Event summary is required.', 'error');
      return;
    }
    try {
      await createCalendarEvent(eventSummary.trim(), eventStart, eventEnd, eventDesc, eventLocation);
      showToast(`Scheduled "${eventSummary}"!`);
      setIsNewEventOpen(false);
      setEventSummary('');
      setEventDesc('');
      setEventLocation('');
      loadCalendar();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const promptDeleteCalendarEvent = (event: CalendarEventItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Calendar Event',
      description: `Are you sure you want to remove "${event.summary}" from your Google Calendar?`,
      actionType: 'danger',
      confirmLabel: 'Delete Event',
      onConfirm: async () => {
        await deleteCalendarEvent(event.id);
        showToast('Event deleted.');
        loadCalendar();
      }
    });
  };

  // -------------------------------------------------------------
  // GOOGLE TASKS STATE
  // -------------------------------------------------------------
  const [taskLists, setTaskLists] = useState<TaskListItem[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>('@default');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const loadTaskLists = async () => {
    if (!hasToken) return;
    setIsTasksLoading(true);
    try {
      const lists = await listTaskLists();
      setTaskLists(lists);
      const defaultId = lists[0]?.id || '@default';
      setSelectedTaskListId(defaultId);
      const items = await listTasksInList(defaultId);
      setTasks(items);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsTasksLoading(false);
    }
  };

  const handleSelectTaskList = async (listId: string) => {
    setSelectedTaskListId(listId);
    setIsTasksLoading(true);
    try {
      const items = await listTasksInList(listId);
      setTasks(items);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsTasksLoading(false);
    }
  };

  const handleToggleTaskStatus = async (task: TaskItem) => {
    const nextStatus = task.status !== 'completed';
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus ? 'completed' : 'needsAction' } : t));
    try {
      await updateTaskStatus(selectedTaskListId, task.id, nextStatus);
    } catch (err: any) {
      showToast(err.message, 'error');
      // Rollback
      handleSelectTaskList(selectedTaskListId);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await createTask(selectedTaskListId, newTaskTitle.trim(), newTaskNotes, newTaskDueDate);
      showToast(`Added task "${newTaskTitle}"!`);
      setIsNewTaskOpen(false);
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDueDate('');
      handleSelectTaskList(selectedTaskListId);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const promptDeleteTask = (task: TaskItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Task',
      description: `Are you sure you want to delete task "${task.title}"?`,
      actionType: 'danger',
      confirmLabel: 'Delete Task',
      onConfirm: async () => {
        await deleteTask(selectedTaskListId, task.id);
        showToast('Task deleted.');
        handleSelectTaskList(selectedTaskListId);
      }
    });
  };

  // Trigger loads when tab changes or auth becomes available
  useEffect(() => {
    if (!hasToken) return;
    if (activeTab === 'gmail' && gmailMessages.length === 0) loadGmail();
    if (activeTab === 'drive' && driveFiles.length === 0) loadDrive();
    if (activeTab === 'sheets' && spreadsheets.length === 0) loadSpreadsheets();
    if (activeTab === 'docs' && docsList.length === 0) loadDocs();
    if (activeTab === 'calendar' && calendarEvents.length === 0) loadCalendar();
    if (activeTab === 'tasks' && tasks.length === 0) loadTaskLists();
  }, [activeTab, hasToken]);

  // Handle importing context to chat
  const handleImportToChat = (title: string, content: string) => {
    if (onSendToChat) {
      const formatted = `Here is information from my connected Google Workspace:\n\n### ${title}\n${content}\n\nPlease help me analyze or answer questions about this.`;
      onSendToChat(formatted);
      showToast('Sent to chat! Opening chat conversation...');
      onBackToChat();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--background)] text-[var(--text-primary)] overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border transition-all animate-in fade-in slide-in-from-top-3 ${
            toastMessage.type === 'error' 
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/50' 
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
          }`}
        >
          <span>{toastMessage.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Confirmation Modal for Destructive / Mutating operations */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${confirmModal.actionType === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{confirmModal.title}</h3>
                <p className="text-xs text-[var(--text-secondary)]">Confirmation Required</p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isConfirmProcessing}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--background)] border border-[var(--border-color)] transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isConfirmProcessing}
                onClick={async () => {
                  setIsConfirmProcessing(true);
                  try {
                    await confirmModal.onConfirm();
                  } catch (e: any) {
                    showToast(e.message || 'Operation failed', 'error');
                  } finally {
                    setIsConfirmProcessing(false);
                    setConfirmModal(null);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-md ${
                  confirmModal.actionType === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {isConfirmProcessing && (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                <span>{confirmModal.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--card-bg)] flex-shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Connect Hub</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Google Workspace
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Real integration with Gmail, Google Drive, Sheets, Docs, Calendar, and Tasks
            </p>
          </div>
        </div>

        {/* Right Header Auth controls */}
        <div className="flex items-center gap-2">
          {currentUser && hasToken ? (
            <div className="flex items-center gap-2.5 bg-[var(--background)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'Google User'} 
                  className="w-7 h-7 rounded-full border border-indigo-500/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  {(currentUser.displayName || currentUser.email || 'G')[0].toUpperCase()}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                  {currentUser.displayName || 'Google User'}
                </div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Connected</span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-2 px-2 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Disconnect Google account"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="gsi-material-button px-4 py-2 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2.5 bg-white text-zinc-800 hover:bg-zinc-100 transition-all active:scale-[0.98]"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}

          <button
            onClick={onBackToChat}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--card-bg)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Chat</span>
          </button>
        </div>
      </div>

      {/* Auth Banner Prompt when not logged in */}
      {!hasToken && (
        <div className="p-6 m-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-zinc-900/60 to-purple-950/40 border border-indigo-500/30 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-bold text-white">Google Workspace Authorization</h2>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Sign in with your Google Account to access your personal Gmail inbox, browse Google Drive files, query Sheets, view Docs, schedule Calendar meetings, and manage Tasks.
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={isAuthenticating}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-white text-zinc-900 hover:bg-zinc-100 transition-all inline-flex items-center gap-2 shadow-xl active:scale-[0.98]"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>{isAuthenticating ? 'Connecting via Google...' : 'Authorize Google Workspace'}</span>
          </button>

          {authError && (
            <p className="text-xs text-rose-400 font-mono max-w-md mx-auto">
              {authError}
            </p>
          )}
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="px-4 border-b border-[var(--border-color)] bg-[var(--card-bg)] flex items-center gap-1 overflow-x-auto flex-shrink-0">
        {[
          { id: 'agent_tools', label: 'Agent Tools (1-Click Connect)', icon: '⚡' },
          { id: 'gmail', label: 'Gmail', icon: '✉️' },
          { id: 'drive', label: 'Google Drive', icon: '📁' },
          { id: 'sheets', label: 'Sheets', icon: '📊' },
          { id: 'docs', label: 'Docs', icon: '📄' },
          { id: 'calendar', label: 'Calendar', icon: '📅' },
          { id: 'tasks', label: 'Tasks', icon: '☑️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5 font-bold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Tab Panels Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ========================================================= */}
        {/* 0. AGENT TOOLS TAB (1-CLICK CONNECT FOR AGENTS) */}
        {/* ========================================================= */}
        {activeTab === 'agent_tools' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            {/* Command Header Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-black border border-indigo-500/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      Agent Function Tools Center
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {Object.values(toolsConfig.enabledApps).filter(Boolean).length} of 6 Apps Active
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
                    Connect individual Google Workspace tools or the entire full stack to the AI Agent. 
                    When enabled, the agent executes real queries and updates directly inside your chats.
                  </p>
                </div>

                {/* 1-Click Full Stack Button */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {Object.values(toolsConfig.enabledApps).every(Boolean) ? (
                    <button
                      onClick={() => setFullStack(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 transition-all shadow"
                    >
                      Disconnect Full Stack
                    </button>
                  ) : (
                    <button
                      onClick={() => setFullStack(true)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition-all shadow-lg flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>⚡</span>
                      <span>1-Click Connect Full Stack (All 6)</span>
                    </button>
                  )}
                </div>
              </div>

              {!hasToken && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Google Workspace account not connected yet. Authorize once to enable live execution.</span>
                  </div>
                  <button
                    onClick={handleSignIn}
                    className="px-3 py-1 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 flex-shrink-0 transition-colors"
                  >
                    Sign In with Google
                  </button>
                </div>
              )}
            </div>

            {/* Apps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[
                {
                  id: 'gmail' as WorkspaceAppName,
                  name: 'Gmail Agent Tools',
                  icon: '✉️',
                  accent: 'from-rose-500/20 to-red-500/10 border-rose-500/30',
                  color: 'text-rose-400',
                  desc: 'Search inbox, read emails and threads, inspect sender details, and send emails.',
                  samplePrompt: 'Check my Gmail inbox for any recent emails from today',
                  tools: ['gmail_search_or_list', 'gmail_get_message', 'gmail_send_message']
                },
                {
                  id: 'drive' as WorkspaceAppName,
                  name: 'Google Drive Agent Tools',
                  icon: '📁',
                  accent: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30',
                  color: 'text-amber-400',
                  desc: 'Search Drive files, find recent folders, read document summaries, and create files.',
                  samplePrompt: 'List files in my Google Drive and find my recent docs',
                  tools: ['drive_list_or_search', 'drive_create_file']
                },
                {
                  id: 'sheets' as WorkspaceAppName,
                  name: 'Google Sheets Agent Tools',
                  icon: '📊',
                  accent: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
                  color: 'text-emerald-400',
                  desc: 'Query spreadsheets, inspect sheet tabs, read tabular data cells, and append rows.',
                  samplePrompt: 'Find my budget spreadsheet and show me the data',
                  tools: ['sheets_list', 'sheets_read_values', 'sheets_append_row']
                },
                {
                  id: 'docs' as WorkspaceAppName,
                  name: 'Google Docs Agent Tools',
                  icon: '📄',
                  accent: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30',
                  color: 'text-blue-400',
                  desc: 'Search documents, read document text and structure, and append content.',
                  samplePrompt: 'Search for my meeting notes doc and summarize what is inside',
                  tools: ['docs_list', 'docs_get_content', 'docs_append_text']
                },
                {
                  id: 'calendar' as WorkspaceAppName,
                  name: 'Calendar Agent Tools',
                  icon: '📅',
                  accent: 'from-cyan-500/20 to-teal-500/10 border-cyan-500/30',
                  color: 'text-cyan-400',
                  desc: 'List upcoming events, check meetings and schedule, and create new calendar events.',
                  samplePrompt: 'What events and meetings do I have on my calendar for the upcoming week?',
                  tools: ['calendar_list_events', 'calendar_create_event']
                },
                {
                  id: 'tasks' as WorkspaceAppName,
                  name: 'Tasks Agent Tools',
                  icon: '☑️',
                  accent: 'from-purple-500/20 to-fuchsia-500/10 border-purple-500/30',
                  color: 'text-purple-400',
                  desc: 'Browse task lists, inspect pending to-dos, create new tasks, and mark tasks completed.',
                  samplePrompt: 'Show all my pending Google Tasks and add a reminder to review project notes',
                  tools: ['tasks_list', 'tasks_create', 'tasks_update_status']
                }
              ].map((app) => {
                const isEnabled = !!toolsConfig.enabledApps[app.id];
                return (
                  <div 
                    key={app.id} 
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isEnabled 
                        ? 'bg-[var(--card-bg)] border-indigo-500/40 shadow-md' 
                        : 'bg-[var(--card-bg)]/50 border-[var(--border-color)] opacity-75'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{app.icon}</span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{app.name}</span>
                        </div>
                        {/* 1-Click Connect Button */}
                        <button
                          onClick={() => toggleWorkspaceApp(app.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                            isEnabled
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-300'
                              : 'bg-[var(--background)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-indigo-500'
                          }`}
                        >
                          {isEnabled ? '✓ Connected' : '+ Connect 1'}
                        </button>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {app.desc}
                      </p>

                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {app.tools.map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-[var(--background)] text-[10px] font-mono text-zinc-400 border border-[var(--border-color)]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Quick Ask in Chat Button */}
                    <button
                      onClick={() => {
                        if (onSendToChat) {
                          onSendToChat(app.samplePrompt);
                          onBackToChat();
                        }
                      }}
                      className="w-full text-left p-2 rounded-xl bg-[var(--background)] hover:bg-indigo-500/10 border border-[var(--border-color)] hover:border-indigo-500/30 text-[11px] text-[var(--text-secondary)] hover:text-indigo-300 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">" {app.samplePrompt} "</span>
                      <span className="text-indigo-400 font-bold ml-1.5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform">→</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ========================================================= */}
        {activeTab === 'gmail' && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border-color)]">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search emails (e.g. from:support, is:unread)..."
                  value={gmailSearch}
                  onChange={(e) => setGmailSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadGmail(gmailSearch)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => loadGmail(gmailSearch)}
                  disabled={!hasToken || isGmailLoading}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex-shrink-0"
                >
                  {isGmailLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadGmail('')}
                  disabled={!hasToken || isGmailLoading}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--background)] text-xs font-semibold text-[var(--text-secondary)] transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setIsComposeOpen(true)}
                  disabled={!hasToken}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Compose Email</span>
                </button>
              </div>
            </div>

            {/* Email Viewer Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Messages list */}
              <div className="md:col-span-5 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col max-h-[580px]">
                <div className="p-3 border-b border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] flex justify-between items-center bg-[var(--background)]">
                  <span>Messages ({gmailMessages.length})</span>
                  {isGmailLoading && <span className="text-[10px] text-indigo-400 font-mono animate-pulse">Syncing...</span>}
                </div>

                <div className="overflow-y-auto flex-1 divide-y divide-[var(--border-color)]">
                  {gmailMessages.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                      {isGmailLoading ? 'Loading Gmail messages...' : 'No messages found. Click Search or check authorization.'}
                    </div>
                  ) : (
                    gmailMessages.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => handleViewEmail(msg.id)}
                        className={`p-3 text-left transition-colors cursor-pointer ${
                          selectedEmail?.id === msg.id 
                            ? 'bg-indigo-500/10 border-l-2 border-indigo-500' 
                            : 'hover:bg-[var(--background)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs truncate font-semibold ${msg.unread ? 'text-indigo-300 font-bold' : 'text-[var(--text-primary)]'}`}>
                            {msg.from}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)] flex-shrink-0 font-mono">
                            {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-[var(--text-primary)] truncate mb-0.5">
                          {msg.subject}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                          {msg.snippet}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Message Details Preview */}
              <div className="md:col-span-7 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-4 flex flex-col min-h-[400px]">
                {isEmailDetailLoading ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-secondary)]">
                    Loading full email...
                  </div>
                ) : selectedEmail ? (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="border-b border-[var(--border-color)] pb-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-bold text-[var(--text-primary)]">{selectedEmail.subject}</h2>
                        <button
                          onClick={() => handleImportToChat(
                            `Email: ${selectedEmail.subject}`,
                            `From: ${selectedEmail.from}\nTo: ${selectedEmail.to}\nDate: ${selectedEmail.date}\n\nContent:\n${selectedEmail.body}`
                          )}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors flex items-center gap-1 flex-shrink-0"
                          title="Import this email content into active AI chat session"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>Ask AI in Chat</span>
                        </button>
                      </div>

                      <div className="text-xs text-[var(--text-secondary)] space-y-0.5 font-mono">
                        <div><strong className="text-[var(--text-primary)]">From:</strong> {selectedEmail.from}</div>
                        <div><strong className="text-[var(--text-primary)]">To:</strong> {selectedEmail.to}</div>
                        <div><strong className="text-[var(--text-primary)]">Date:</strong> {selectedEmail.date}</div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-xs text-[var(--text-primary)] leading-relaxed font-sans p-2 bg-[var(--background)] rounded-xl border border-[var(--border-color)]">
                      {selectedEmail.body}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-[var(--text-secondary)] p-8">
                    <span className="text-3xl mb-2">✉️</span>
                    <p className="font-semibold text-[var(--text-primary)]">Select an email to view full content</p>
                    <p className="max-w-xs mt-1">Read your incoming messages, examine headers, or compose replies.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Compose Email Modal */}
            {isComposeOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <span>✉️</span>
                      <span>Compose New Email</span>
                    </h3>
                    <button onClick={() => setIsComposeOpen(false)} className="text-zinc-400 hover:text-white text-xs">
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">To (Email Address)</label>
                      <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={composeTo}
                        onChange={(e) => setComposeTo(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Subject</label>
                      <input
                        type="text"
                        placeholder="Subject line..."
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Message Body</label>
                      <textarea
                        rows={6}
                        placeholder="Write your email content here..."
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                    <button
                      onClick={() => setIsComposeOpen(false)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={promptSendEmail}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                    >
                      Send Email
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. GOOGLE DRIVE TAB */}
        {/* ========================================================= */}
        {activeTab === 'drive' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border-color)]">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search files in Google Drive..."
                  value={driveSearch}
                  onChange={(e) => setDriveSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadDrive(driveSearch)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => loadDrive(driveSearch)}
                  disabled={!hasToken || isDriveLoading}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex-shrink-0"
                >
                  {isDriveLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadDrive('')}
                  disabled={!hasToken || isDriveLoading}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--background)] text-xs font-semibold text-[var(--text-secondary)] transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setIsNewDriveFileOpen(true)}
                  disabled={!hasToken}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Text/Note File</span>
                </button>
              </div>
            </div>

            {/* Files Grid */}
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="p-3 border-b border-[var(--border-color)] bg-[var(--background)] flex justify-between items-center text-xs font-bold text-[var(--text-primary)]">
                <span>Drive Files ({driveFiles.length})</span>
                {isDriveLoading && <span className="text-[10px] text-indigo-400 font-mono animate-pulse">Loading files...</span>}
              </div>

              <div className="divide-y divide-[var(--border-color)] max-h-[600px] overflow-y-auto">
                {driveFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    {isDriveLoading ? 'Loading Drive files...' : 'No files found. Ensure permissions are authorized.'}
                  </div>
                ) : (
                  driveFiles.map((file) => (
                    <div key={file.id} className="p-3 hover:bg-[var(--background)] transition-colors flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-base flex-shrink-0">
                          {file.mimeType.includes('spreadsheet') ? '📊' : file.mimeType.includes('document') ? '📄' : file.mimeType.includes('folder') ? '📁' : '📝'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-2 font-mono">
                            <span>{file.mimeType.split('.').pop() || file.mimeType}</span>
                            {file.modifiedTime && <span>• {new Date(file.modifiedTime).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--card-bg)] transition-colors"
                          >
                            Open in Drive ↗
                          </a>
                        )}
                        <button
                          onClick={() => promptDeleteDriveFile(file)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                          title="Delete file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* New File Modal */}
            {isNewDriveFileOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Create File in Google Drive</h3>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">File Name</label>
                    <input
                      type="text"
                      placeholder="e.g. ProjectNotes.txt"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Content</label>
                    <textarea
                      rows={5}
                      placeholder="File text content..."
                      value={newFileContent}
                      onChange={(e) => setNewFileContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                    <button onClick={() => setIsNewDriveFileOpen(false)} className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                      Cancel
                    </button>
                    <button onClick={handleCreateDriveFile} className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                      Upload File
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. GOOGLE SHEETS TAB */}
        {/* ========================================================= */}
        {activeTab === 'sheets' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border-color)]">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex-shrink-0">Spreadsheet:</label>
                <select
                  value={selectedSheetId}
                  onChange={(e) => handleSelectSpreadsheet(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                >
                  {spreadsheets.length === 0 ? (
                    <option value="">No spreadsheets found</option>
                  ) : (
                    spreadsheets.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadSpreadsheets}
                  disabled={!hasToken || isSheetsLoading}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--background)] text-xs font-semibold text-[var(--text-secondary)] transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setIsAppendRowOpen(true)}
                  disabled={!selectedSheetId}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                >
                  Append Row
                </button>
                <button
                  onClick={() => setIsNewSheetOpen(true)}
                  disabled={!hasToken}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow"
                >
                  Create Spreadsheet
                </button>
              </div>
            </div>

            {/* Tab selector within selected spreadsheet */}
            {sheetDetails && sheetDetails.sheets.length > 0 && (
              <div className="flex items-center justify-between gap-2 bg-[var(--card-bg)] px-3 py-2 rounded-xl border border-[var(--border-color)]">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">Tabs:</span>
                  {sheetDetails.sheets.map((tab) => (
                    <button
                      key={tab.title}
                      onClick={() => handleSwitchSheetTab(tab.title)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        activeTabTitle === tab.title
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--background)]'
                      }`}
                    >
                      {tab.title}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleImportToChat(
                    `Google Sheet: ${sheetDetails.title} (${activeTabTitle})`,
                    sheetGrid.map(row => row.join(' | ')).join('\n')
                  )}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center gap-1 flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Ask AI about Sheet</span>
                </button>
              </div>
            )}

            {/* Table Grid View */}
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="p-3 border-b border-[var(--border-color)] bg-[var(--background)] flex justify-between items-center text-xs font-bold text-[var(--text-primary)]">
                <span>{sheetDetails?.title || 'Spreadsheet Grid'} • {activeTabTitle}</span>
                {isSheetsLoading && <span className="text-[10px] text-emerald-400 font-mono animate-pulse">Reading cells...</span>}
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                {sheetGrid.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    {isSheetsLoading ? 'Fetching sheet values...' : 'No cells populated or empty sheet.'}
                  </div>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--background)] border-b border-[var(--border-color)]">
                        <th className="p-2 border-r border-[var(--border-color)] w-10 text-center font-mono text-[10px] text-[var(--text-secondary)]">#</th>
                        {sheetGrid[0]?.map((col, idx) => (
                          <th key={idx} className="p-2.5 font-bold text-[var(--text-primary)] border-r border-[var(--border-color)] last:border-r-0">
                            {col || `Col ${idx + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {sheetGrid.slice(1).map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-[var(--background)]/50 transition-colors">
                          <td className="p-2 border-r border-[var(--border-color)] text-center font-mono text-[10px] text-[var(--text-secondary)]">
                            {rowIdx + 2}
                          </td>
                          {sheetGrid[0]?.map((_, colIdx) => (
                            <td key={colIdx} className="p-2.5 border-r border-[var(--border-color)] last:border-r-0 text-[var(--text-primary)]">
                              {row[colIdx] || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Append Row Modal */}
            {isAppendRowOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Append Row to {activeTabTitle}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Enter comma-separated values to insert at the end of the table.
                  </p>
                  <div>
                    <input
                      type="text"
                      placeholder="e.g. Sales Q3, Revenue, 2026-09-20, Verified"
                      value={appendRowInputs}
                      onChange={(e) => setAppendRowInputs(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                    <button onClick={() => setIsAppendRowOpen(false)} className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                      Cancel
                    </button>
                    <button onClick={promptAppendRow} className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                      Append
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create Spreadsheet Modal */}
            {isNewSheetOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Create New Google Sheet</h3>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Financial Overview 2026"
                      value={newSheetTitle}
                      onChange={(e) => setNewSheetTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                    <button onClick={() => setIsNewSheetOpen(false)} className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                      Cancel
                    </button>
                    <button onClick={handleCreateSpreadsheet} className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
                      Create
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. GOOGLE DOCS TAB */}
        {/* ========================================================= */}
        {activeTab === 'docs' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border-color)]">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex-shrink-0">Document:</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => handleSelectDoc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                >
                  {docsList.length === 0 ? (
                    <option value="">No Google Docs found</option>
                  ) : (
                    docsList.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadDocs}
                  disabled={!hasToken || isDocsLoading}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--background)] text-xs font-semibold text-[var(--text-secondary)] transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setIsAppendDocOpen(true)}
                  disabled={!selectedDocId}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                >
                  Insert Text
                </button>
                <button
                  onClick={() => setIsNewDocOpen(true)}
                  disabled={!hasToken}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow"
                >
                  Create Document
                </button>
              </div>
            </div>

            {/* Document Reader & Content View */}
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-4 space-y-3 min-h-[450px] flex flex-col">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {activeDocContent?.title || 'Document Content'}
                  </h2>
                  <p className="text-[11px] text-[var(--text-secondary)]">Google Docs REST View</p>
                </div>

                {activeDocContent && (
                  <button
                    onClick={() => handleImportToChat(
                      `Google Doc: ${activeDocContent.title}`,
                      activeDocContent.text
                    )}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Discuss Document with AI</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-xs text-[var(--text-primary)] leading-relaxed font-sans p-4 bg-[var(--background)] rounded-xl border border-[var(--border-color)] max-h-[500px]">
                {isDocsLoading ? (
                  <div className="p-8 text-center text-[var(--text-secondary)]">Loading document content...</div>
                ) : activeDocContent?.text ? (
                  activeDocContent.text
                ) : (
                  <div className="p-8 text-center text-[var(--text-secondary)]">
                    No document selected or document is empty.
                  </div>
                )}
              </div>
            </div>

            {/* Insert Text Modal */}
            {isAppendDocOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Insert Text to {activeDocContent?.title}</h3>
                  <textarea
                    rows={6}
                    placeholder="Text to append to end of document..."
                    value={appendDocTextVal}
                    onChange={(e) => setAppendDocTextVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                    <button onClick={() => setIsAppendDocOpen(false)} className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                      Cancel
                    </button>
                    <button onClick={promptAppendDocText} className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold">
                      Insert Text
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create Doc Modal */}
            {isNewDocOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Create Google Document</h3>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. AI Product Requirements"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Initial Content (Optional)</label>
                    <textarea
                      rows={4}
                      placeholder="Initial body text..."
                      value={newDocInitialText}
                      onChange={(e) => setNewDocInitialText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                    <button onClick={() => setIsNewDocOpen(false)} className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                      Cancel
                    </button>
                    <button onClick={handleCreateDoc} className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
                      Create Doc
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. GOOGLE CALENDAR TAB */}
        {/* ========================================================= */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border-color)]">
              <div>
                <h2 className="text-xs font-bold text-[var(--text-primary)]">Upcoming Calendar Events</h2>
                <p className="text-[11px] text-[var(--text-secondary)]">Synced directly with Google Calendar</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadCalendar}
                  disabled={!hasToken || isCalendarLoading}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--background)] text-xs font-semibold text-[var(--text-secondary)] transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setIsNewEventOpen(true)}
                  disabled={!hasToken}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Event</span>
                </button>
              </div>
            </div>

            {/* Event Timeline List */}
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="divide-y divide-[var(--border-color)] max-h-[600px] overflow-y-auto">
                {calendarEvents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    {isCalendarLoading ? 'Loading upcoming events...' : 'No upcoming events found.'}
                  </div>
                ) : (
                  calendarEvents.map((evt) => {
                    const startStr = evt.start.dateTime ? new Date(evt.start.dateTime).toLocaleString() : evt.start.date || '';
                    const endStr = evt.end.dateTime ? new Date(evt.end.dateTime).toLocaleTimeString() : '';

                    return (
                      <div key={evt.id} className="p-3.5 hover:bg-[var(--background)] transition-colors flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col items-center justify-center text-purple-300 flex-shrink-0">
                            <span className="text-[10px] font-bold uppercase">
                              {evt.start.dateTime ? new Date(evt.start.dateTime).toLocaleString('default', { month: 'short' }) : 'DAY'}
                            </span>
                            <span className="text-xs font-black">
                              {evt.start.dateTime ? new Date(evt.start.dateTime).getDate() : '•'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs font-bold text-[var(--text-primary)]">
                              {evt.summary}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-2">
                              <span>🕒 {startStr} {endStr ? `- ${endStr}` : ''}</span>
                              {evt.location && <span>📍 {evt.location}</span>}
                            </div>
                            {evt.description && (
                              <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                                {evt.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleImportToChat(
                              `Meeting: ${evt.summary}`,
                              `Time: ${startStr}\nLocation: ${evt.location || 'None'}\nDetails:\n${evt.description || 'No description'}`
                            )}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                            title="Discuss or prepare meeting notes with AI"
                          >
                            Discuss in Chat
                          </button>
                          <button
                            onClick={() => promptDeleteCalendarEvent(evt)}
                            className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                            title="Delete event"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* New Event Modal */}
            {isNewEventOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Schedule Google Calendar Event</h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Title / Summary</label>
                      <input
                        type="text"
                        placeholder="e.g. Sprint Sync with Engineering"
                        value={eventSummary}
                        onChange={(e) => setEventSummary(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Start Time</label>
                        <input
                          type="datetime-local"
                          value={eventStart}
                          onChange={(e) => setEventStart(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">End Time</label>
                        <input
                          type="datetime-local"
                          value={eventEnd}
                          onChange={(e) => setEventEnd(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Location (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Google Meet / Room 302"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Description</label>
                      <textarea
                        rows={3}
                        placeholder="Agenda and notes..."
                        value={eventDesc}
                        onChange={(e) => setEventDesc(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                    <button onClick={() => setIsNewEventOpen(false)} className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                      Cancel
                    </button>
                    <button onClick={handleCreateEvent} className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold">
                      Create Event
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. GOOGLE TASKS TAB */}
        {/* ========================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border-color)]">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex-shrink-0">Task List:</label>
                <select
                  value={selectedTaskListId}
                  onChange={(e) => handleSelectTaskList(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                >
                  {taskLists.length === 0 ? (
                    <option value="@default">Default List</option>
                  ) : (
                    taskLists.map((l) => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectTaskList(selectedTaskListId)}
                  disabled={!hasToken || isTasksLoading}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--background)] text-xs font-semibold text-[var(--text-secondary)] transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setIsNewTaskOpen(true)}
                  disabled={!hasToken}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Task</span>
                </button>
              </div>
            </div>

            {/* Task Items List */}
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="divide-y divide-[var(--border-color)] max-h-[600px] overflow-y-auto">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    {isTasksLoading ? 'Loading tasks...' : 'No tasks in this list. Create one to get started!'}
                  </div>
                ) : (
                  tasks.map((t) => {
                    const isCompleted = t.status === 'completed';

                    return (
                      <div key={t.id} className="p-3 hover:bg-[var(--background)] transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => handleToggleTaskStatus(t)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                              isCompleted 
                                ? 'bg-cyan-500 border-cyan-400 text-white' 
                                : 'border-zinc-500 hover:border-cyan-400'
                            }`}
                          >
                            {isCompleted && (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className={`text-xs font-medium truncate ${isCompleted ? 'line-through text-zinc-500' : 'text-[var(--text-primary)]'}`}>
                              {t.title}
                            </div>
                            {t.notes && (
                              <div className="text-[10px] text-[var(--text-secondary)] truncate">
                                {t.notes}
                              </div>
                            )}
                            {t.due && (
                              <div className="text-[9px] text-cyan-400 font-mono">
                                Due: {new Date(t.due).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleImportToChat(
                              `Task: ${t.title}`,
                              `Status: ${t.status}\nDue: ${t.due || 'No date'}\nNotes: ${t.notes || 'None'}`
                            )}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          >
                            Ask AI
                          </button>
                          <button
                            onClick={() => promptDeleteTask(t)}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                            title="Delete task"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* New Task Modal */}
            {isNewTaskOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Add New Google Task</h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Title</label>
                      <input
                        type="text"
                        placeholder="What needs to be done?"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Due Date (Optional)</label>
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Notes / Details (Optional)</label>
                      <textarea
                        rows={3}
                        placeholder="Additional details..."
                        value={newTaskNotes}
                        onChange={(e) => setNewTaskNotes(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                    <button onClick={() => setIsNewTaskOpen(false)} className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                      Cancel
                    </button>
                    <button onClick={handleCreateTask} className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold">
                      Add Task
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
