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
      icon: '✉️',
      color: 'bg-rose-500',
      desc: 'Connect your inbox to allow agents to search, read, and send emails on your behalf.',
      samplePrompt: 'Check my Gmail for any unread messages from today',
      features: ['Search Inbox', 'Read Emails', 'Send Messages']
    },
    {
      id: 'drive' as WorkspaceAppName,
      name: 'Google Drive',
      icon: '📁',
      color: 'bg-amber-500',
      desc: 'Enable agents to find, read, and create files directly in your Google Drive storage.',
      samplePrompt: 'Find my recent documents in Google Drive',
      features: ['List Files', 'Read Contents', 'Create Files']
    },
    {
      id: 'sheets' as WorkspaceAppName,
      name: 'Google Sheets',
      icon: '📊',
      color: 'bg-emerald-500',
      desc: 'Allow agents to analyze data, read spreadsheet values, and update sheets with new rows.',
      samplePrompt: 'Show me the data from my latest budget spreadsheet',
      features: ['Query Sheets', 'Read Cells', 'Append Rows']
    },
    {
      id: 'docs' as WorkspaceAppName,
      name: 'Google Docs',
      icon: '📄',
      color: 'bg-blue-500',
      desc: 'Connect your documents so agents can summarize meeting notes or append new sections.',
      samplePrompt: 'Summarize the content of my project proposal doc',
      features: ['Read Docs', 'Search Text', 'Append Content']
    },
    {
      id: 'calendar' as WorkspaceAppName,
      name: 'Calendar',
      icon: '📅',
      color: 'bg-cyan-500',
      desc: 'Link your calendar to help agents manage your schedule, list events, and book meetings.',
      samplePrompt: 'What is on my calendar for the rest of the week?',
      features: ['List Events', 'Check Schedule', 'Book Meetings']
    },
    {
      id: 'tasks' as WorkspaceAppName,
      name: 'Google Tasks',
      icon: '☑️',
      color: 'bg-purple-500',
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
          <div>
            <h1 className="text-lg font-bold">App Store</h1>
            <p className="text-xs text-[var(--text-secondary)]">Connect apps to your AI Agents</p>
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
              className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
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

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950/40 to-purple-950/40 p-6 rounded-3xl border border-indigo-500/20">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Universal App Connection</h2>
            <p className="text-sm text-zinc-400">Enable or disable apps to give your agent access to your workspace data.</p>
          </div>
          <button 
            onClick={() => setFullStack(!allEnabled)}
            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg ${
              allEnabled ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {allEnabled ? 'Disconnect All' : 'Connect Full Stack'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map(app => {
            const isEnabled = !!toolsConfig.enabledApps[app.id];
            return (
              <div 
                key={app.id} 
                className={`group flex flex-col p-6 rounded-3xl border transition-all duration-300 ${
                  isEnabled 
                    ? 'bg-[var(--card-bg)] border-indigo-500/30 shadow-xl scale-[1.02]' 
                    : 'bg-[var(--card-bg)]/50 border-[var(--border-color)] grayscale opacity-80 hover:grayscale-0 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${app.color} flex items-center justify-center text-2xl shadow-inner`}>
                    {app.icon}
                  </div>
                  <button 
                    onClick={() => toggleWorkspaceApp(app.id)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isEnabled 
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400' 
                        : 'bg-[var(--background)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-indigo-500 hover:text-white'
                    }`}
                  >
                    {isEnabled ? 'Enabled' : 'Connect'}
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{app.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{app.desc}</p>
                  
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {app.features.map(f => (
                      <span key={f} className="px-2 py-0.5 rounded-lg bg-[var(--background)] text-[10px] text-zinc-500 border border-[var(--border-color)]">
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
                  className="mt-6 w-full p-3 rounded-2xl bg-[var(--background)] hover:bg-indigo-500/10 border border-[var(--border-color)] hover:border-indigo-500/30 text-[11px] text-[var(--text-secondary)] hover:text-indigo-300 transition-all flex items-center justify-between"
                >
                  <span className="truncate italic">" {app.samplePrompt} "</span>
                  <span className="font-bold">Try →</span>
                </button>
              </div>
            );
          })}
        </div>

        {!hasToken && (
          <div className="mt-8 p-8 text-center bg-[var(--card-bg)]/30 rounded-3xl border border-dashed border-[var(--border-color)]">
            <h3 className="text-base font-bold mb-2">Account Authorization Required</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">You must connect your Google account to enable these apps to talk to your agents.</p>
            <button 
              onClick={handleSignIn}
              className="px-8 py-3 rounded-2xl bg-white text-black font-bold hover:bg-zinc-200 transition-all"
            >
              Sign in with Google
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
