import React, { useState, useEffect } from 'react';

export interface PermissionItem {
  id: 'camera' | 'microphone' | 'geolocation' | 'clipboard' | 'notifications' | 'storage' | 'workspace';
  name: string;
  category: 'Hardware' | 'System' | 'Data & Integrations';
  description: string;
  purpose: string;
  status: 'granted' | 'prompt' | 'denied' | 'unsupported';
  icon: string;
}

export interface PermissionAuditEntry {
  id: string;
  permissionId: string;
  permissionName: string;
  timestamp: number;
  action: 'requested' | 'granted' | 'denied' | 'accessed' | 'cleared';
  detail: string;
}

const AUDIT_LOG_KEY = 'nexus_permissions_audit_log';
const PERMISSION_PREFS_KEY = 'nexus_permissions_preferences';

export const PermissionsTab: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'camera',
      name: 'Camera (Video & Snapshots)',
      category: 'Hardware',
      description: 'Capture live snapshots and photos directly into chat and image analysis.',
      purpose: 'Live visual input and multimodal photo queries',
      status: 'prompt',
      icon: 'Camera'
    },
    {
      id: 'microphone',
      name: 'Microphone (Voice & Speech)',
      category: 'Hardware',
      description: 'Real-time voice dictation (STT) and bidirectional Live Voice conversation mode.',
      purpose: 'Voice queries, speech-to-text dictation, and voice chat',
      status: 'prompt',
      icon: 'Mic'
    },
    {
      id: 'geolocation',
      name: 'Geolocation (Location Services)',
      category: 'System',
      description: 'Provides localized Google Search grounding, weather forecasts, and proximity context.',
      purpose: 'Accurate local search results and timezone synchronization',
      status: 'prompt',
      icon: 'MapPin'
    },
    {
      id: 'clipboard',
      name: 'Clipboard (Copy & Paste)',
      category: 'System',
      description: 'One-click copying for code blocks, AI responses, and pasting images directly into the composer.',
      purpose: 'Seamless code and content transfer',
      status: 'granted',
      icon: 'Clipboard'
    },
    {
      id: 'notifications',
      name: 'Web Notifications',
      category: 'System',
      description: 'Alerts when background image generations, long reasoning tasks, or document exports finish.',
      purpose: 'Asynchronous task completion notifications',
      status: 'prompt',
      icon: 'Bell'
    },
    {
      id: 'storage',
      name: 'Persistent Local Storage & IndexedDB',
      category: 'Data & Integrations',
      description: 'Stores generated artwork, chat archives, custom model personas, and icon packs offline in browser.',
      purpose: 'Zero-loss local persistence and offline speed',
      status: 'granted',
      icon: 'Database'
    },
    {
      id: 'workspace',
      name: 'Google Workspace (OAuth Connectors)',
      category: 'Data & Integrations',
      description: 'Enables importing files, presentations, spreadsheets, and emails from Google Drive, Docs, and Gmail.',
      purpose: 'Secure cloud file processing and Workspace search',
      status: 'prompt',
      icon: 'Cloud'
    }
  ]);

  const [auditLog, setAuditLog] = useState<PermissionAuditEntry[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load audit log on mount
  useEffect(() => {
    try {
      const storedLog = localStorage.getItem(AUDIT_LOG_KEY);
      if (storedLog) {
        setAuditLog(JSON.parse(storedLog));
      } else {
        const initialLog: PermissionAuditEntry[] = [
          {
            id: 'init_1',
            permissionId: 'storage',
            permissionName: 'Persistent Storage',
            timestamp: Date.now() - 3600000,
            action: 'granted',
            detail: 'IndexedDB image storage and LocalStorage initialized successfully'
          },
          {
            id: 'init_2',
            permissionId: 'clipboard',
            permissionName: 'Clipboard',
            timestamp: Date.now() - 1800000,
            action: 'granted',
            detail: 'Clipboard write permissions enabled for code snippet copying'
          }
        ];
        setAuditLog(initialLog);
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(initialLog));
      }
    } catch (e) {
      console.warn("Failed to load audit log:", e);
    }

    // Check actual browser permissions status
    checkBrowserPermissions();
  }, []);

  const addAuditEntry = (permissionId: string, permissionName: string, action: PermissionAuditEntry['action'], detail: string) => {
    const newEntry: PermissionAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      permissionId,
      permissionName,
      timestamp: Date.now(),
      action,
      detail
    };
    setAuditLog(prev => {
      const updated = [newEntry, ...prev].slice(0, 50); // Keep last 50
      try {
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const checkBrowserPermissions = async () => {
    if (!navigator.permissions || !navigator.permissions.query) return;

    const updatedPermissions = [...permissions];

    // Helper to query permission
    const queryPerm = async (name: any, id: string) => {
      try {
        const result = await navigator.permissions.query({ name });
        const target = updatedPermissions.find(p => p.id === id);
        if (target) {
          target.status = result.state as any;
        }
      } catch (err) {
        // Some browsers don't support certain permission queries
      }
    };

    await Promise.allSettled([
      queryPerm('camera', 'camera'),
      queryPerm('microphone', 'microphone'),
      queryPerm('geolocation', 'geolocation'),
      queryPerm('notifications', 'notifications'),
      queryPerm('clipboard-write', 'clipboard')
    ]);

    // Check storage persistence
    if (navigator.storage && navigator.storage.persisted) {
      try {
        const isPersisted = await navigator.storage.persisted();
        const target = updatedPermissions.find(p => p.id === 'storage');
        if (target) {
          target.status = isPersisted ? 'granted' : 'prompt';
        }
      } catch {}
    }

    setPermissions([...updatedPermissions]);
  };

  // Test / Request Permission Interactively
  const handleRequestPermission = async (perm: PermissionItem) => {
    setTestingId(perm.id);
    setStatusMessage(`Requesting ${perm.name}...`);

    try {
      if (perm.id === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        setPermissions(prev => prev.map(p => p.id === 'camera' ? { ...p, status: 'granted' } : p));
        addAuditEntry('camera', 'Camera', 'granted', 'User granted live video device access');
        setStatusMessage('Camera access granted!');
      } else if (perm.id === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        setPermissions(prev => prev.map(p => p.id === 'microphone' ? { ...p, status: 'granted' } : p));
        addAuditEntry('microphone', 'Microphone', 'granted', 'User granted audio input access');
        setStatusMessage('Microphone access granted!');
      } else if (perm.id === 'geolocation') {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            (err) => reject(err),
            { timeout: 8000 }
          );
        });
        setPermissions(prev => prev.map(p => p.id === 'geolocation' ? { ...p, status: 'granted' } : p));
        addAuditEntry('geolocation', 'Geolocation', 'granted', 'Location coordinates resolved successfully');
        setStatusMessage('Geolocation access granted!');
      } else if (perm.id === 'notifications') {
        if ('Notification' in window) {
          const res = await Notification.requestPermission();
          setPermissions(prev => prev.map(p => p.id === 'notifications' ? { ...p, status: res as any } : p));
          addAuditEntry('notifications', 'Notifications', res === 'granted' ? 'granted' : 'denied', `Notification permission response: ${res}`);
          setStatusMessage(`Notification status: ${res}`);
        }
      } else if (perm.id === 'clipboard') {
        await navigator.clipboard.writeText('Nexus AI Permission Test');
        setPermissions(prev => prev.map(p => p.id === 'clipboard' ? { ...p, status: 'granted' } : p));
        addAuditEntry('clipboard', 'Clipboard', 'accessed', 'Clipboard write test succeeded');
        setStatusMessage('Clipboard write access verified!');
      } else if (perm.id === 'storage') {
        if (navigator.storage && navigator.storage.persist) {
          const granted = await navigator.storage.persist();
          setPermissions(prev => prev.map(p => p.id === 'storage' ? { ...p, status: granted ? 'granted' : 'prompt' } : p));
          addAuditEntry('storage', 'Persistent Storage', granted ? 'granted' : 'requested', granted ? 'Persistent storage allocated' : 'Storage persistence not granted');
          setStatusMessage(granted ? 'Persistent storage locked!' : 'Standard storage active');
        }
      } else if (perm.id === 'workspace') {
        addAuditEntry('workspace', 'Google Workspace', 'accessed', 'Inspected Google Workspace OAuth configuration');
        setStatusMessage('Google Workspace OAuth flow available in Connect Hub');
      }
    } catch (err: any) {
      console.warn("Permission test error:", err);
      setPermissions(prev => prev.map(p => p.id === perm.id ? { ...p, status: 'denied' } : p));
      addAuditEntry(perm.id, perm.name, 'denied', `Permission request denied or cancelled: ${err.message || 'Error'}`);
      setStatusMessage(`${perm.name} request rejected or blocked by browser.`);
    } finally {
      setTestingId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleClearAuditLog = () => {
    if (window.confirm("Clear all permission access audit log entries?")) {
      setAuditLog([]);
      localStorage.removeItem(AUDIT_LOG_KEY);
      addAuditEntry('system', 'Security', 'cleared', 'Audit log cleared by user');
    }
  };

  const getStatusBadge = (status: PermissionItem['status']) => {
    switch (status) {
      case 'granted':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Granted</span>
          </span>
        );
      case 'prompt':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Ask Every Time</span>
          </span>
        );
      case 'denied':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>Blocked / Denied</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            Unsupported
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[var(--card-bg)] to-cyan-950/30 border border-[var(--border-color)] flex items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 shadow">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>Permissions & Privacy Control Center</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                Browser Security
              </span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Inspect, grant, test, and audit hardware, location, storage, and cloud integration authorizations.
            </p>
          </div>
        </div>

        <button
          onClick={checkBrowserPermissions}
          className="px-3 py-1.5 bg-[var(--card-bg)] hover:bg-white/10 text-[var(--text-primary)] rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-all flex items-center space-x-1.5 flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Re-check</span>
        </button>
      </div>

      {/* Status Notification Toast */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-cyan-300 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Permissions List Cards */}
      <div className="space-y-3">
        {permissions.map((perm) => (
          <div
            key={perm.id}
            className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {perm.name}
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-md bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                  {perm.category}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {perm.description}
              </p>
              <div className="text-[11px] text-cyan-400/90 font-mono">
                Purpose: {perm.purpose}
              </div>
            </div>

            <div className="flex items-center space-x-3 self-end sm:self-center flex-shrink-0">
              {getStatusBadge(perm.status)}

              <button
                onClick={() => handleRequestPermission(perm)}
                disabled={testingId === perm.id}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 ${
                  testingId === perm.id
                    ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-wait'
                    : perm.status === 'granted'
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 shadow-md active:scale-95'
                }`}
              >
                {testingId === perm.id ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Requesting...</span>
                  </>
                ) : (
                  <>
                    <span>{perm.status === 'granted' ? 'Test Access' : 'Request & Grant'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Access Audit Trail Log */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Permission Access & Verification Audit Trail</span>
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Chronological log of permission requests, grants, and security validations
            </p>
          </div>

          {auditLog.length > 0 && (
            <button
              onClick={handleClearAuditLog}
              className="text-[11px] text-zinc-400 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Clear Log
            </button>
          )}
        </div>

        {auditLog.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--text-secondary)]">
            No permission access events recorded yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {auditLog.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    log.action === 'granted' ? 'bg-emerald-400' :
                    log.action === 'denied' ? 'bg-red-400' :
                    log.action === 'accessed' ? 'bg-cyan-400' : 'bg-amber-400'
                  }`} />
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] mr-2">
                      {log.permissionName}
                    </span>
                    <span className="text-[var(--text-secondary)] truncate">
                      {log.detail}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-zinc-500 font-mono flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
