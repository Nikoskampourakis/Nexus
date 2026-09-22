import React, { useState, useEffect, useMemo } from 'react';
import { ChatSession } from '../types';
import { getUserStatistics, UserStatistics, resetUserStatistics, DailyStatRecord } from '../services/storageService';

interface AppStatisticsProps {
  onClose?: () => void;
  sessions: ChatSession[];
  onSelectSession?: (sessionId: string) => void;
  isEmbedded?: boolean;
}

export const AppStatistics: React.FC<AppStatisticsProps> = ({
  onClose,
  sessions,
  onSelectSession,
  isEmbedded = false
}) => {
  const [stats, setStats] = useState<UserStatistics>(getUserStatistics());
  const [activeTab, setActiveTab] = useState<'graphs' | 'chats' | 'tokens' | 'models'>('graphs');
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);
  const [hoveredDay, setHoveredDay] = useState<DailyStatRecord | null>(null);

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

  // Generate synthetic / actual timeline data for the selected range (7, 14, 30 days)
  const timelineData: DailyStatRecord[] = useMemo(() => {
    const days: DailyStatRecord[] = [];
    const now = new Date();
    const history = stats.dailyHistory || {};

    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      
      if (history[key]) {
        days.push(history[key]);
      } else {
        // If it's today and empty, create baseline
        if (i === 0) {
          days.push({
            date: key,
            promptTokens: stats.totalPromptTokens,
            responseTokens: stats.totalResponseTokens,
            totalTokens: stats.totalPromptTokens + stats.totalResponseTokens,
            timeSpentSeconds: stats.timeSpentSeconds,
            userMessages: stats.totalMessagesUser,
            modelMessages: stats.totalMessagesModel,
            imagesCreated: stats.totalImagesCreated,
            workspaceCalls: stats.totalWorkspaceApiCalls || 0,
            hourlyActivity: new Array(24).fill(0)
          });
        } else {
          // Empty past day
          days.push({
            date: key,
            promptTokens: 0,
            responseTokens: 0,
            totalTokens: 0,
            timeSpentSeconds: 0,
            userMessages: 0,
            modelMessages: 0,
            imagesCreated: 0,
            workspaceCalls: 0,
            hourlyActivity: new Array(24).fill(0)
          });
        }
      }
    }
    return days;
  }, [stats, timeRange]);

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

  // Max values for chart scaling
  const maxTokenDay = Math.max(...timelineData.map(d => d.totalTokens), 100);
  const maxTimeDay = Math.max(...timelineData.map(d => d.timeSpentSeconds), 60);

  // Hourly aggregate activity across all recorded days
  const hourlyActivityAggregate = useMemo(() => {
    const hours = new Array(24).fill(0);
    const history = stats.dailyHistory || {};
    Object.values(history).forEach(day => {
      if (day.hourlyActivity) {
        day.hourlyActivity.forEach((count, h) => {
          hours[h] += count;
        });
      }
    });
    return hours;
  }, [stats]);
  const maxHourlyActivity = Math.max(...hourlyActivityAggregate, 1);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your local usage statistics?")) {
      resetUserStatistics();
      setStats(getUserStatistics());
    }
  };

  const handleExportReport = () => {
    const reportData = {
      title: "Nexus AI Usage & Token Statistics Report",
      generatedAt: new Date().toISOString(),
      timeSpent: formatTimeSpent(stats.timeSpentSeconds),
      totalChats: totalChatsCount,
      totalMessagesAcrossChats,
      userMessages: stats.totalMessagesUser,
      modelMessages: stats.totalMessagesModel,
      promptTokens: stats.totalPromptTokens,
      responseTokens: stats.totalResponseTokens,
      totalTokens: totalTokensAll,
      estimatedCostUSD: `$${estimatedTotalCostUsd.toFixed(6)}`,
      imagesCreated: stats.totalImagesCreated,
      voiceTranscripts: stats.totalVoiceTranscripts,
      workspaceApiCalls: stats.totalWorkspaceApiCalls || 0,
      appCommandsExecuted: stats.totalAppCommandsExecuted || 0,
      activeDaysCount: streakDays,
      dailyHistory: stats.dailyHistory || {},
      modelBreakdown: stats.modelUsageBreakdown || {}
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-usage-statistics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = (
    <div className={`flex flex-col bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-3xl w-full shadow-2xl overflow-hidden ${isEmbedded ? '' : 'max-w-5xl max-h-[92vh]'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>App Activity, Token Graphs & Analytics</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live Data
              </span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Interactive visual charts for tokens, active time, model distribution and hourly engagement
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportReport}
            className="text-[11px] font-semibold text-cyan-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 transition-all flex items-center gap-1.5 shadow-sm"
            title="Export usage report as JSON"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Report</span>
          </button>
          <button
            onClick={handleReset}
            className="text-[11px] text-[var(--text-secondary)] hover:text-red-400 px-2.5 py-1.5 rounded-xl hover:bg-[var(--card-bg)] transition-colors"
            title="Reset statistics data"
          >
            Reset
          </button>
          {!isEmbedded && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-[var(--card-bg)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-between px-5 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)] gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {[
            { id: 'graphs', label: '1. Visual Analytics & Graphs' },
            { id: 'tokens', label: '2. Token Economics & Cost' },
            { id: 'models', label: '3. Per-Model Distribution' },
            { id: 'chats', label: '4. Most Active Chats' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'graphs' && (
          <div className="flex items-center space-x-1 bg-[var(--card-bg)] p-1 rounded-xl border border-[var(--border-color)] my-1">
            {([7, 14, 30] as const).map(days => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  timeRange === days
                    ? 'bg-cyan-500 text-black shadow-sm font-bold'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar max-h-[72vh]">
        
        {/* TAB 1: VISUAL GRAPHS */}
        {activeTab === 'graphs' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Top Stat Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-1">
                  <span>Total Tokens Processed</span>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-cyan-300">
                  {totalTokensAll.toLocaleString()}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1 flex items-center justify-between">
                  <span>Prompt: {stats.totalPromptTokens.toLocaleString()}</span>
                  <span>Resp: {stats.totalResponseTokens.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-1">
                  <span>Active Time in App</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-emerald-300">
                  {formatTimeSpent(stats.timeSpentSeconds)}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                  Live session duration
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
                <div className="text-[11px] text-[var(--text-secondary)] mb-1">
                  Messages & Interactions
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-purple-300">
                  {totalMessagesAcrossChats}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                  {stats.totalMessagesUser} user / {stats.totalMessagesModel} model
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
                <div className="text-[11px] text-[var(--text-secondary)] mb-1">
                  Estimated Gemini Cost
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-amber-300">
                  ${estimatedTotalCostUsd.toFixed(6)}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                  $0.10/1M in, $0.40/1M out
                </div>
              </div>
            </div>

            {/* 1. ACTUAL GRAPH: Daily Token Usage Stacked Bar Chart */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-md space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                    <span>Daily Token Usage Graph ({timeRange} Days)</span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Cyan represents Prompt Input Tokens, Purple represents Model Response Tokens
                  </p>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                    <span className="text-[var(--text-secondary)] text-[11px]">Prompt</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-400" />
                    <span className="text-[var(--text-secondary)] text-[11px]">Response</span>
                  </div>
                </div>
              </div>

              {/* SVG Chart Container */}
              <div className="relative h-48 w-full bg-[var(--background)]/60 rounded-xl p-3 border border-[var(--border-color)] flex flex-col justify-between">
                
                {/* Background Grid Lines */}
                <div className="absolute inset-x-3 inset-y-3 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-gray-500 w-full" />
                  <div className="border-b border-gray-500 w-full" />
                  <div className="border-b border-gray-500 w-full" />
                  <div className="border-b border-gray-500 w-full" />
                </div>

                {/* Bars Area */}
                <div className="relative flex-1 flex items-end justify-between gap-1 sm:gap-2 px-1 z-10">
                  {timelineData.map((day, idx) => {
                    const promptHeight = maxTokenDay > 0 ? (day.promptTokens / maxTokenDay) * 100 : 0;
                    const responseHeight = maxTokenDay > 0 ? (day.responseTokens / maxTokenDay) * 100 : 0;
                    const totalHeight = Math.min(100, promptHeight + responseHeight);
                    const isToday = idx === timelineData.length - 1;

                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                      >
                        {/* Stacked Bar */}
                        <div className="w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:scale-y-105 group-hover:brightness-125" style={{ height: `${Math.max(4, totalHeight)}%` }}>
                          {/* Response Tokens (Top part) */}
                          <div 
                            className="w-full bg-purple-500 transition-all" 
                            style={{ height: `${totalHeight > 0 ? (responseHeight / totalHeight) * 100 : 0}%` }}
                          />
                          {/* Prompt Tokens (Bottom part) */}
                          <div 
                            className="w-full bg-cyan-400 transition-all" 
                            style={{ height: `${totalHeight > 0 ? (promptHeight / totalHeight) * 100 : 100}%` }}
                          />
                        </div>

                        {/* Date Label */}
                        <span className={`text-[9px] font-mono mt-2 truncate max-w-[38px] ${isToday ? 'text-cyan-400 font-bold' : 'text-[var(--text-secondary)]'}`}>
                          {day.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Tooltip Overlay */}
                {hoveredDay && (
                  <div className="absolute top-2 right-4 bg-black/90 backdrop-blur-md border border-cyan-500/40 rounded-xl p-2.5 shadow-xl text-xs z-20 pointer-events-none animate-fade-in">
                    <div className="font-bold text-cyan-300 mb-1">{hoveredDay.date}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono">
                      <span className="text-cyan-400">Prompt Tokens:</span>
                      <span className="text-white text-right">{hoveredDay.promptTokens.toLocaleString()}</span>
                      <span className="text-purple-400">Response Tokens:</span>
                      <span className="text-white text-right">{hoveredDay.responseTokens.toLocaleString()}</span>
                      <span className="text-zinc-400">Total Tokens:</span>
                      <span className="text-white text-right font-bold">{hoveredDay.totalTokens.toLocaleString()}</span>
                      <span className="text-emerald-400">Time in App:</span>
                      <span className="text-white text-right">{formatTimeSpent(hoveredDay.timeSpentSeconds)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. ACTUAL GRAPH: In-App Usage & Engagement Curve */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Active Time in App Graph */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span>In-App Usage Duration</span>
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {formatTimeSpent(stats.timeSpentSeconds)} total
                  </span>
                </div>

                {/* SVG Line / Area Graph */}
                <div className="h-36 w-full bg-[var(--background)]/60 rounded-xl p-2 border border-[var(--border-color)] relative flex items-end">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 100">
                    <defs>
                      <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    {timelineData.length > 1 && (
                      <polygon
                        fill="url(#emeraldGrad)"
                        points={`0,100 ${timelineData.map((d, i) => {
                          const x = (i / (timelineData.length - 1)) * 300;
                          const y = 100 - (maxTimeDay > 0 ? (d.timeSpentSeconds / maxTimeDay) * 85 : 0);
                          return `${x},${y}`;
                        }).join(' ')} 300,100`}
                      />
                    )}
                    {/* Curve line */}
                    {timelineData.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={timelineData.map((d, i) => {
                          const x = (i / (timelineData.length - 1)) * 300;
                          const y = 100 - (maxTimeDay > 0 ? (d.timeSpentSeconds / maxTimeDay) * 85 : 0);
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                    )}
                    {/* Data Points */}
                    {timelineData.map((d, i) => {
                      const x = (i / (timelineData.length - 1)) * 300;
                      const y = 100 - (maxTimeDay > 0 ? (d.timeSpentSeconds / maxTimeDay) * 85 : 0);
                      return (
                        <circle
                          key={d.date}
                          cx={x}
                          cy={y}
                          r={i === timelineData.length - 1 ? "4" : "2.5"}
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </svg>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-mono">
                  <span>{timelineData[0]?.date.slice(5)}</span>
                  <span>Daily engagement tracking</span>
                  <span>{timelineData[timelineData.length - 1]?.date.slice(5)}</span>
                </div>
              </div>

              {/* 3. ACTUAL GRAPH: 24-Hour Peak Usage Intensity Distribution */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Hourly Activity Spectrum (24h)</span>
                  </h3>
                  <span className="text-[11px] font-mono text-amber-400">
                    Peak activity hours
                  </span>
                </div>

                {/* 24 Bar Columns for Hours 0..23 */}
                <div className="h-36 w-full bg-[var(--background)]/60 rounded-xl p-2.5 border border-[var(--border-color)] flex items-end justify-between gap-0.5">
                  {hourlyActivityAggregate.map((val, hour) => {
                    const heightPercent = maxHourlyActivity > 0 ? (val / maxHourlyActivity) * 90 : 0;
                    const isCurrentHour = new Date().getHours() === hour;

                    return (
                      <div
                        key={hour}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        title={`${hour}:00 - ${hour + 1}:00 : ${val} actions recorded`}
                      >
                        <div
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            isCurrentHour
                              ? 'bg-amber-400'
                              : val > 0
                              ? 'bg-amber-500/70 group-hover:bg-amber-400'
                              : 'bg-zinc-800'
                          }`}
                          style={{ height: `${Math.max(4, heightPercent)}%` }}
                        />
                        {hour % 6 === 0 && (
                          <span className="text-[8px] font-mono text-[var(--text-secondary)] mt-1">
                            {hour}h
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-mono">
                  <span>00:00 (Night)</span>
                  <span>12:00 (Noon)</span>
                  <span>23:00 (Night)</span>
                </div>
              </div>

            </div>

            {/* Feature Usage Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Images Created</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Studio & Art Canvas</div>
                </div>
                <span className="text-base font-bold font-mono text-purple-400">{stats.totalImagesCreated}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Voice Transcripts</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Speech-to-Text</div>
                </div>
                <span className="text-base font-bold font-mono text-emerald-400">{stats.totalVoiceTranscripts}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Workspace Calls</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Drive, Docs, Sheets</div>
                </div>
                <span className="text-base font-bold font-mono text-blue-400">{stats.totalWorkspaceApiCalls || 0}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">App Commands</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Slash Commands</div>
                </div>
                <span className="text-base font-bold font-mono text-amber-400">{stats.totalAppCommandsExecuted || 0}</span>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: TOKEN ECONOMICS */}
        {activeTab === 'tokens' && (
          <div className="space-y-5 animate-fade-in">
            <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Estimated Model Compute & Token Economics
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Calculated using standard Gemini API rates ($0.10/1M prompt, $0.40/1M output tokens)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    ${estimatedTotalCostUsd.toFixed(6)}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    Total Estimated Cost (USD)
                  </div>
                </div>
              </div>

              {/* Stacked Ratio Bar */}
              <div className="w-full bg-[var(--background)] rounded-full h-3.5 overflow-hidden flex border border-[var(--border-color)] shadow-inner">
                <div
                  className="bg-cyan-500 h-full transition-all"
                  style={{ width: `${totalTokensAll > 0 ? (stats.totalPromptTokens / totalTokensAll) * 100 : 50}%` }}
                  title={`Prompt Tokens: ${stats.totalPromptTokens}`}
                />
                <div
                  className="bg-purple-500 h-full transition-all"
                  style={{ width: `${totalTokensAll > 0 ? (stats.totalResponseTokens / totalTokensAll) * 100 : 50}%` }}
                  title={`Response Tokens: ${stats.totalResponseTokens}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border-color)]">
                  <div className="flex items-center space-x-2 text-cyan-400 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span className="font-semibold text-xs">Prompt Tokens</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
                    {stats.totalPromptTokens.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                    Est. Cost: ${(stats.totalPromptTokens * 0.0000001).toFixed(6)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border-color)]">
                  <div className="flex items-center space-x-2 text-purple-400 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    <span className="font-semibold text-xs">Response Tokens</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
                    {stats.totalResponseTokens.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                    Est. Cost: ${(stats.totalResponseTokens * 0.0000004).toFixed(6)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PER-MODEL USAGE */}
        {activeTab === 'models' && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-xs text-[var(--text-secondary)]">
              Breakdown of token consumption, message frequency, and cost per AI model
            </div>

            {(!stats.modelUsageBreakdown || Object.keys(stats.modelUsageBreakdown).length === 0) ? (
              <div className="text-center py-12 text-xs text-[var(--text-secondary)] bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)]">
                No per-model records yet. Send messages to populate the model distribution breakdown!
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.modelUsageBreakdown).map(([modelId, mData]) => {
                  const modelTotal = mData.promptTokens + mData.responseTokens;
                  const percent = totalTokensAll > 0 ? ((modelTotal / totalTokensAll) * 100).toFixed(1) : '0';

                  return (
                    <div
                      key={modelId}
                      className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--text-primary)] capitalize truncate flex items-center gap-2">
                          <span>{modelId.replace(/-/g, ' ')}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {percent}% of tokens
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                          {mData.messages} messages exchanged
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs font-mono text-right flex-shrink-0">
                        <div>
                          <div className="text-cyan-400 font-semibold">{mData.promptTokens.toLocaleString()}</div>
                          <div className="text-[9px] text-[var(--text-secondary)]">Prompt</div>
                        </div>
                        <div>
                          <div className="text-purple-400 font-semibold">{mData.responseTokens.toLocaleString()}</div>
                          <div className="text-[9px] text-[var(--text-secondary)]">Response</div>
                        </div>
                        <div>
                          <div className="text-emerald-400 font-semibold">{modelTotal.toLocaleString()}</div>
                          <div className="text-[9px] text-[var(--text-secondary)]">Total</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MOST ACTIVE CHATS */}
        {activeTab === 'chats' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2">
              <span>Ranked by message count & token volume</span>
              <span>{sortedSessions.length} total sessions recorded</span>
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
                        if (onClose) onClose();
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

      </div>

    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      {content}
    </div>
  );
};
