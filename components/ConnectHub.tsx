import React, { useState, useEffect } from 'react';
import { 
  googleSignIn, 
  logout, 
  subscribeAuth 
} from '../services/workspaceAuthService';
import { 
  getWorkspaceToolsConfig, 
  toggleWorkspaceApp, 
  setFullStack, 
  subscribeWorkspaceTools 
} from '../services/workspaceToolService';
import { WorkspaceAppName, WorkspaceToolsConfig } from '../types';
import { User } from 'firebase/auth';
import { 
  GmailIcon, 
  GoogleDriveIcon, 
  GoogleSheetsIcon, 
  GoogleDocsIcon, 
  GoogleCalendarIcon, 
  GoogleTasksIcon, 
  GoogleWorkspaceIcon,
  GoogleLogo 
} from './GoogleAppIcons';

interface ConnectHubProps {
  onToggleSidebar?: () => void;
  onSendToChat?: (text: string) => void;
  onBackToChat: () => void;
}

export const ConnectHub: React.FC<ConnectHubProps> = ({
  onToggleSidebar,
  onSendToChat,
  onBackToChat
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [toolsConfig, setToolsConfig] = useState<WorkspaceToolsConfig>(getWorkspaceToolsConfig());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    return subscribeWorkspaceTools((cfg) => setToolsConfig(cfg));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuth((user, token) => {
      setCurrentUser(user);
      setHasToken(!!token);
    });
    return () => unsubscribe();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        showToast('Connected to Google Workspace!');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to authenticate.';
      setAuthError(msg);
      showToast(msg, 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      showToast('Disconnected Google Workspace.');
    } catch (err: any) {
      console.error(err);
    }
  };

  const apps = [
    {
      id: 'gmail' as WorkspaceAppName,
      name: 'Gmail',
      Icon: GmailIcon,
      serviceTag: 'Google Mail',
      accentColor: '#EA4335',
      badgeClass: 'text-red-400 bg-red-500/10 border-red-500/20',
      desc: 'Connect your inbox to allow agents to search, read, and send emails on your behalf.',
      samplePrompt: 'Check my Gmail for any unread messages from today',
      features: ['Search Inbox', 'Read Emails', 'Send Messages']
    },
    {
      id: 'drive' as WorkspaceAppName,
      name: 'Google Drive',
      Icon: GoogleDriveIcon,
      serviceTag: 'Cloud Storage',
      accentColor: '#FFBA00',
      badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      desc: 'Enable agents to find, read, and create files directly in your Google Drive storage.',
      samplePrompt: 'Find my recent documents in Google Drive',
      features: ['List Files', 'Read Contents', 'Create Files']
    },
    {
      id: 'sheets' as WorkspaceAppName,
      name: 'Google Sheets',
      Icon: GoogleSheetsIcon,
      serviceTag: 'Spreadsheets',
      accentColor: '#0F9D58',
      badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      desc: 'Allow agents to analyze data, read spreadsheet values, and update sheets with new rows.',
      samplePrompt: 'Show me the data from my latest budget spreadsheet',
      features: ['Query Sheets', 'Read Cells', 'Append Rows']
    },
    {
      id: 'docs' as WorkspaceAppName,
      name: 'Google Docs',
      Icon: GoogleDocsIcon,
      serviceTag: 'Word Processing',
      accentColor: '#4285F4',
      badgeClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      desc: 'Connect your documents so agents can summarize meeting notes or append new sections.',
      samplePrompt: 'Summarize the content of my project proposal doc',
      features: ['Read Docs', 'Search Text', 'Append Content']
    },
    {
      id: 'calendar' as WorkspaceAppName,
      name: 'Google Calendar',
      Icon: GoogleCalendarIcon,
      serviceTag: 'Scheduling',
      accentColor: '#1A73E8',
      badgeClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      desc: 'Link your calendar to help agents manage your schedule, list events, and book meetings.',
      samplePrompt: 'What is on my calendar for the rest of the week?',
      features: ['List Events', 'Check Schedule', 'Book Meetings']
    },
    {
      id: 'tasks' as WorkspaceAppName,
      name: 'Google Tasks',
      Icon: GoogleTasksIcon,
      serviceTag: 'To-Do & Reminders',
      accentColor: '#1A73E8',
      badgeClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      desc: 'Sync your tasks to let agents track your to-dos, create reminders, and mark completions.',
      samplePrompt: 'List all my pending tasks and add a new one for groceries',
      features: ['Browse Tasks', 'Create To-Dos', 'Mark Completed']
    }
  ];

  const allEnabled = Object.values(toolsConfig.enabledApps).every(Boolean);

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--background)] text-[var(--text-primary)] overflow-hidden">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-xl shadow-lg text-xs font-bold border animate-in fade-in slide-in-from-top-2 ${
          toastMessage.type === 'error' ? 'bg-rose-900 border-rose-500 text-rose-100' : 'bg-emerald-900 border-emerald-500 text-emerald-100'
        }`}>
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <header className="p-4 border-b border-[var(--border-color)] bg-[var(--card-bg)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-lg border border-[var(--border-color)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/5 backdrop-blur-md shadow-sm flex items-center justify-center p-2 border border-white/10">
              <GoogleWorkspaceIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Google Apps Store</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Official Google Workspace
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Connect official Google apps to your AI agents with verified APIs</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && hasToken ? (
            <div className="flex items-center gap-2 bg-[var(--background)] p-1 pr-3 rounded-full border border-[var(--border-color)]">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} className="w-6 h-6 rounded-full" alt="User" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {currentUser.email?.[0].toUpperCase()}
                </div>
              )}
              <span className="text-[10px] font-bold text-emerald-400">Connected</span>
              <button onClick={handleSignOut} className="text-[10px] text-rose-400 hover:underline">Disconnect</button>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm border border-white/20 backdrop-blur-md active:scale-95"
            >
              <GoogleLogo className="w-4 h-4" />
              {isAuthenticating ? 'Connecting...' : 'Connect Google'}
            </button>
          )}
          <button onClick={onBackToChat} className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-bold hover:bg-[var(--card-bg)]">Back</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-8">
        {authError && (
          <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-200">
            <div>
              <p className="font-bold">Authentication Notice:</p>
              <p className="text-zinc-300 mt-0.5">{authError}</p>
            </div>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all whitespace-nowrap shadow"
            >
              Open App in New Tab ↗
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 p-6 rounded-3xl border border-blue-500/20 backdrop-blur-sm shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GoogleLogo className="w-5 h-5" />
              <h2 className="text-xl font-bold text-white">Google Workspace Integration</h2>
            </div>
            <p className="text-sm text-zinc-300">Grant your AI agents autonomous, real-time access to read and write across your Google apps.</p>
          </div>
          <button 
            onClick={() => setFullStack(!allEnabled)}
            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${
              allEnabled ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
            }`}
          >
            <GoogleWorkspaceIcon className="w-4 h-4" />
            {allEnabled ? 'Disconnect All' : 'Connect All 6 Apps'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map(app => {
            const isEnabled = !!toolsConfig.enabledApps[app.id];
            const IconComponent = app.Icon;
            return (
              <div 
                key={app.id} 
                className={`group flex flex-col p-6 rounded-3xl border transition-all duration-300 ${
                  isEnabled 
                    ? 'bg-[var(--card-bg)] border-blue-500/40 shadow-xl scale-[1.01] ring-1 ring-blue-500/20' 
                    : 'bg-[var(--card-bg)]/60 border-[var(--border-color)] opacity-85 hover:opacity-100 hover:border-zinc-500/50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  {/* Official Google Icon inside transparent clean container */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-md shadow-md flex items-center justify-center p-2.5 border border-white/10 transition-transform group-hover:scale-105">
                      <IconComponent className="w-9 h-9" />
                    </div>
                    {isEnabled && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[var(--card-bg)] rounded-full"></span>
                    )}
                  </div>

                  <button 
                    onClick={() => toggleWorkspaceApp(app.id)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isEnabled 
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400' 
                        : 'bg-[var(--background)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-blue-500 hover:text-white'
                    }`}
                  >
                    {isEnabled ? 'Enabled' : 'Connect'}
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{app.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${app.badgeClass}`}>
                      {app.serviceTag}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{app.desc}</p>
                  
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {app.features.map(f => (
                      <span key={f} className="px-2 py-0.5 rounded-lg bg-[var(--background)] text-[10px] text-zinc-400 border border-[var(--border-color)]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (onSendToChat) {
                      onSendToChat(app.samplePrompt);
                      onBackToChat();
                    }
                  }}
                  className="mt-6 w-full p-3 rounded-2xl bg-[var(--background)] hover:bg-blue-500/10 border border-[var(--border-color)] hover:border-blue-500/30 text-[11px] text-[var(--text-secondary)] hover:text-blue-300 transition-all flex items-center justify-between"
                >
                  <span className="truncate italic">" {app.samplePrompt} "</span>
                  <span className="font-bold flex items-center gap-1 text-blue-400">Try in Chat →</span>
                </button>
              </div>
            );
          })}
        </div>

        {!hasToken && (
          <div className="mt-8 p-8 text-center bg-[var(--card-bg)]/40 rounded-3xl border border-dashed border-zinc-700/60 shadow-lg">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 backdrop-blur-md shadow flex items-center justify-center p-3 mb-3 border border-white/10">
              <GoogleLogo className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold mb-1.5 text-white">Google Account Authorization Required</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mb-5 leading-relaxed">
              Connect your Google account with OAuth 2.0 to grant secure permission for your agents to read and modify your connected Google Workspace apps.
            </p>
            <button 
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="px-8 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all shadow-lg inline-flex items-center gap-2.5 text-sm border border-white/20 backdrop-blur-md active:scale-95"
            >
              <GoogleLogo className="w-4 h-4" />
              {isAuthenticating ? 'Connecting...' : 'Sign in with Google'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

