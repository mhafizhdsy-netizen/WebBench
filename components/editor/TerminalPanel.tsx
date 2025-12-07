import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebContainer, WebContainerProcess } from '@webcontainer/api';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { useSettings } from '../../context/ThemeContext';
import { File as ProjectFile, Project } from '../../types';

interface TerminalPanelProps {
  webcontainerInstance: WebContainer | null;
  isContainerReady: boolean;
  onClose: () => void;
  projectType?: Project['type'];
  files?: Record<string, ProjectFile>;
}

declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ 
    webcontainerInstance, 
    isContainerReady, 
    onClose,
    projectType,
    files
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const processRef = useRef<WebContainerProcess | null>(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const [pythonReady, setPythonReady] = useState(false);

    // Initial Setup
    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: "'Fira Code', monospace",
            theme: {
                background: '#111111',
                foreground: '#cccccc',
                cursor: '#ffffff',
                selectionBackground: '#5da5f5aa',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#e5e5e5',
            },
            convertEol: true, 
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        
        term.open(containerRef.current);
        fitAddon.fit();
        
        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        term.write('\x1b[38;2;64;200;255mWebBench Terminal\x1b[0m\r\n');
        
        if (projectType === 'react-vite' || projectType === 'nextjs') {
            if (!isContainerReady) {
                term.write('\x1b[33mWaiting for WebContainer to boot...\x1b[0m\r\n');
            }
        } else if (projectType === 'python') {
             term.write('\x1b[33mInitializing Python Environment (Pyodide)...\x1b[0m\r\n');
             initPython(term);
        } else if (projectType === 'php') {
             term.write('\x1b[33mInitializing PHP Environment...\x1b[0m\r\n');
             // For PHP we mimic a basic output for now as fully integrated PHP-Wasm with CORS needs special handling
             setTimeout(() => {
                 term.write('\x1b[32m✔ PHP Mode Ready.\x1b[0m\r\n');
                 term.write('Note: PHP execution is simulated in this environment.\r\n$ ');
             }, 1000);
             
             term.onData(data => {
                  const code = data.charCodeAt(0);
                  if (code === 13) { // Enter
                      term.write('\r\n\x1b[31mError: Server-side execution not available.\x1b[0m\r\n$ ');
                  } else if (code === 127) { // Backspace
                      term.write('\b \b');
                  } else {
                      term.write(data);
                  }
             });
        }

        const handleResize = () => {
             fitAddon.fit();
             if (processRef.current && terminalRef.current) {
                 const dims = fitAddon.proposeDimensions();
                 if (dims) {
                     processRef.current.resize({ cols: dims.cols, rows: dims.rows });
                 }
             }
        };
        
        window.addEventListener('resize', handleResize);
        const resizeObserver = new ResizeObserver(() => {
             setTimeout(handleResize, 10);
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
            term.dispose();
            processRef.current?.kill();
        };
    }, []);

    const initPython = async (term: Terminal) => {
        if (!window.loadPyodide) {
            term.write('\x1b[31mError: Pyodide script not loaded.\x1b[0m\r\n');
            return;
        }

        try {
            const pyodide = await window.loadPyodide();
            window.pyodide = pyodide;
            await pyodide.loadPackage("micropip");
            
            // Mount Files
            if (files) {
                 Object.values(files).forEach((f: ProjectFile) => {
                     const path = f.path.startsWith('/') ? f.path.substring(1) : f.path;
                     if (path.includes('/')) {
                         const dir = path.substring(0, path.lastIndexOf('/'));
                         pyodide.FS.mkdirTree(dir);
                     }
                     pyodide.FS.writeFile(path, f.content);
                 });
            }

            // Setup I/O
            pyodide.setStdout({ batched: (msg: string) => term.write(msg + '\r\n') });
            pyodide.setStderr({ batched: (msg: string) => term.write(`\x1b[31m${msg}\x1b[0m\r\n`) });

            term.write('\x1b[32m✔ Python Ready.\x1b[0m\r\n');
            setPythonReady(true);
            
            // Run main.py if exists
            if (files && files['/main.py']) {
                term.write('\x1b[36mRunning main.py...\x1b[0m\r\n');
                try {
                    await pyodide.runPythonAsync(files['/main.py'].content);
                } catch(e: any) {
                    term.write(`\x1b[31m${e.message}\x1b[0m\r\n`);
                }
                term.write('\r\n>>> ');
            } else {
                term.write('>>> ');
            }

            // Simple REPL Handler
            let currentLine = '';
            term.onData(async (data) => {
                const code = data.charCodeAt(0);
                if (code === 13) { // Enter
                    term.write('\r\n');
                    if (currentLine.trim() === 'clear') {
                        term.clear();
                        currentLine = '';
                        term.write('>>> ');
                        return;
                    }
                    try {
                        await pyodide.runPythonAsync(currentLine);
                    } catch (e: any) {
                        term.write(`\x1b[31m${e.message}\x1b[0m\r\n`);
                    }
                    currentLine = '';
                    term.write('>>> ');
                } else if (code === 127) { // Backspace
                    if (currentLine.length > 0) {
                        currentLine = currentLine.slice(0, -1);
                        term.write('\b \b');
                    }
                } else {
                    currentLine += data;
                    term.write(data);
                }
            });

        } catch (e: any) {
             term.write(`\x1b[31mFailed to load Python: ${e.message}\x1b[0m\r\n`);
        }
    };

    // Connect to WebContainer Shell (Node.js)
    useEffect(() => {
        if ((projectType === 'react-vite' || projectType === 'nextjs') && isContainerReady && webcontainerInstance && terminalRef.current && !processRef.current) {
            const term = terminalRef.current;
            const fitAddon = fitAddonRef.current;

            const startShell = async () => {
                term.write('\x1b[2K\r'); // Clear line
                term.write('\x1b[32m✔ WebContainer Ready. Starting shell...\x1b[0m\r\n');
                
                const dims = fitAddon?.proposeDimensions();
                const process = await webcontainerInstance.spawn('jsh', {
                    terminal: {
                        cols: dims?.cols || 80,
                        rows: dims?.rows || 24,
                    }
                });
                
                processRef.current = process;
                
                process.output.pipeTo(new WritableStream({
                    write(data) {
                        term.write(data);
                    }
                }));

                const inputWriter = process.input.getWriter();
                const disposable = term.onData((data) => {
                    inputWriter.write(data);
                });

                await process.exit;
                disposable.dispose();
                term.write('\r\n\x1b[31mShell terminated.\x1b[0m\r\n');
                processRef.current = null;
            };

            startShell();
        }
    }, [isContainerReady, webcontainerInstance, projectType]);

    const focusTerminal = () => {
        terminalRef.current?.focus();
    };
    
    const handleRestart = () => {
        if (!terminalRef.current) return;
        terminalRef.current.clear();
        terminalRef.current.write('\x1b[33mRestarting Environment...\x1b[0m\r\n');
        
        if (projectType === 'python') {
            initPython(terminalRef.current);
        }
    };

    return (
        <div className={`h-full flex flex-col bg-[#111] text-white font-mono border-t border-border ${isMaximized ? 'fixed inset-0 z-50' : 'relative'}`}>
            {/* Header */}
            <div className="h-8 px-3 flex items-center justify-between bg-sidebar border-b border-border shrink-0 select-none">
                <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {projectType === 'python' ? 'Python REPL' : projectType === 'php' ? 'PHP Output' : 'Terminal'}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {projectType === 'python' && (
                         <button 
                            onClick={handleRestart} 
                            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Restart Kernel"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button 
                        onClick={() => setIsMaximized(!isMaximized)} 
                        className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                        onClick={onClose} 
                        className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                        title="Close Terminal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {/* Terminal Container */}
            <div 
                className="flex-1 overflow-hidden p-1 relative" 
                onClick={focusTerminal}
            >
                <div ref={containerRef} className="absolute inset-1" />
            </div>
        </div>
    );
};
