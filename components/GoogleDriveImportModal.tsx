import React, { useState, useEffect } from 'react';
import { Search, FileText, File, HardDrive, Loader2, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import { listDriveFiles, getDriveFileTextOrContent, DriveFileItem } from '../services/workspaceApiService';
import { trackWorkspaceApiCall } from '../services/storageService';

interface GoogleDriveImportModalProps {
  onClose: () => void;
  onImportContent?: (fileName: string, mimeType: string, extractedText: string) => void;
  onFileSelect?: (file: { name: string; mimeType: string; content: string }) => void;
}

export const GoogleDriveImportModal: React.FC<GoogleDriveImportModalProps> = ({
  onClose,
  onImportContent,
  onFileSelect
}) => {
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async (query: string = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listDriveFiles(query);
      setFiles(result);
      trackWorkspaceApiCall('drive');
    } catch (err: any) {
      console.error('Drive fetch error:', err);
      setError(err?.message || 'Failed to fetch files from Google Drive. Please check account permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(searchQuery);
  };

  const handleSelectFile = async (file: DriveFileItem) => {
    setIsImporting(file.id);
    setError(null);
    try {
      const fileData = await getDriveFileTextOrContent(file);
      trackWorkspaceApiCall('drive');
      if (typeof onImportContent === 'function') {
        onImportContent(fileData.name, fileData.mimeType, fileData.content);
      }
      if (typeof onFileSelect === 'function') {
        onFileSelect({ name: fileData.name, mimeType: fileData.mimeType, content: fileData.content });
      }
      onClose();
    } catch (err: any) {
      console.error('Error importing file:', err);
      setError(`Failed to read content from "${file.name}": ${err?.message || 'Unknown error'}`);
      setIsImporting(null);
    }
  };

  const getMimeBadge = (mimeType: string) => {
    if (mimeType.includes('document')) return { label: 'Doc', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    if (mimeType.includes('spreadsheet')) return { label: 'Sheet', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    if (mimeType.includes('presentation')) return { label: 'Slides', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    if (mimeType.includes('pdf')) return { label: 'PDF', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    return { label: 'File', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#14141f] border border-cyan-500/30 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a28]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Google Drive Import</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  AI Context
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Select a document, slide, or sheet for AI analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="p-3 border-b border-white/10 bg-[#12121a] flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files in Google Drive..."
              className="w-full bg-[#1e1e2d] text-xs text-white pl-9 pr-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-neutral-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Search</span>}
          </button>
          <button
            type="button"
            onClick={() => fetchFiles(searchQuery)}
            className="p-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl transition-colors border border-white/10"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="m-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-h-[250px]">
          {isLoading && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs">Loading Google Drive files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-400 space-y-2">
              <HardDrive className="w-8 h-8 text-neutral-600" />
              <p className="text-xs font-medium">No files found in Google Drive</p>
              <p className="text-[11px] text-neutral-500 max-w-xs">
                Try a different search keyword or upload files to your Drive first.
              </p>
            </div>
          ) : (
            files.map((file) => {
              const badge = getMimeBadge(file.mimeType);
              const importing = isImporting === file.id;

              return (
                <div
                  key={file.id}
                  onClick={() => !importing && handleSelectFile(file)}
                  className={`p-3 rounded-xl border border-white/10 hover:border-cyan-500/50 bg-[#1a1a26] hover:bg-[#222232] cursor-pointer transition-all flex items-center justify-between group ${
                    importing ? 'opacity-75 bg-cyan-950/30 border-cyan-500/50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 group-hover:text-cyan-300 flex-shrink-0">
                      {file.mimeType.includes('document') ? (
                        <FileText className="w-4 h-4 text-blue-400" />
                      ) : (
                        <File className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-200 truncate">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 flex items-center space-x-2 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded font-mono border text-[9px] ${badge.color}`}>
                          {badge.label}
                        </span>
                        {file.modifiedTime && (
                          <span>Updated {new Date(file.modifiedTime).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {importing ? (
                      <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/40 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Reading...</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-200 text-xs font-medium border border-white/10 transition-colors"
                      >
                        Import File
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-white/10 bg-[#101018] flex items-center justify-between text-[11px] text-neutral-400 px-4">
          <span>Connected via Google Workspace OAuth</span>
          <button onClick={onClose} className="hover:text-white transition-colors">
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
