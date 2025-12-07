import React, { useEffect, useState, useRef } from 'react';
import { Project, File, LogEntry } from '../../types';
import { Monitor, Smartphone, Tablet, AlertTriangle, X, Terminal, Copy, Check, RotateCw, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { WebBenchLoader } from '../ui/Loader';
import type { StartupStatus } from '../../pages/Editor';

interface PreviewProps {
  project: Project;
  refreshTrigger: number;
  previewEntryPath: string;
  onNavigate: (path: string) => void;
  isMobile?: boolean;
  onClose?: () => void;
  startupStatus: StartupStatus;
  startupLog: string;
  serverUrl: string | null;
  logs: LogEntry[];
  onClearLogs: () => void;
}

const statusMessages: Record<StartupStatus, string> = {
    idle: 'Preparing WebContainer...',
    booting: 'Booting WebContainer...',
    mounting: 'Writing files to virtual disk...',
    installing: 'Installing dependencies (npm install)...',
    starting: 'Starting dev server (npm run dev)...',
    running: 'Server is live!',
    error: 'An error occurred during startup.',
};

const navigationAndConsoleInterceptorScript = `
    (function() {
        if (window.__webbench_intercepted) return;
        window.__webbench_intercepted = true;

        function safeSerialize(obj, depth = 0, seen = new WeakSet()) {
            if (obj === null) return 'null';
            if (obj === undefined) return 'undefined';
            if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
            if (typeof obj === 'string') return '"' + obj + '"';
            if (typeof obj === 'function') return '[Function: ' + (obj.name || 'anonymous') + ']';
            if (typeof obj === 'symbol') return String(obj);
            
            if (depth > 2) return '[Object]'; 
            
            if (typeof obj === 'object') {
                if (seen.has(obj)) return '[Circular]';
                seen.add(obj);

                if (obj instanceof Error) {
                    return '[Error: ' + obj.message + (obj.stack ? '\\n' + obj.stack : '') + ']';
                }
                
                if (Array.isArray(obj)) {
                    return '[' + obj.map(item => safeSerialize(item, depth + 1, seen)).join(', ') + ']';
                }
                
                if (obj instanceof Element) {
                    let str = '<' + obj.tagName.toLowerCase();
                    if (obj.id) str += ' id="' + obj.id + '"';
                    if (obj.className) str += ' class="' + obj.className + '"';
                    return str + '>';
                }

                try {
                    const parts = [];
                    for (const key in obj) {
                        parts.push(key + ': ' + safeSerialize(obj[key], depth + 1, seen));
                    }
                    return '{ ' + parts.join(', ') + ' }';
                } catch (e) {
                    return '[Unserializable Object]';
                }
            }
            return String(obj);
        }

        function postLog(level, args) {
            try {
                const serializedArgs = args.map(arg => {
                    if (typeof arg === 'string') return arg;
                    return safeSerialize(arg);
                });
                window.parent.postMessage({ type: 'console', level, message: serializedArgs }, '*');
            } catch(e) {
            }
        }

        const originalConsole = { 
            log: console.log, 
            warn: console.warn, 
            error: console.error, 
            info: console.info, 
            debug: console.debug,
            table: console.table,
            group: console.group,
            groupEnd: console.groupEnd
        };

        ['log', 'warn', 'error', 'info', 'debug', 'table'].forEach(level => {
            console[level] = (...args) => {
                if (originalConsole[level]) originalConsole[level].apply(console, args);
                postLog(level === 'table' ? 'log' : level, args);
            };
        });

        window.addEventListener('error', (event) => {
            postLog('error', [
                event.message || 'Unknown Error', 
                'at ' + (event.filename || 'script') + ':' + (event.lineno || '?') + ':' + (event.colno || '?')
            ]);
        }, true);

        window.addEventListener('unhandledrejection', (event) => {
             const reason = event.reason;
             let msg = 'Unhandled Promise Rejection';
             if (reason instanceof Error) {
                 msg += ': ' + reason.message;
                 if (reason.stack) msg += '\\n' + reason.stack;
             } else {
                 msg += ': ' + String(reason);
             }
             postLog('error', [msg]);
        });

        document.addEventListener('click', (e) => {
            let target = e.target;
            while (target && target.tagName !== 'A') { target = target.parentElement; }
            if (target && target.tagName === 'A') {
                const href = target.getAttribute('href');
                if (href && href.startsWith('#')) return; 
            }
        });
    })();
`;

export const Preview: React.FC<PreviewProps> = ({ 
  project, 
  refreshTrigger, 
  previewEntryPath, 
  onNavigate,
  isMobile,
  onClose,
  startupStatus,
  startupLog,
  serverUrl,
  logs,
  onClearLogs
}) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [key, setKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string>('about:blank');
  const [loading, setLoading] = useState(true);
  
  // Scaling state
  const [scale, setScale] = useState(1);
  const [targetDimensions, setTargetDimensions] = useState({ width: '100%', height: '100%' });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  
  const isWebContainer = project.type === 'react-vite' || project.type === 'nextjs';

  // --- Calculate Scale for Device Simulation ---
  useEffect(() => {
    const calculateScale = () => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.clientWidth;
        // const containerHeight = containerRef.current.clientHeight; // Not used for now
        
        // Mobile needs less padding to maximize screen real estate
        const hPadding = isMobile ? 8 : 40; 

        const availableWidth = Math.max(containerWidth - hPadding, 100);
        
        let targetW: number | string = availableWidth;
        let targetH: number | string = '100%';

        if (device === 'mobile') {
            targetW = 375;
            targetH = 667;
        } else if (device === 'tablet') {
            targetW = 768;
            targetH = 1024;
        } else if (device === 'desktop') {
             // Simulate desktop on smaller screens
             // We set a minimum effective width for desktop view
             if (availableWidth < 1024) {
                 targetW = 1024;
                 targetH = '100%'; 
             } else {
                 targetW = '100%';
                 targetH = '100%';
             }
        }
        
        // Calculate numeric target width for scaling
        const numericTargetW = typeof targetW === 'number' ? targetW : availableWidth;

        let newScale = 1;
        // Only scale down if the target is larger than available space
        if (numericTargetW > availableWidth) {
             newScale = availableWidth / numericTargetW;
        }

        // Apply dimensions
        setTargetDimensions({ 
            width: typeof targetW === 'number' ? `${targetW}px` : targetW, 
            height: typeof targetH === 'number' ? `${targetH}px` : targetH 
        });
        setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [device, isMobile]);

  // --- Console Scroll Effect ---
  useEffect(() => {
    if (showConsole && consoleEndRef.current) {
        consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showConsole]);

  // --- Build Static Preview ---
  const buildStaticPreview = () => {
    if (!project) return;
    setLoading(true);

    // 1. Find Entry Point
    let entryFile = project.files[previewEntryPath];
    if (!entryFile) {
        const htmlFile = (Object.values(project.files) as File[]).find(f => f.name.endsWith('.html'));
        if (htmlFile) {
            entryFile = htmlFile;
            onNavigate(htmlFile.path);
        } else {
            setIframeUrl('about:blank'); 
            setLoading(false);
            return;
        }
    }

    // 2. Process Content
    let content = entryFile.content;
    const blobUrls: string[] = [];

    const resolvePath = (base: string, relative: string) => {
        const stack = base.split('/').slice(0, -1);
        const parts = relative.split('/');
        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') stack.pop();
            else stack.push(part);
        }
        return stack.join('/') || '/';
    }

    // Replace CSS
    content = content.replace(/<link[^>]+href=["']([^"']+)["'][^>]*>/g, (match, href) => {
        if (href.startsWith('http') || href.startsWith('//')) return match;
        const absPath = href.startsWith('/') ? href : resolvePath(entryFile.path, href);
        const file = project.files[absPath];
        if (file) {
            const blob = new Blob([file.content], { type: 'text/css' });
            const url = URL.createObjectURL(blob);
            blobUrls.push(url);
            return match.replace(href, url);
        }
        return match;
    });

    // Replace JS
    content = content.replace(/<script[^>]+src=["']([^"']+)["'][^>]*>/g, (match, src) => {
        if (src.startsWith('http') || src.startsWith('//')) return match;
        const absPath = src.startsWith('/') ? src : resolvePath(entryFile.path, src);
        const file = project.files[absPath];
        if (file) {
            const blob = new Blob([file.content], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            blobUrls.push(url);
            return match.replace(src, url);
        }
        return match;
    });
    
    // Replace Images
    content = content.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/g, (match, src) => {
        if (src.startsWith('http') || src.startsWith('//') || src.startsWith('data:')) return match;
         const absPath = src.startsWith('/') ? src : resolvePath(entryFile.path, src);
         const file = project.files[absPath];
         if (file && file.type === 'image') {
             const dataUri = file.content.startsWith('data:') ? file.content : `data:image/png;base64,${file.content}`; 
             return match.replace(src, dataUri);
         }
         return match;
    });

    // Inject Interceptor Script
    const scriptBlob = new Blob([navigationAndConsoleInterceptorScript], { type: 'application/javascript' });
    const scriptUrl = URL.createObjectURL(scriptBlob);
    blobUrls.push(scriptUrl);
    
    // Check if head exists, if not add it
    if (content.includes('<head>')) {
        content = content.replace('<head>', `<head><script src="${scriptUrl}"></script>`);
    } else {
        content = `<script src="${scriptUrl}"></script>` + content;
    }

    const finalBlob = new Blob([content], { type: 'text/html' });
    const finalUrl = URL.createObjectURL(finalBlob);
    
    setIframeUrl(finalUrl);
    setLoading(false);

    return () => {
        blobUrls.forEach(url => URL.revokeObjectURL(url));
        URL.revokeObjectURL(finalUrl);
    };
  };

  useEffect(() => {
      if (isWebContainer) {
          if (serverUrl) {
              setIframeUrl(serverUrl);
              setLoading(false);
          } else {
              setLoading(true);
          }
      } else {
          const cleanup = buildStaticPreview();
          return () => {
              if (cleanup) cleanup();
          }
      }
  }, [project, refreshTrigger, previewEntryPath, serverUrl, isWebContainer]);

  const handleRefresh = () => {
      setKey(k => k + 1);
      onClearLogs();
  };

  const copyLog = (msg: any[]) => {
      const text = msg.map(m => typeof m === 'string' ? m : JSON.stringify(m)).join(' ');
      navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: StartupStatus) => {
      switch(status) {
          case 'running': return 'text-green-400';
          case 'error': return 'text-red-400';
          default: return 'text-yellow-400';
      }
  };

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-border relative">
      {/* Mobile Header / Close */}
      {isMobile && onClose && (
        <div className="flex items-center justify-between p-2 bg-sidebar border-b border-border shrink-0">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preview</span>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
            </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-[#252526] shrink-0 gap-2">
        <div className="flex items-center gap-1 bg-[#1e1e1e] rounded p-0.5 border border-border shrink-0">
          <button onClick={() => setDevice('desktop')} className={`p-1.5 rounded ${device === 'desktop' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`} title="Desktop (1024px+)">
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDevice('tablet')} className={`p-1.5 rounded ${device === 'tablet' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`} title="Tablet (768px)">
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDevice('mobile')} className={`p-1.5 rounded ${device === 'mobile' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`} title="Mobile (375px)">
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 min-w-0 flex justify-center">
          <div className={`bg-[#1e1e1e] border border-border rounded flex items-center px-2 py-1 text-xs text-gray-400 h-7 ${isMobile ? 'w-full' : 'w-full max-w-sm'}`}>
             <span className="truncate w-full text-center">
                {loading ? 'Loading...' : (iframeUrl === 'about:blank' ? 'No preview' : iframeUrl)}
             </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleRefresh} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
            </button>
             <button onClick={() => setShowConsole(!showConsole)} className={`relative p-1.5 rounded hover:bg-white/10 ${showConsole ? 'text-accent bg-accent/10' : 'text-gray-400 hover:text-white'}`} title="Toggle Console">
                <Terminal className="w-3.5 h-3.5" />
                {errorCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </button>
            <a href={iframeUrl} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white ${iframeUrl === 'about:blank' ? 'pointer-events-none opacity-50' : ''}`} title="Open in New Tab">
                <ExternalLink className="w-3.5 h-3.5" />
            </a>
        </div>
      </div>

      {/* Main Area */}
      <div ref={containerRef} className="flex-1 bg-[#111] relative overflow-hidden flex flex-col items-center justify-start p-2 md:p-4 origin-top">
        {loading || (isWebContainer && startupStatus !== 'running') ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
                 <WebBenchLoader size="lg" />
                 {isWebContainer && (
                     <div className="mt-4 max-w-xs mx-auto">
                        <p className={`text-sm font-medium mb-2 ${getStatusColor(startupStatus)}`}>
                            {statusMessages[startupStatus]}
                        </p>
                        {startupStatus === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/20 p-2 rounded text-xs text-red-300 text-left max-h-40 overflow-auto custom-scrollbar">
                                <pre>{startupLog}</pre>
                            </div>
                        )}
                        {startupStatus !== 'error' && startupStatus !== 'running' && (
                            <div className="text-xs text-gray-500 font-mono text-left max-h-20 overflow-hidden relative">
                                <pre>{startupLog.split('\n').slice(-3).join('\n')}</pre>
                                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#111] to-transparent"></div>
                            </div>
                        )}
                     </div>
                 )}
            </div>
        ) : (
             <div 
                className="bg-white transition-all duration-300 shadow-2xl overflow-hidden relative origin-top"
                style={{ 
                    width: targetDimensions.width,
                    height: targetDimensions.height,
                    maxWidth: 'none',
                    borderRadius: device !== 'desktop' || scale < 1 ? '8px' : '0',
                    border: device !== 'desktop' || scale < 1 ? '1px solid #333' : 'none',
                    transform: `scale(${scale})`,
                }}
             >
                 <iframe
                    key={key}
                    ref={iframeRef}
                    src={iframeUrl}
                    className="w-full h-full bg-white"
                    sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                    title="Preview"
                 />
             </div>
        )}
      </div>

      {/* Console Panel */}
      {showConsole && (
          <div className="h-48 md:h-64 bg-[#111] border-t border-border flex flex-col animate-in slide-in-from-bottom-10 z-10 absolute bottom-0 left-0 right-0 shadow-2xl">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] border-b border-border shrink-0">
                  <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 uppercase">Console</span>
                      {errorCount > 0 && <span className="text-[10px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">{errorCount} Errors</span>}
                      {warnCount > 0 && <span className="text-[10px] bg-yellow-900/40 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/20">{warnCount} Warnings</span>}
                  </div>
                  <div className="flex gap-2">
                       <button onClick={onClearLogs} className="text-gray-500 hover:text-white p-1" title="Clear Console"><Trash2 className="w-3.5 h-3.5" /></button>
                       <button onClick={() => setShowConsole(false)} className="text-gray-500 hover:text-white p-1"><X className="w-3.5 h-3.5" /></button>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 custom-scrollbar">
                  {logs.length === 0 && <div className="text-gray-600 italic px-2">No logs yet...</div>}
                  {logs.map((log, i) => (
                      <div key={i} className={`flex items-start gap-2 px-2 py-1.5 hover:bg-white/5 group border-b border-white/5 ${log.level === 'error' ? 'bg-red-500/5' : ''}`}>
                           {log.level === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                           {log.level === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />}
                           {(log.level === 'info' || log.level === 'log') && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />}
                           
                           <div className={`flex-1 break-all whitespace-pre-wrap ${
                               log.level === 'error' ? 'text-red-400' : 
                               log.level === 'warn' ? 'text-yellow-400' : 
                               log.level === 'info' ? 'text-blue-400' : 'text-gray-300'
                           }`}>
                               {log.message.map((m, idx) => (
                                   <span key={idx} className="mr-2 opacity-90">{typeof m === 'object' ? JSON.stringify(m, null, 2) : String(m)}</span>
                               ))}
                           </div>
                           <button 
                             onClick={() => copyLog(log.message)}
                             className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-opacity"
                           >
                               <Copy className="w-3 h-3" />
                           </button>
                      </div>
                  ))}
                  <div ref={consoleEndRef} />
              </div>
          </div>
      )}
    </div>
  );
};