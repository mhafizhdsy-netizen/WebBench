import React, { useEffect, useState, useRef } from 'react';
import { File } from '../../types';
import { RefreshCw, Monitor, Smartphone, Tablet, AlertTriangle, Code, Trash2, ChevronUp } from 'lucide-react';
import { WebBenchLoader } from '../ui/Loader';

interface PreviewProps {
  files: Record<string, File>;
  refreshTrigger: number;
  previewEntryPath: string;
  onNavigate: (path: string) => void;
}

type LogLevel = 'log' | 'warn' | 'error';
interface LogEntry {
  level: LogLevel;
  message: any[];
  timestamp: number;
}

const navigationAndConsoleInterceptorScript = `
function resolvePath(base, relative) {
    // If the path is already absolute, or an external link, return it as is.
    // The click handler already checks for http, but this is a safeguard.
    if (relative.startsWith('/') || relative.startsWith('http')) {
        return relative;
    }

    // Get the directory of the base path. E.g., for '/pages/about.html', this is '/pages'
    const baseDir = base.substring(0, base.lastIndexOf('/'));
    const stack = baseDir.split('/').filter(p => p); // E.g., ['pages']
    const parts = relative.split('/');

    for (const part of parts) {
        if (part === '.' || part === '') continue; // Ignore './' and empty parts from '//'
        if (part === '..') {
            stack.pop(); // Go up one level
        } else {
            stack.push(part); // Go down into a directory or add filename
        }
    }
    return '/' + stack.join('/');
}

document.addEventListener('DOMContentLoaded', () => {
  const CURRENT_PATH = '%%CURRENT_PATH%%';

  document.body.addEventListener('click', (e) => {
    let target = e.target;
    // Traverse up the DOM to find an anchor tag
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }

    if (target && target.tagName === 'A') {
      const anchor = target;
      const href = anchor.getAttribute('href');

      // Intercept relative local links
      if (href && !href.startsWith('#') && !href.startsWith('http')) {
        e.preventDefault();
        const absolutePath = resolvePath(CURRENT_PATH, href);
        window.parent.postMessage({ type: 'navigate', path: absolutePath }, '*');
      }
    }
  });
});


// --- Console Interceptor ---
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
};

const sendLog = (level, args) => {
  try {
    // Basic serialization for complex objects
    const serializedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return { __error: true, message: arg.message, stack: arg.stack };
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch(e) {
          return arg.toString();
        }
      }
      return arg;
    });
    window.parent.postMessage({ type: 'console', level, message: serializedArgs }, '*');
  } catch(e) {
    originalConsole.error('Error posting log to parent:', e);
  }
};

console.log = (...args) => {
  originalConsole.log(...args);
  sendLog('log', args);
};
console.warn = (...args) => {
  originalConsole.warn(...args);
  sendLog('warn', args);
};
console.error = (...args) => {
  originalConsole.error(...args);
  sendLog('error', args);
};

window.onerror = (message, source, lineno, colno, error) => {
  const errorArgs = [message, 'at', \`\${source}:\${lineno}:\${colno}\`];
  if(error) {
    errorArgs.push(error.stack);
  }
  sendLog('error', errorArgs);
};
`;


export const Preview: React.FC<PreviewProps> = ({ files, refreshTrigger, previewEntryPath, onNavigate }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const consoleBodyRef = useRef<HTMLDivElement>(null);

  const errorCount = logs.filter(log => log.level === 'error').length;
  
  useEffect(() => {
    if (consoleBodyRef.current) {
        consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight;
    }
  }, [logs]);

  const bundleProject = (entryPath: string) => {
    const htmlFile = files[entryPath] || files['/index.html'];
    if (!htmlFile) return '<h1>No index.html found</h1>';

    let content = htmlFile.content;

    const resolveAssetPath = (basePath: string, relativePath: string) => {
        if (relativePath.startsWith('/') || relativePath.startsWith('http') || relativePath.startsWith('data:')) {
            return relativePath;
        }
        const baseDir = basePath.substring(0, basePath.lastIndexOf('/'));
        const stack = baseDir.split('/').filter(p => p);
        const parts = relativePath.split('/');

        for (const part of parts) {
            if (part === '.' || part === '') continue;
            if (part === '..') {
                stack.pop();
            } else {
                stack.push(part);
            }
        }
        return '/' + stack.join('/');
    };

    // Inject CSS
    const cssMatches = content.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/g);
    if (cssMatches) {
      cssMatches.forEach(match => {
        const hrefMatch = match.match(/href=["']([^"']+)["']/);
        if (hrefMatch && !hrefMatch[1].startsWith('http') && !hrefMatch[1].startsWith('data:')) {
          const path = resolveAssetPath(entryPath, hrefMatch[1]);
          const cssFile = files[path];
          if (cssFile) {
            content = content.replace(match, `<style>${cssFile.content}</style>`);
          } else {
            console.warn(`[Preview] CSS file not found at resolved path: ${path}`);
          }
        }
      });
    }

    // Inject JS
    const jsMatches = content.match(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/g);
    if (jsMatches) {
      jsMatches.forEach(match => {
        const srcMatch = match.match(/src=["']([^"']+)["']/);
        if (srcMatch && !srcMatch[1].startsWith('http')) {
           const path = resolveAssetPath(entryPath, srcMatch[1]);
           const jsFile = files[path];
          if (jsFile) {
            content = content.replace(match, `<script>${jsFile.content}</script>`);
          } else {
            console.warn(`[Preview] JS file not found at resolved path: ${path}`);
          }
        }
      });
    }

    // Inject interceptor script and pass the current path
    const finalScript = navigationAndConsoleInterceptorScript.replace('%%CURRENT_PATH%%', entryPath);
    content = content.replace('</body>', `<script>${finalScript}</script></body>`);

    return content;
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow) return;
        
        const { type, path, level, message } = event.data;
        if (type === 'navigate' && path) {
            if (files[path]) {
                onNavigate(path);
            } else {
                console.warn(`Preview navigation failed: file not found at path "${path}"`);
            }
        } else if (type === 'console') {
            setLogs(prev => [...prev, { level, message, timestamp: Date.now() }]);
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [files, onNavigate]);

  useEffect(() => {
    if (!iframeRef.current) return;
    setLoading(true);
    setLogs([]);
    iframeRef.current.srcdoc = bundleProject(previewEntryPath);
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 150);
    return () => clearTimeout(timeout);
  }, [files, refreshTrigger, previewEntryPath]);

  const getDeviceClasses = () => {
    switch (size) {
      case 'mobile': return 'w-[390px] h-[844px] bg-black rounded-[40px] md:rounded-[54px] p-2.5 md:p-3.5 shadow-2xl ring-2 ring-gray-800';
      case 'tablet': return 'w-[768px] h-[1024px] bg-black rounded-[24px] md:rounded-[32px] p-3 md:p-4 shadow-2xl ring-2 ring-gray-800';
      default: return 'w-full h-full bg-sidebar';
    }
  };

  const getIframeClasses = () => {
    switch(size) {
      case 'mobile': return 'rounded-[30px] md:rounded-[40px]';
      case 'tablet': return 'rounded-[16px] md:rounded-[20px]';
      default: return '';
    }
  }
  
  const handleRefresh = () => {
    setLoading(true);
    if (iframeRef.current) {
        setLogs([]);
        iframeRef.current.srcdoc = bundleProject(previewEntryPath);
    }
    setTimeout(() => setLoading(false), 500);
  };
  
  const renderLogMessage = (args: any[]) => {
    return args.map((arg, index) => {
        if (arg && arg.__error) {
            return <span key={index} className="text-red-400">{arg.stack || arg.message}</span>;
        }
        if (typeof arg === 'object' && arg !== null) {
            return <pre key={index} className="text-xs">{JSON.stringify(arg, null, 2)}</pre>;
        }
        return <span key={index}>{String(arg)}&nbsp;</span>;
    });
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-l border-border">
      <div className="h-9 px-3 md:px-4 flex items-center justify-between border-b border-border">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preview</span>
        <div className="flex items-center gap-1.5 md:gap-2">
          <button 
            onClick={() => setSize('mobile')} 
            className={`p-1 rounded ${size === 'mobile' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`}
            title="Mobile View"
          >
            <Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button 
            onClick={() => setSize('tablet')} 
            className={`p-1 rounded ${size === 'tablet' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`}
            title="Tablet View"
          >
            <Tablet className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button 
            onClick={() => setSize('desktop')} 
            className={`p-1 rounded ${size === 'desktop' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`}
            title="Desktop View"
          >
            <Monitor className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <div className="w-px h-4 bg-gray-600 mx-1"></div>
          <button 
            onClick={handleRefresh} 
            className="p-1 text-gray-400 hover:text-white"
            title="Refresh Preview"
          >
            <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className={`flex-1 bg-background flex flex-col items-center justify-center overflow-auto p-3 md:p-4 custom-scrollbar transition-all duration-300 ${isConsoleOpen ? 'pb-0 md:pb-0' : ''}`}>
        
        {loading && (
          <div className="absolute inset-0 z-20 bg-sidebar/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
            <WebBenchLoader size="sm" text="Building Preview..."/>
          </div>
        )}

        <div 
          className={`transition-all duration-300 overflow-hidden relative z-10 shrink-0 ${getDeviceClasses()}`}
        >
          {size === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 md:h-8 md:w-40 bg-black rounded-b-2xl z-20 flex justify-center items-center">
              <div className="w-10 h-1 md:w-12 md:h-1.5 bg-gray-700 rounded-full"></div>
            </div>
          )}
          <iframe 
            ref={iframeRef}
            title="preview"
            className={`w-full h-full border-none bg-white ${getIframeClasses()}`}
            sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
          />
        </div>
      </div>
      
      {/* Console Area */}
      <div className={`shrink-0 transition-all duration-300 ${isConsoleOpen ? 'h-48 md:h-56' : 'h-8'}`}>
        <div className="h-full flex flex-col bg-[#252526] border-t border-border">
          {/* Console Header */}
          <div className="h-8 flex items-center justify-between px-3 md:px-4 border-b border-border shrink-0">
             <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Console</span>
                {errorCount > 0 && (
                    <div className="flex items-center gap-1 bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full text-xs">
                        <AlertTriangle className="w-3 h-3"/>
                        <span>{errorCount}</span>
                    </div>
                )}
             </div>
             <div className="flex items-center gap-2">
                <button onClick={() => setLogs([])} title="Clear console" className="text-gray-400 hover:text-white"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4"/></button>
                <button onClick={() => setIsConsoleOpen(!isConsoleOpen)} title={isConsoleOpen ? "Collapse Console" : "Expand Console"} className="text-gray-400 hover:text-white">
                    <ChevronUp className={`w-4 h-4 md:w-5 md:h-5 transition-transform ${isConsoleOpen ? '' : 'rotate-180'}`} />
                </button>
             </div>
          </div>
          {/* Console Body */}
          {isConsoleOpen && (
            <div ref={consoleBodyRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 text-xs font-mono">
                {logs.map((log, i) => (
                    <div key={i} className={`flex items-start gap-2 p-1 border-b border-white/5 ${log.level === 'error' ? 'text-red-400 bg-red-500/5' : log.level === 'warn' ? 'text-yellow-400 bg-yellow-500/5' : 'text-gray-300'}`}>
                       <span className="text-gray-500 shrink-0 select-none">{new Date(log.timestamp).toLocaleTimeString()}</span>
                       <div className="flex-1 whitespace-pre-wrap break-all">{renderLogMessage(log.message)}</div>
                    </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};