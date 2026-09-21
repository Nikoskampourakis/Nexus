import React, { useState, useMemo } from 'react';

interface EnhancedCodeBlockProps {
  language: string;
  value: string;
  onRun?: (code: string) => void;
}

interface MistakeItem {
  line?: number;
  type: 'error' | 'warning' | 'optimization';
  title: string;
  explanation: string;
  fixSnippet?: string;
}

// Lightweight syntax highlighter helper
const highlightCode = (code: string, lang: string): React.ReactNode => {
  const lines = code.split('\n');

  return lines.map((line, lineIdx) => {
    // Comments
    const commentMatch = line.match(/^(\s*)(\/\/.*|#.*|\/\*.*\*\/)/);
    if (commentMatch) {
      return (
        <div key={lineIdx} className="table-row">
          <span className="table-cell select-none text-right pr-4 text-neutral-600 font-mono text-[11px]">{lineIdx + 1}</span>
          <span className="table-cell text-emerald-400/80 italic font-mono text-xs whitespace-pre">{line}</span>
        </div>
      );
    }

    return (
      <div key={lineIdx} className="table-row hover:bg-white/[0.02]">
        <span className="table-cell select-none text-right pr-4 text-neutral-600 font-mono text-[11px]">{lineIdx + 1}</span>
        <span className="table-cell font-mono text-xs text-neutral-200 whitespace-pre">
          {renderTokens(line, lang)}
        </span>
      </div>
    );
  });
};

const renderTokens = (line: string, _lang: string) => {
  const tokenRegex = /(".*?"|'.*?'|`.*?`|\b(?:const|let|var|function|return|import|export|from|if|else|for|while|class|def|async|await|try|catch|new|this|typeof|interface|type|enum|public|private|static|true|false|null|undefined|print|self|None|True|False)\b|\b\d+\b|<\/?[a-zA-Z0-9_\-]+(?:\s|>|\/)|=>|[{}()[\];,])/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      parts.push(<span key={match.index} className="text-amber-300">{token}</span>);
    } else if (/^(?:const|let|var|function|return|import|export|from|if|else|for|while|class|def|async|await|try|catch|new|this|typeof|interface|type|enum|public|private|static)$/.test(token)) {
      parts.push(<span key={match.index} className="text-cyan-400 font-semibold">{token}</span>);
    } else if (/^(?:true|false|null|undefined)$/.test(token)) {
      parts.push(<span key={match.index} className="text-purple-400 font-semibold">{token}</span>);
    } else if (/^\d+$/.test(token)) {
      parts.push(<span key={match.index} className="text-orange-400">{token}</span>);
    } else if (token.startsWith('<') || token.endsWith('>')) {
      parts.push(<span key={match.index} className="text-pink-400">{token}</span>);
    } else {
      parts.push(<span key={match.index} className="text-neutral-400">{token}</span>);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex));
  }

  return parts.length > 0 ? parts : line;
};

// Analyze code for common syntax errors, runtime mistakes, or logic pitfalls
const detectMistakes = (code: string, lang: string): MistakeItem[] => {
  const mistakes: MistakeItem[] = [];
  const lowerLang = (lang || '').toLowerCase();
  const lines = code.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check for console.log left in production
    if (/console\.log\(/.test(line)) {
      mistakes.push({
        line: lineNum,
        type: 'optimization',
        title: 'Debug Statement Detected',
        explanation: 'console.log statement found; consider removing before production.',
        fixSnippet: line.replace(/console\.log\([^)]*\);?/, '// Log removed')
      });
    }

    // Check for == instead of === in JS/TS
    if ((lowerLang.includes('js') || lowerLang.includes('ts') || lowerLang.includes('react')) && /\bif\s*\(.*[^=!<>]={2}[^=].*\)/.test(line)) {
      mistakes.push({
        line: lineNum,
        type: 'warning',
        title: 'Loose Equality Operator (==)',
        explanation: 'Using loose equality (==) can cause unintended type coercion. Prefer strict equality (===).',
        fixSnippet: line.replace(/==(?!=)/g, '===')
      });
    }

    // Check for async function missing await
    if (/\basync\b/.test(line) && !/await/.test(code) && (lowerLang.includes('js') || lowerLang.includes('ts'))) {
      if (!mistakes.some(m => m.title === 'Async Function Without Await')) {
        mistakes.push({
          line: lineNum,
          type: 'warning',
          title: 'Async Function Without Await',
          explanation: 'Declared async function but no await expressions detected in body.',
        });
      }
    }

    // Check for missing key in React map
    if ((lowerLang.includes('jsx') || lowerLang.includes('tsx') || lowerLang.includes('react')) && /\.map\(\s*\(?[a-zA-Z0-9_, ]*\)?\s*=>\s*</.test(line) && !line.includes('key=')) {
      mistakes.push({
        line: lineNum,
        type: 'error',
        title: 'Missing React key prop in list',
        explanation: 'Elements in an array iterator must have a unique "key" prop for efficient React reconciliation.',
        fixSnippet: line.replace(/>/, ' key={item.id || index}>')
      });
    }

    // Check for innerHTML XSS risk
    if (/\.innerHTML\s*=/.test(line) || /dangerouslySetInnerHTML/.test(line)) {
      mistakes.push({
        line: lineNum,
        type: 'warning',
        title: 'Direct HTML Injection (XSS Vulnerability)',
        explanation: 'Assigning to innerHTML without sanitization allows cross-site scripting vulnerabilities. Use textContent or DOMPurify.',
      });
    }
  });

  return mistakes;
};

export const EnhancedCodeBlock: React.FC<EnhancedCodeBlockProps> = ({ language, value, onRun }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'mistakes'>('code');
  const [copied, setCopied] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);

  const cleanLang = (language || '').toLowerCase().trim();
  
  // Real in-browser executable languages only (HTML, CSS, JS, TS, SVG)
  const isRunnableHTML = cleanLang === 'html' || cleanLang === 'xml' || cleanLang === 'svg';
  const isRunnableCSS = cleanLang === 'css';
  const isRunnableJS = cleanLang === 'javascript' || cleanLang === 'js' || cleanLang === 'typescript' || cleanLang === 'ts';
  const isBrowserRunnable = isRunnableHTML || isRunnableCSS || isRunnableJS;

  const mistakes = useMemo(() => detectMistakes(value, cleanLang), [value, cleanLang]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // In-browser client-side execution for browser-native languages
  const executeCodeInSandbox = () => {
    setIsExecuting(true);
    setActiveTab('preview');
    const start = performance.now();

    if (isRunnableHTML) {
      setExecutionOutput(value);
      setExecTime(Math.round(performance.now() - start));
      setIsExecuting(false);
      return;
    }

    if (isRunnableCSS) {
      // Wrap CSS with a live preview showcase
      const htmlPreview = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; }
            ${value}
          </style>
        </head>
        <body>
          <div class="preview-container">
            <h3>CSS Live Preview</h3>
            <p>Your styles are applied to this sandbox preview document.</p>
            <button class="btn button primary">Interactive Button</button>
            <div class="card box container">
              <h4>Sample Card Element</h4>
              <p>Content to demonstrate layout, colors, typography, borders, and animations.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      setExecutionOutput(htmlPreview);
      setExecTime(Math.round(performance.now() - start));
      setIsExecuting(false);
      return;
    }

    if (isRunnableJS) {
      try {
        const logs: string[] = [];
        const customConsole = {
          log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
          warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
          error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
          info: (...args: any[]) => logs.push('[INFO] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
        };

        // Safe execution sandbox
        const sandboxFunc = new Function('console', `
          try {
            ${value}
          } catch (e) {
            console.error(e.message || String(e));
          }
        `);

        sandboxFunc(customConsole);

        const duration = Math.round(performance.now() - start);
        setExecTime(duration);
        setExecutionOutput(logs.length > 0 ? logs.join('\n') : '✓ Code executed successfully with 0 console logs.');
      } catch (err: any) {
        setExecTime(Math.round(performance.now() - start));
        setExecutionOutput(`Runtime Execution Error:\n${err.message || err}`);
      }
      setIsExecuting(false);
      return;
    }
  };

  return (
    <div className="my-3.5 rounded-xl overflow-hidden border border-neutral-700/60 bg-[#0d1117] shadow-xl font-sans">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#161b22] border-b border-neutral-800">
        
        {/* Left: Language badge & Tabs */}
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider bg-neutral-800 text-cyan-300 border border-neutral-700">
            {language || 'code'}
          </span>

          <div className="flex items-center space-x-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
            <button
              onClick={() => setActiveTab('code')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                activeTab === 'code' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Code
            </button>

            {isBrowserRunnable && (
              <button
                onClick={() => {
                  if (activeTab !== 'preview') executeCodeInSandbox();
                  else setActiveTab('preview');
                }}
                className={`px-2 py-0.5 rounded text-xs font-medium flex items-center space-x-1 transition-all ${
                  activeTab === 'preview' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'text-neutral-400 hover:text-emerald-300'
                }`}
              >
                <span>Run Browser Sandbox</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('mistakes')}
              className={`px-2 py-0.5 rounded text-xs font-medium flex items-center space-x-1 transition-all ${
                activeTab === 'mistakes' 
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' 
                  : 'text-neutral-400 hover:text-amber-300'
              }`}
            >
              <span>Diagnostics</span>
              {mistakes.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {mistakes.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {isBrowserRunnable && onRun && (
            <button
              onClick={() => onRun(value)}
              className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-medium border border-emerald-500/30"
              title="Open in Fullscreen Canvas Sandbox"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="hidden sm:inline">Canvas Popout</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-xs text-neutral-300 hover:text-white px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition-all font-medium border border-neutral-700"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Tab */}
      {activeTab === 'code' && (
        <div className="p-3.5 overflow-x-auto custom-scrollbar bg-[#090d13] max-h-[500px]">
          <div className="table w-full border-collapse">
            {highlightCode(value, cleanLang)}
          </div>
        </div>
      )}

      {/* Output / Preview Sandbox Tab (Real browser execution) */}
      {activeTab === 'preview' && isBrowserRunnable && (
        <div className="bg-[#090d13] p-3 text-xs font-mono space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-800 text-[11px] text-neutral-400">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Browser Sandbox Output</span>
            </div>
            {execTime !== null && (
              <span>Execution Time: <strong className="text-cyan-300">{execTime}ms</strong></span>
            )}
          </div>

          {(isRunnableHTML || isRunnableCSS) ? (
            <div className="w-full h-64 bg-white rounded-lg overflow-hidden border border-neutral-700">
              <iframe
                title="Code Sandbox Output"
                srcDoc={executionOutput || value}
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="p-3 bg-black/60 rounded-lg border border-neutral-800 text-neutral-200 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar leading-relaxed">
              {isExecuting ? 'Running code in sandbox...' : (executionOutput || 'No output produced.')}
            </div>
          )}
        </div>
      )}

      {/* Diagnostics / Mistake Pointer Tab */}
      {activeTab === 'mistakes' && (
        <div className="bg-[#0e0c15] p-3.5 space-y-2.5 text-xs animate-fadeIn max-h-[400px] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
            <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Code Diagnostics & Syntax Pointers
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              {mistakes.length === 0 ? '0 issues detected' : `${mistakes.length} suggestion${mistakes.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {mistakes.length === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-center space-y-1">
              <p className="font-semibold">✓ No obvious syntax pitfalls or lint errors detected.</p>
              <p className="text-[11px] text-neutral-400">Clean structure, balanced blocks, and proper statements.</p>
            </div>
          ) : (
            mistakes.map((mistake, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border space-y-1.5 ${
                  mistake.type === 'error'
                    ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                    : mistake.type === 'warning'
                    ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                    : 'bg-blue-950/30 border-blue-800/40 text-blue-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="uppercase text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-black/40">
                      {mistake.type}
                    </span>
                    {mistake.title}
                  </span>
                  {mistake.line && (
                    <span className="text-[10px] font-mono text-neutral-400">
                      Line {mistake.line}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  {mistake.explanation}
                </p>

                {mistake.fixSnippet && (
                  <div className="pt-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono">Suggested Fix:</span>
                    <div className="p-1.5 rounded bg-black/60 font-mono text-[11px] text-emerald-300 mt-0.5 overflow-x-auto">
                      {mistake.fixSnippet}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};
