import React, { useState, useEffect } from 'react';
import { ChatSession } from '../types';
import { getUserStatistics, UserStatistics, resetUserStatistics } from '../services/storageService';

interface AppStatisticsProps {
  onClose: () => void;
  sessions: ChatSession[];
  onSelectSession?: (sessionId: string) => void;
}

export const AppStatistics: React.FC<AppStatisticsProps> = ({
  onClose,
  sessions,
  onSelectSession
}) => {
  const [stats, setStats] = useState<UserStatistics>(getUserStatistics());
  const [activeTab, setActiveTab] = useState<'overview' | 'chats' | 'tokens'>('overview');

  useEffect(() => {
    // Refresh stats every second while open
    const interval = setInterval(() => {
      setStats(getUserStatistics());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format time spent into human readable string
  const formatTimeSpent = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Compute most active chats
  const sortedSessions = [...sessions].map(s => ({
    ...s,
    messageCount: s.messages.length,
    userMessages: s.messages.filter(m => m.role === 'user').length,
    modelMessages: s.messages.filter(m => m.role === 'model').length,
    estimatedTokens: s.messages.reduce((acc, m) => {
      const promptTok = m.content.length > 0 ? Math.ceil(m.content.length / 4) : 0;
      const imgTok = m.attachment || m.generatedImage ? 258 : 0;
      return acc + promptTok + imgTok;
    }, 0)
  })).sort((a, b) => b.messageCount - a.messageCount);

  const mostActiveSession = sortedSessions[0];

  // Total metrics
  const totalChatsCount = sessions.length;
  const totalMessagesAcrossChats = sessions.reduce((acc, s) => acc + s.messages.length, 0);
  const totalTokensAll = stats.totalPromptTokens + stats.totalResponseTokens;
  const estimatedTotalCostUsd = (stats.totalPromptTokens * 0.0000001) + (stats.totalResponseTokens * 0.0000004);

  const streakDays = stats.dailyUsageDates?.length || 1;

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your local usage statistics?")) {
      resetUserStatistics();
      setStats(getUserStatistics());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shadow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                App Activity & Usage Statistics
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Track your active time, interaction frequency, and model compute
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="text-[11px] text-[var(--text-secondary)] hover:text-red-400 px-2.5 py-1 rounded-lg hover:bg-[var(--card-bg)] transition-colors"
              title="Reset statistics data"
            >
              Reset Data
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-[var(--card-bg)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)] gap-2">
          {[
            { id: 'overview', label: 'Overview & Time' },
            { id: 'chats', label: 'Most Active Chats' },
            { id: 'tokens', label: 'Token & Cost Estimations' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === t.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-fade-in">
              {/* Highlight Hero Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Time Spent */}
                <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-1">
                    <span>Time in App</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-cyan-300">
                    {formatTimeSpent(stats.timeSpentSeconds)}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Live active session timer
                  </div>
                </div>

                {/* 2. Total Chats */}
                <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
                  <div className="text-[11px] text-[var(--text-secondary)] mb-1">
                    Total Chats
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-[var(--text-primary)]">
                    {totalChatsCount}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                    {sessions.filter(s => s.forkedFromSessionId).length} forked branches
                  </div>
                </div>

                {/* 3. Messages Sent */}
                <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
                  <div className="text-[11px] text-[var(--text-secondary)] mb-1">
                    Messages Exchanged
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-purple-300">
                    {totalMessagesAcrossChats}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                    {stats.totalMessagesUser} user / {stats.totalMessagesModel} model
                  </div>
                </div>

                {/* 4. Daily Streak */}
                <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
                  <div className="text-[11px] text-[var(--text-secondary)] mb-1">
                    Active Days
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-amber-300">
                    {streakDays} {streakDays === 1 ? 'day' : 'days'}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Consecutive exploration
                  </div>
                </div>
              </div>

              {/* Most Active Chat Card */}
              {mostActiveSession && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-[var(--card-bg)] to-purple-950/30 border border-[var(--border-color)] shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      Most Frequented Chat
                    </span>
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                      {mostActiveSession.messageCount} messages
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] mb-1">
                    {mostActiveSession.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Last active {new Date(mostActiveSession.updatedAt).toLocaleDateString()} at {new Date(mostActiveSession.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                    <div className="flex items-center space-x-3 text-xs text-[var(--text-secondary)]">
                      <span>User: <strong className="text-[var(--text-primary)]">{mostActiveSession.userMessages}</strong></span>
                      <span>AI: <strong className="text-[var(--text-primary)]">{mostActiveSession.modelMessages}</strong></span>
                      <span>Tokens: <strong className="text-cyan-400">~{mostActiveSession.estimatedTokens}</strong></span>
                    </div>

                    {onSelectSession && (
                      <button
                        onClick={() => {
                          onSelectSession(mostActiveSession.id);
                          onClose();
                        }}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center space-x-1"
                      >
                        <span>Open Chat</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Multimodal & Studio Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">Images Created & Edited</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">In-chat generations & Image Studio</div>
                    </div>
                  </div>
                  <span className="text-base font-bold font-mono text-purple-400">{stats.totalImagesCreated}</span>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">Voice Input Transcripts</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">Microphone speech-to-text turns</div>
                    </div>
                  </div>
                  <span className="text-base font-bold font-mono text-emerald-400">{stats.totalVoiceTranscripts}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chats' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2">
                <span>Ranked by activity & interaction volume</span>
                <span>{sortedSessions.length} total recorded sessions</span>
              </div>

              {sortedSessions.length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--text-secondary)]">
                  No chats recorded yet. Start a conversation to see your activity metrics!
                </div>
              ) : (
                sortedSessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-cyan-500/50 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[var(--background)] flex items-center justify-center text-xs font-mono font-bold text-[var(--text-secondary)] flex-shrink-0">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-sm flex items-center gap-1.5">
                          <span>{session.title}</span>
                          {session.forkedFromSessionId && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                              Forked
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-2 mt-0.5 font-mono">
                          <span>{session.messageCount} messages</span>
                          <span>•</span>
                          <span>~{session.estimatedTokens} tokens</span>
                          <span>•</span>
                          <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {onSelectSession && (
                      <button
                        onClick={() => {
                          onSelectSession(session.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-[var(--background)] hover:bg-cyan-600 hover:text-white text-xs font-medium text-[var(--text-secondary)] rounded-xl transition-colors flex-shrink-0 border border-[var(--border-color)]"
                      >
                        Jump to Chat
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'tokens' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                      Total Estimated Model Interaction Compute
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Based on standard Gemini API pricing rates ($0.10/1M prompt, $0.40/1M output)
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-emerald-400">
                      ${estimatedTotalCostUsd.toFixed(6)}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      Estimated Cost (USD)
                    </div>
                  </div>
                </div>

                <div className="w-full bg-[var(--background)] rounded-full h-2.5 overflow-hidden flex border border-[var(--border-color)]">
                  <div
                    className="bg-cyan-500 h-full"
                    style={{ width: `${totalTokensAll > 0 ? (stats.totalPromptTokens / totalTokensAll) * 100 : 50}%` }}
                    title={`Prompt Tokens: ${stats.totalPromptTokens}`}
                  />
                  <div
                    className="bg-purple-500 h-full"
                    style={{ width: `${totalTokensAll > 0 ? (stats.totalResponseTokens / totalTokensAll) * 100 : 50}%` }}
                    title={`Response Tokens: ${stats.totalResponseTokens}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border-color)]">
                    <div className="flex items-center space-x-1.5 text-cyan-400 mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="font-semibold">Prompt Tokens</span>
                    </div>
                    <div className="text-base font-bold font-mono text-[var(--text-primary)]">
                      {stats.totalPromptTokens.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border-color)]">
                    <div className="flex items-center space-x-1.5 text-purple-400 mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="font-semibold">Response Tokens</span>
                    </div>
                    <div className="text-base font-bold font-mono text-[var(--text-primary)]">
                      {stats.totalResponseTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
