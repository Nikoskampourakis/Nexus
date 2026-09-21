import React, { useState } from 'react';
import { Message, ChatSession } from '../types';
import { exportChatAsPdf, exportChatAsMarkdown } from '../services/exportService';

interface DownloadChatModalProps {
  session: ChatSession;
  modelName: string;
  onClose: () => void;
}

export const DownloadChatModal: React.FC<DownloadChatModalProps> = ({
  session,
  modelName,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState<'pdf' | 'md' | null>(null);

  const handleExportPdf = () => {
    setIsExporting('pdf');
    try {
      exportChatAsPdf(session, modelName);
    } catch (e) {
      console.error('Failed to export PDF:', e);
    } finally {
      setTimeout(() => {
        setIsExporting(null);
        onClose();
      }, 600);
    }
  };

  const handleExportMarkdown = () => {
    setIsExporting('md');
    try {
      exportChatAsMarkdown(session, modelName);
    } catch (e) {
      console.error('Failed to export Markdown:', e);
    } finally {
      setTimeout(() => {
        setIsExporting(null);
        onClose();
      }, 400);
    }
  };

  const totalUserMsgs = session.messages.filter((m) => m.role === 'user').length;
  const totalModelMsgs = session.messages.filter((m) => m.role === 'model').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#12131a] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Download Chat</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">Export complete conversation log</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Session details */}
        <div className="bg-[#191a24] rounded-2xl p-4 border border-white/5 space-y-2">
          <div className="text-xs font-semibold text-white truncate" title={session.title}>
            {session.title || 'Untitled Conversation'}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-neutral-400">
            <span>Model: <strong className="text-neutral-200">{modelName}</strong></span>
            <span>•</span>
            <span>Messages: <strong className="text-neutral-200">{session.messages.length}</strong></span>
          </div>
          <div className="text-[10px] text-neutral-500 flex items-center gap-2 pt-1">
            <span>User queries: {totalUserMsgs}</span>
            <span>•</span>
            <span>AI responses: {totalModelMsgs}</span>
          </div>
        </div>

        {/* Export Formats Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* PDF Card */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting !== null || session.messages.length === 0}
            className="flex flex-col items-start p-4 rounded-2xl border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 hover:border-red-500/60 transition-all text-left group disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>PDF Document</span>
              {isExporting === 'pdf' && (
                <div className="w-3 h-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Formatted document with headings, timestamps & clean speech blocks
            </p>
            <span className="mt-3 text-[11px] font-semibold text-red-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Download .pdf →
            </span>
          </button>

          {/* Markdown Card */}
          <button
            onClick={handleExportMarkdown}
            disabled={isExporting !== null || session.messages.length === 0}
            className="flex flex-col items-start p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/40 hover:border-cyan-500/60 transition-all text-left group disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>Markdown (.md)</span>
              {isExporting === 'md' && (
                <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Raw text with code blocks, quotes, links & full formatting preserved
            </p>
            <span className="mt-3 text-[11px] font-semibold text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Download .md →
            </span>
          </button>
        </div>

        {session.messages.length === 0 && (
          <div className="text-center py-2 text-xs text-amber-400/90 bg-amber-950/30 border border-amber-800/40 rounded-xl p-2">
            This chat session has no messages yet to export.
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-neutral-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
