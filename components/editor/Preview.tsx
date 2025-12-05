import React, { useEffect, useState, useRef } from 'react';
import { Project, File } from '../../types';
import { Monitor, Smartphone, Tablet, AlertTriangle, Code, X, Terminal, Copy, Check, RefreshCw } from 'lucide-react';
import { WebBenchLoader } from '../ui/Loader';
import type { StartupStatus } from '../../pages/Editor';
import { Button } from '../ui/Button';

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
}

type LogLevel = 'log' | 'warn' | 'error';
interface LogEntry {
  level: LogLevel;
  message: any[];
  timestamp: number;
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
        const originalConsole = { ...console };
        const levels = ['log', 'warn', 'error', 'info', 'debug'];
        
        function serialize(arg) {
            if (arg instanceof Error) return arg.message + '\\n' + (arg.stack || '');
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return '[Circular or Unserializable Object]';
                }
            }
            return String(arg);
        }

        levels.forEach(level => {
            console[level] = (...args) => {
                originalConsole[level](...args);
                try {
                    const message = args.map(serialize);
                    window.parent.postMessage({ type: 'console', level, message }, '*');
                } catch(e) {
                    // ignore
                }
            };
        });

        window.addEventListener('error', (event) => {
            window.parent.postMessage({ type: 'console', level: 'error', message: [event.message] }, '*');
        });

        window.addEventListener('unhandledrejection', (event) => {
             const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
             window.parent.postMessage({ type: 'console', level: 'error', message: ['Unhandled Promise Rejection: ' + reason] }, '*');
        });

        // Navigation interceptor
        document.addEventListener('click', (e) => {
            let target = e.target;
            while (target && target.tagName !== 'A') { target = target.parentElement; }
            if (target && target.tagName === 'A') {
                const href = target.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('javascript:')) {
                    e.preventDefault();
                    
                     const currentPath = '%%CURRENT_PATH%%';
                     let basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
                    if (!basePath.startsWith('/')) basePath = '/' + basePath;
                    const dummyOrigin = 'http://webbench-preview';
                    try {
                        const resolvedUrl = new URL(href, dummyOrigin + basePath);
                        const newPath = resolvedUrl.pathname;
                        window.parent.postMessage({ type: 'navigate', path: newPath }, '*');
                    } catch (err) {
                        console.error('WebBench Navigation Error:', err);
                    }
                }
            }
        }, true);
    })();
`;

const InstructionView = ({ projectType }: { projectType: Project['type'] }) => {
    const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});

    const handleCopy = (command: string, id: string) => {
        navigator.clipboard.writeText(command);
        setCopyStatus(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setCopyStatus(prev => ({ ...prev, [id]: false })), 2000);
    };

    const getInstructions = () => {
        switch (projectType) {
            case 'laravel': return {
                title: 'Laravel Project',
                steps: [
                    { command: 'composer install', description: 'Install PHP dependencies.' },
                    { command: 'php artisan serve', description: 'Start the development server.' }
                ]
            };
            case 'python': return {
                title: 'Python Project',
                steps: [{ command: 'python main.py', description: 'Execute the Python script.' }]
            };
            case 'php': return {
                title: 'PHP Project',
                steps: [{ command: 'php -S localhost:8000', description: 'Start the built-in PHP server.' }]
            };
            case 'cpp': return {
                title: 'C++ Project',
                steps: [
                    { command: 'g++ main.cpp -o main', description: 'Compile the source code.' },
                    { command: './main', description: 'Run the compiled executable.' }
                ]
            };
            default: return null;
        }
    };

    const instructions = getInstructions();
    if (!instructions) return null;

    return (
        <div className="h-full flex flex-col items-center justify-center bg-background text-gray-300 p-4 text-center">
            <Terminal className="w-12 h-12 text-accent mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{instructions.title}</h3>
            <p className="text-sm text-gray-500 mb-6">This project type runs locally. Follow these steps in your terminal:</p>
            <div className="w-full max-w-md space-y-3">
                {instructions.steps.map((step, index) => (
                    <div key={index} className="text-left">
                        <p className="text-xs text-gray-400 mb-1 ml-1">{index + 1}. {step.description}</p>
                        <div className="flex items-center gap-2 bg-sidebar p-3 rounded-lg border border-border">
                            <span className="text-green-400 font-mono text-sm flex-1 overflow-x-auto no-scrollbar">$ {step.command}</span>
                            <button onClick={() => handleCopy(step.command, `cmd-${index}`)} className="p-2 rounded-md hover:bg-active text-gray-400 hover:text-white transition-colors">
                                {copyStatus[`cmd-${index}`] ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const Preview: React.FC<PreviewProps> = ({ 
    project, refreshTrigger, previewEntryPath, onNavigate, isMobile, onClose,
    startupStatus, startupLog, serverUrl 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'console' | 'terminal'>('terminal');
  const [showPanel, setShowPanel] = useState(false);
  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);
  const consoleBodyRef = useRef<HTMLDivElement>(null);
  
  const isStatic = !project.type || project.type === 'starter' || project.type === 'blank';
  const isRunnable = project.type === 'react-vite' || project.type === 'nextjs';
  const isInstructional = !isStatic && !isRunnable;
  
  const errorCount = logs.filter(log => log.level === 'error').length;

  useEffect(() => {
    console.log('[WebContainer Diagnostic]', {
      crossOriginIsolated: window.crossOriginIsolated,
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      browser: navigator.userAgent
    });
  }, []);
  
  useEffect(() => {
    if ((activeTab === 'console' && consoleBodyRef.current)) {
        consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight;
    }
  }, [logs, activeTab, showPanel]);

  const getMimeType = (fileType: string) => {
    switch (fileType) {
        case 'html': return 'text/html';
        case 'css': return 'text/css';
        case 'javascript': return 'application/javascript';
        case 'json': return 'application/json';
        case 'image': return 'image/png'; 
        default: return 'text/plain';
    }
  };

  const bundleProject = (entryPath: string) => {
    const htmlFile = project.files[entryPath] || project.files['/index.html'];
    if (!htmlFile) return '<h1>No index.html found</h1>';
    let content = htmlFile.content;
    const regex = /(href|src)=["'](?!\w+:\/\/)(?!#)([^"']+)["']/g;
    content = content.replace(regex, (match, attr, path) => {
        const fullPath = new URL(path, `file://${entryPath}`).pathname;
        const file = project.files[fullPath];
        if (!file) return match;

        if (file.type === 'html') return match;

        const mimeType = getMimeType(file.type);
        const blob = new Blob([file.content], { type: mimeType });
        return `${attr}="${URL.createObjectURL(blob)}"`;
    });

    // Inject interceptor at the start of HEAD to catch early logs and errors
    const interceptor = `<script>${navigationAndConsoleInterceptorScript.replace('%%CURRENT_PATH%%', entryPath)}</script>`;
    if (content.includes('<head>')) {
        content = content.replace('<head>', `<head>${interceptor}`);
    } else if (content.includes('<html>')) {
         content = content.replace('<html>', `<html><head>${interceptor}</head>`);
    } else {
        content = interceptor + content;
    }

    return content;
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (!isStatic || event.source !== iframeRef.current?.contentWindow) return;
        const { type, path, level, message } = event.data;
        if (type === 'navigate' && path) onNavigate(path);
        else if (type === 'console') setLogs(prev => [...prev, { level, message, timestamp: Date.now() }]);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [project.files, onNavigate, isStatic]);
  
  // Static project refresh logic
  useEffect(() => {
    if (!iframeRef.current) return;
    
    if (isStatic) {
        setLoading(true);
        setLogs([]);
        iframeRef.current.srcdoc = bundleProject(previewEntryPath);
        const timeout = setTimeout(() => setLoading(false), 150);
        return () => clearTimeout(timeout);
    } else if (isRunnable && serverUrl) {
        // For runnable, we reload the iframe if specific refresh was requested
        // But mainly standard refresh is handled by WebContainer HMR usually.
        // If this is a manual refresh:
        iframeRef.current.src = serverUrl;
    }
  }, [project.files, refreshTrigger, internalRefreshTrigger, previewEntryPath, isStatic, serverUrl, isRunnable]);
  
  const handleManualRefresh = () => {
    setInternalRefreshTrigger(prev => prev + 1);
  };

  const getDeviceClasses = () => {
    switch(size) {
      case 'mobile': return 'w-[375px] h-[667px] shadow-2xl rounded-2xl border-4 border-gray-700';
      case 'tablet': return 'w-[768px] h-[1024px] shadow-2xl rounded-2xl border-4 border-gray-700';
      default: return 'w-full h-full';
    }
  };

  const renderLogMessage = (args: any[]) => {
    return args.map((arg, i) => {
      try {
        const content = JSON.parse(arg);
        if (typeof content === 'object') return <pre key={i} className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(content, null, 2)}</pre>;
        return <span key={i}>{content.toString()} </span>;
      } catch (e) {
        return <span key={i}>{arg} </span>;
      }
    });
  };

  const renderContent = () => {
    if (isInstructional) {
      return <InstructionView projectType={project.type} />;
    }
    
    if (isRunnable) {
        const showLoadingOverlay = startupStatus !== 'running' && startupStatus !== 'idle';
        return (
             <div className="flex-1 bg-background flex flex-col items-center justify-center overflow-auto p-3 md:p-4 custom-scrollbar relative">
                {showLoadingOverlay && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm text-center p-4">
                        {startupStatus === 'error' ? (
                             <>
                                <AlertTriangle className="w-10 h-10 text-red-400 mb-4" />
                                <p className="font-semibold text-red-300 mb-2">WebContainer failed to start.</p>
                                <p className="text-xs text-gray-400 mb-4">Check the browser console (DevTools) and startup log for more details.</p>
                                <Button onClick={() => window.location.reload()} size="sm">
                                    Retry
                                </Button>
                             </>
                        ) : (
                            <>
                                <WebBenchLoader size="md" />
                                <p className="mt-4 text-sm text-gray-400">{statusMessages[startupStatus]}</p>
                            </>
                        )}
                    </div>
                )}
                 <iframe ref={iframeRef} src={serverUrl || 'about:blank'} title="preview" className="w-full h-full border-none bg-white rounded-lg" sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin" />
             </div>
        );
    }
    
    // isStatic
    return (
      <div className="flex-1 bg-background flex flex-col items-center justify-center overflow-auto p-3 md:p-4 custom-scrollbar relative">
        {loading && <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/50"><WebBenchLoader size="md"/></div>}
        <div className={`transition-all duration-300 overflow-hidden relative z-10 shrink-0 ${getDeviceClasses()}`}>
          <iframe ref={iframeRef} title="preview" className={`w-full h-full border-none bg-white ${size === 'desktop' ? 'rounded-lg' : 'rounded-sm'}`} sandbox="allow-scripts allow-forms allow-popups allow-modals" />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-l border-border">
      <div className="h-9 px-3 md:px-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preview</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
            {isStatic && (
                <>
                    <button onClick={() => setSize('mobile')} className={`p-1 rounded ${size === 'mobile' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`} title="Mobile View"><Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                    <button onClick={() => setSize('tablet')} className={`p-1 rounded ${size === 'tablet' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`} title="Tablet View"><Tablet className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                    <button onClick={() => setSize('desktop')} className={`p-1 rounded ${size === 'desktop' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`} title="Desktop View"><Monitor className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                    <div className="w-px h-4 bg-gray-600 mx-1"></div>
                </>
            )}

            {/* Console Toggle */}
            <button 
                onClick={() => setShowPanel(!showPanel)} 
                className={`p-1 rounded relative ${showPanel ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`} 
                title="Toggle Console"
            >
                <Code className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {!showPanel && errorCount > 0 && (
                     <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
            </button>

             {/* Refresh Button */}
             <button 
                onClick={handleManualRefresh} 
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10" 
                title="Refresh Preview"
            >
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>

            {/* Close Button (Mobile only logic passed from parent usually, or generic close) */}
            {isMobile && onClose && (
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded" title="Close Preview">
                    <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
            )}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        {renderContent()}
        
        {/* Bottom Panel (Logs/Console) */}
        {showPanel && (
            <div className={`flex flex-col bg-sidebar border-t border-border shrink-0 h-48 animate-in slide-in-from-bottom-5 duration-200`}>
                <div className="flex items-center border-b border-border">
                    {isRunnable && <button onClick={() => setActiveTab('terminal')} className={`px-3 py-1.5 text-xs flex items-center gap-2 ${activeTab === 'terminal' ? 'bg-active text-white' : 'text-gray-400 hover:bg-active/50'}`}><Terminal className="w-3.5 h-3.5"/> Startup Log</button>}
                    <button onClick={() => setActiveTab('console')} className={`px-3 py-1.5 text-xs flex items-center gap-2 ${activeTab === 'console' ? 'bg-active text-white' : 'text-gray-400 hover:bg-active/50'}`}>
                        <Code className="w-3.5 h-3.5"/> Console
                        {errorCount > 0 && <div className="flex items-center gap-1 rounded-full text-xs px-1.5 bg-red-500/20 text-red-400"><AlertTriangle className="w-3 h-3"/>{errorCount}</div>}
                    </button>
                    <div className="ml-auto px-2">
                        <button onClick={() => setShowPanel(false)} className="text-gray-500 hover:text-white"><X className="w-3 h-3"/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {activeTab === 'console' && (
                        <div ref={consoleBodyRef} className="p-2 text-xs font-mono">
                            {logs.length === 0 && <div className="text-gray-500 italic p-2">No logs yet. Interact with the preview to see output.</div>}
                            {logs.map((log, i) => (
                                <div key={i} className={`flex items-start gap-2 py-1 border-b border-border/50 ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'}`}>
                                    <span className="opacity-60">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <div className="flex-1 break-words">{renderLogMessage(log.message)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'terminal' && isRunnable && (
                        <pre className="p-2 text-xs font-mono whitespace-pre-wrap break-all h-full">
                            {startupLog}
                        </pre>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};