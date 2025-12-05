import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';
import { Terminal, X } from 'lucide-react';

interface TerminalPanelProps {
  webcontainerInstance: WebContainer | null;
  isContainerReady: boolean;
  onClose: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ webcontainerInstance, isContainerReady, onClose }) => {
    const [output, setOutput] = useState<string[]>(['']);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    const shellProcess = useRef<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [output, scrollToBottom]);

    useEffect(() => {
        if (isContainerReady && webcontainerInstance && !shellProcess.current) {
            const spawnShell = async () => {
                try {
                    const process = await webcontainerInstance.spawn('jsh');
                    shellProcess.current = process;
                    
                    setOutput(prev => [...prev, 'Welcome to WebContainer JSH!', '$ ']);

                    process.output.pipeTo(new WritableStream({
                        write(data) {
                            setOutput(prev => {
                                const lastLine = prev[prev.length - 1];
                                const newLines = data.split('\n');
                                if (newLines.length === 1) {
                                    return [...prev.slice(0, -1), lastLine + newLines[0]];
                                } else {
                                    return [...prev.slice(0, -1), lastLine + newLines[0], ...newLines.slice(1)];
                                }
                            });
                        }
                    }));

                    inputRef.current?.focus();
                } catch (error) {
                    console.error("Failed to spawn shell:", error);
                    setOutput(prev => [...prev, `Error: Failed to spawn shell process.`]);
                }
            };
            spawnShell();
        } else if (!isContainerReady) {
            shellProcess.current = null;
            setOutput(['']);
        }
    }, [isContainerReady, webcontainerInstance]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!input.trim() || !shellProcess.current) return;

            const writer = shellProcess.current.input.getWriter();
            await writer.write(input + '\n');
            writer.releaseLock();
            
            if (input.trim()) {
                setHistory(prev => [input, ...prev]);
            }
            setHistoryIndex(-1);
            setInput('');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex < history.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInput(history[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(history[newIndex]);
            } else {
                setHistoryIndex(-1);
                setInput('');
            }
        }
    };
    
    return (
        <div className="h-full flex flex-col bg-[#111] text-white font-mono" onClick={() => inputRef.current?.focus()}>
            {/* Header */}
            <div className="h-8 px-3 flex items-center justify-between bg-sidebar border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Terminal</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
                    <X className="w-4 h-4" />
                </button>
            </div>
            {/* Body */}
            <div className="flex-1 p-2 overflow-y-auto custom-scrollbar" ref={scrollRef}>
                <div className="whitespace-pre-wrap break-all text-xs">
                    {!isContainerReady && <p className="text-yellow-500">Waiting for WebContainer to boot...</p>}
                    {output.slice(0, -1).map((line, index) => <p key={index}>{line}</p>)}
                </div>
                 <div className="flex">
                    <span className="text-cyan-400 shrink-0">{output[output.length - 1]}</span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="bg-transparent border-none outline-none w-full text-xs text-white pl-1"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={!isContainerReady}
                        autoFocus
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                    />
                </div>
            </div>
        </div>
    );
};
