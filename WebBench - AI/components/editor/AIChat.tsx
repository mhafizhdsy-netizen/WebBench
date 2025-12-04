import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { File, ChatMessage, ChatSession } from '../../types';
import { Button } from '../ui/Button';
import { generateSuggestions } from '../../services/geminiService';
import { Send, Sparkles, X, Bot, User as UserIcon, ArrowDown, Loader2, Lightbulb, RefreshCw, ChevronRight, Paperclip, FileText, Cpu, CheckCircle2, LinkIcon, History, Plus, ChevronDown, Square, Trash2, MoreVertical, AlertTriangle } from 'lucide-react';

declare global {
  interface Window {
    Prism: any;
  }
}

// Custom CodeBlock component for stable Prism highlighting in final markdown
const CodeBlock = React.memo(({ className, children }: any) => {
  const codeRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (codeRef.current && window.Prism) {
      window.Prism.highlightElement(codeRef.current);
    }
  }, [children, className]);

  // Extract file path from comment on the first line
  const codeString = React.Children.toArray(children).join('');
  const firstLine = codeString.split('\n')[0] || '';
  const pathMatch = firstLine.match(/(?:<!--|\/\/|\/\*)\s*(\/[a-zA-Z0-9_\-\./]+)/);
  const path = pathMatch ? pathMatch[1] : null;

  return (
    <div className="my-2 border border-border bg-background rounded-lg overflow-auto">
       {path && (
          <div className="px-3 py-1.5 bg-active border-b border-border text-xs text-gray-400 font-mono">
              {path}
          </div>
       )}
       <pre className="!bg-transparent !my-0 !p-3 !text-sm">
        <code ref={codeRef} className={`${className} font-mono`} style={{textShadow: 'none'}}>
          {children}
        </code>
      </pre>
    </div>
  );
});

// Live Renderer for streaming code
const LiveCodeRenderer = ({ stream }: { stream: ChatMessage['liveStream'] }) => {
  const codeRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (codeRef.current && window.Prism) {
      // Use Prism's async highlighting for streaming content
      window.Prism.highlightElement(codeRef.current, false);
    }
    // Auto-scroll to bottom of code view
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [stream?.currentCode]);

  if (!stream) {
    return (
       <div className="mt-2 border border-border bg-background rounded-lg min-h-[100px] flex items-center justify-center">
         <div className="flex items-center space-x-1.5 py-1">
         </div>
       </div>
    );
  }

  return (
    <div className="mt-2 border border-border bg-background rounded-lg overflow-hidden animate-fade-in">
      <div className="px-3 py-1.5 bg-active border-b border-border text-xs text-gray-400 font-mono flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Generating: {stream.currentFile}</span>
      </div>
      <div ref={scrollContainerRef} className="max-h-80 overflow-y-auto custom-scrollbar">
        <pre className="!bg-transparent !my-0 !p-3 !font-mono overflow-x-auto">
          <code ref={codeRef} className={`language-${stream.language} !text-sm`} style={{textShadow: 'none'}}>
            {stream.currentCode || ' '}
          </code>
        </pre>
      </div>
    </div>
  );
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'text/plain', 'text/markdown', 'text/html', 'text/css', 'text/javascript', 'application/json'
];

interface Attachment {
  name: string;
  type: string;
  mimeType: string;
  data: string; // base64
  dataUrl: string; // data URL
}

type ModelName = 'gemini-flash-lite-latest' | 'gemini-2.5-flash' | 'gemini-3-pro-preview';

const MODEL_CYCLE: ModelName[] = ['gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-3-pro-preview'];

const MODEL_CONFIG: Record<ModelName, { name: string; description: string; icon: React.FC<any> }> = {
    'gemini-flash-lite-latest': { name: 'Fast', description: 'Quick responses for simple tasks.', icon: Sparkles },
    'gemini-2.5-flash': { name: 'Balanced', description: 'Good balance of speed and capability.', icon: Cpu },
    'gemini-3-pro-preview': { name: 'Advanced', description: 'Slower, but best for complex requests.', icon: Cpu }
};

interface AIChatProps {
  files: Record<string, File>;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSendMessage: (prompt: string, attachments: Attachment[], model: string, sessionId: string) => Promise<void>;
  onRegenerate: (sessionId: string) => Promise<void>;
  onClose: () => void;
  onOpenCheckpoints: () => void;
  onCreateSession: () => void;
  onSwitchSession: (sessionId: string) => void;
  onCancel: () => void;
  onDeleteMessage: (messageId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const AIChat: React.FC<AIChatProps> = ({ 
  files, sessions, activeSessionId, onSendMessage, onRegenerate, onClose, 
  onOpenCheckpoints, onCreateSession, onSwitchSession, onCancel,
  onDeleteMessage, onDeleteSession
}) => {
  const [input, setInput] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelName>('gemini-2.5-flash');
  const [isIdeasOverlayOpen, setIsIdeasOverlayOpen] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [openMessageMenu, setOpenMessageMenu] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ideasButtonRef = useRef<HTMLButtonElement>(null);
  const ideasOverlayRef = useRef<HTMLDivElement>(null);
  const sessionDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const messageMenuRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const isLoading = messages.length > 0 && messages[messages.length - 1].isLoading === true;

  const fetchAiSuggestions = useCallback(async () => {
    setIsSuggestionsLoading(true);
    try {
      const newSuggestions = await generateSuggestions(files);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions(["Error fetching ideas.", "Try again later."]);
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, [files]);

  useEffect(() => {
    if (isIdeasOverlayOpen) {
      fetchAiSuggestions();
    }
  }, [isIdeasOverlayOpen, fetchAiSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isIdeasOverlayOpen && ideasOverlayRef.current && !ideasOverlayRef.current.contains(event.target as Node) && ideasButtonRef.current && !ideasButtonRef.current.contains(event.target as Node)) {
        setIsIdeasOverlayOpen(false);
      }
      if (isSessionDropdownOpen && sessionDropdownRef.current && !sessionDropdownRef.current.contains(event.target as Node)) {
        setIsSessionDropdownOpen(false);
      }
      if (isModelDropdownOpen && modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (openMessageMenu && messageMenuRef.current && !messageMenuRef.current.contains(event.target as Node)) {
        setOpenMessageMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isIdeasOverlayOpen, isSessionDropdownOpen, isModelDropdownOpen, openMessageMenu]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isAtBottom);
      isAutoScrollEnabled.current = isAtBottom;
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      isAutoScrollEnabled.current = true;
    }
  };

  useEffect(() => {
    if (isAutoScrollEnabled.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, messages[messages.length - 1]?.liveStream?.currentCode, activeSessionId]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach((file: globalThis.File) => {
      if (attachments.length + 1 > 5) { alert("You can attach a maximum of 5 files."); return; }
      if (file.size > 5 * 1024 * 1024) { alert(`File ${file.name} is too large (max 5MB).`); return; }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) { alert(`File type for ${file.name} is not supported.`); return; }

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64Data = dataUrl.split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          mimeType: file.type,
          data: base64Data,
          dataUrl: dataUrl
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (customInput?: string) => {
    const prompt = customInput || input;
    if (!prompt.trim() && attachments.length === 0 || isLoading || !activeSessionId) return;

    if (isIdeasOverlayOpen) setIsIdeasOverlayOpen(false);
    const attachmentsToKeep = [...attachments];
    setInput('');
    setAttachments([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    await onSendMessage(prompt, attachmentsToKeep, selectedModel, activeSessionId);
  };
  
  const handleRegenerate = async () => {
    if (isLoading || !activeSessionId) return;
    await onRegenerate(activeSessionId);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const ModelIcon = MODEL_CONFIG[selectedModel].icon;

  return (
    <div className="h-full min-h-0 flex flex-col bg-sidebar border-l border-border relative shadow-2xl">
      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={ALLOWED_MIME_TYPES.join(',')} />
      
      <div className="h-10 px-4 flex items-center justify-between border-b border-border shrink-0 bg-[#252526]/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <div className="relative" ref={sessionDropdownRef}>
            <button onClick={() => setIsSessionDropdownOpen(p => !p)} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-white/10 transition-colors">
              <span className="text-xs font-bold text-gray-200 tracking-wide">{activeSession?.name || 'Chat'}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isSessionDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSessionDropdownOpen && (
              <div className="absolute top-full mt-1.5 w-60 bg-[#2d2d30] border border-border rounded-lg shadow-2xl py-1 z-20 animate-in fade-in zoom-in-95">
                {sessions.map(session => (
                  <div key={session.id} className={`w-full flex items-center justify-between px-3 text-xs group ${session.id === activeSessionId ? 'bg-active' : 'hover:bg-active'}`}>
                    <button onClick={() => { onSwitchSession(session.id); setIsSessionDropdownOpen(false); }} className={`flex-1 text-left py-2 transition-colors ${session.id === activeSessionId ? 'text-accent' : 'text-gray-300'}`}>
                      {session.name}
                    </button>
                    {sessions.length > 1 && (
                      <button onClick={() => onDeleteSession(session.id)} className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onCreateSession} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="New Chat">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={onOpenCheckpoints} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="View Checkpoints">
            <History className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#1a1a1a]">
        {messages.map((msg, index) => {
          if (msg.role === 'system') {
            return (
              <div key={msg.clientId} className="flex justify-center items-center my-3 animate-fade-in gap-4">
                <div className="h-px flex-1 bg-border"></div>
                <span className="text-xs text-gray-400 bg-active px-3 py-1.5 rounded-full whitespace-nowrap flex items-center">
                  {msg.content.includes('✅') && <CheckCircle2 className="w-3.5 h-3.5 inline mr-2 text-green-400" />}
                  {msg.content.includes('⏪') && <History className="w-3.5 h-3.5 inline mr-2 text-cyan-400" />}
                  {msg.content}
                </span>
                <div className="h-px flex-1 bg-border"></div>
              </div>
            );
          }
          
          const isLastAssistantMsg = msg.role === 'assistant' && !msg.isError && (index === messages.length - 1 || (index === messages.length - 2 && messages[messages.length - 1].isLoading)) && messages.some(m => m.role === 'user');

          return (
            <div key={msg.clientId} className={`flex flex-col w-full animate-fade-in group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex w-full max-w-[90%] min-w-0 items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm self-start ${msg.role === 'assistant' ? 'bg-gradient-to-br from-[#2d2d2d] to-[#1e1e1e] border-[#3e3e3e]' : 'bg-accent/90 border-accent/50'}`}>
                    {msg.role === 'assistant' ? <Bot className="w-5 h-5 text-accent" /> : <UserIcon className="w-5 h-5 text-white" />}
                  </div>

                  <div className={`relative min-w-0 rounded-2xl p-4 text-sm leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-accent text-white rounded-tr-sm' : 'bg-[#252526] border border-border text-gray-300 rounded-tl-sm'}`}>
                    
                     {msg.id && !isLoading && (
                        <div ref={openMessageMenu === msg.clientId ? messageMenuRef : null} className={`absolute bottom-0 z-10 ${msg.role === 'user' ? 'left-[-40px]' : 'right-[-40px]'}`}>
                          <button onClick={() => setOpenMessageMenu(openMessageMenu === msg.clientId ? null : msg.clientId)} className="p-1.5 rounded-full text-gray-500 hover:text-white hover:bg-active transition-colors opacity-0 group-hover:opacity-100" title="More options" >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMessageMenu === msg.clientId && (
                            <div className={`absolute z-20 w-48 bg-[#2d2d30] border border-border rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 bottom-full mb-1 ${msg.role === 'user' ? 'right-0' : 'left-0'}`}>
                              {isLastAssistantMsg && (
                                <>
                                  <button onClick={() => { handleRegenerate(); setOpenMessageMenu(null); }} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-active hover:text-white transition-colors"> <RefreshCw className="w-3.5 h-3.5"/> Regenerate </button>
                                  <button onClick={() => { onOpenCheckpoints(); setOpenMessageMenu(null); }} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-active hover:text-white transition-colors"> <History className="w-3.5 h-3.5"/> Create Checkpoint </button>
                                  <div className="my-1 h-px bg-border mx-1"></div>
                                </>
                              )}
                              <button onClick={() => { if (msg.id) onDeleteMessage(msg.id); setOpenMessageMenu(null); }} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-red-400 hover:bg-red-500/20 transition-colors" > <Trash2 className="w-3.5 h-3.5" /> Delete </button>
                            </div>
                          )}
                        </div>
                      )}


                    {msg.isError ? (
                       <div className="flex items-start gap-3 text-red-400">
                         <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                         <div>
                           <p className="font-semibold text-red-300">AI Assistant Error</p>
                           <p className="text-sm">{msg.content}</p>
                         </div>
                       </div>
                    ) : (
                      <div className="markdown-content">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mb-2 grid grid-cols-3 gap-2">
                            {msg.attachments.map((att, index) => (
                              <div key={index} className="rounded-lg overflow-hidden bg-blue-400/50">
                                {att.type.startsWith('image/') ? (
                                  <img src={att.dataUrl} alt={att.name} className="w-full h-20 object-cover" />
                                ) : (
                                  <div className="w-full h-20 flex flex-col items-center justify-center p-1 text-center text-white">
                                    <FileText className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] leading-tight break-all">{att.name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {!msg.isApplyingChanges && msg.content && (
                          <ReactMarkdown components={{
                              code: (props) => {
                                  const { inline, children } = props;
                                  if (inline) {
                                      return <code className="bg-background px-1 py-0.5 rounded-sm text-sm">{children}</code>
                                  }
                                  
                                  const codeString = String(children);
                                  const firstLine = codeString.split('\n')[0] || '';
                                  const isFileBlock = /(?:<!--|\/\/|\/\*)\s*(\/[a-zA-Z0-9_\-\.\/]+)/.test(firstLine);
                                  
                                  if (isFileBlock && msg.completedFiles && msg.completedFiles.length > 0) {
                                      return null;
                                  }
                                  
                                  return <CodeBlock {...props}>{children}</CodeBlock>;
                              },
                              blockquote({children}) { return <div className="border-l-4 border-green-500 pl-3 py-1 my-2 bg-green-500/10 rounded-r text-green-200 font-mono text-xs">{children}</div>; },
                              a({node, children, ...props}) { return <a className="text-accent hover:underline cursor-pointer" {...props}>{children}</a> }
                          }}>
                            {msg.content}
                          </ReactMarkdown>
                        )}

                        {msg.isLoading && (
                          msg.isApplyingChanges ? (
                            <div className="mt-2 text-gray-400 bg-black/20 px-3 py-2 rounded-md font-mono text-xs flex items-center gap-2 border border-border">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 animate-pulse" /> Applying changes...
                            </div>
                          ) : msg.liveStream ? (
                            <LiveCodeRenderer stream={msg.liveStream} />
                          ) : (
                            <div className="mt-2 text-gray-400 bg-black/20 px-3 py-2 rounded-md font-mono text-xs flex items-center gap-2 border border-border animate-pulse">
                              <Cpu className="w-3.5 h-3.5" /> Thinking...
                            </div>
                          )
                        )}
                        
                        {msg.completedFiles && msg.completedFiles.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.completedFiles.map(file => (
                              <div key={file} className="text-xs text-green-300 bg-green-900/40 px-2 py-1.5 rounded-md font-mono flex items-center gap-2 border border-green-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Generated: {file}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                              <LinkIcon className="w-3.5 h-3.5" />
                              Sources
                            </h4>
                            <div className="space-y-1.5">
                              {msg.sources.map((source, i) => (
                                <a 
                                  key={i} 
                                  href={source.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block text-xs text-accent/80 hover:text-accent hover:underline truncate"
                                >
                                  {source.title || source.uri}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {msg.role === 'assistant' && index === messages.length - 1 && isLoading && (
                  <div className="mt-2 ml-10 flex items-center gap-2">
                    <button 
                        onClick={onCancel}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-error/80 hover:bg-error text-white rounded-lg border border-red-500/50 transition-all"
                    >
                        <Square className="w-3 h-3" />
                        Stop Generating
                    </button>
                  </div>
                )}
            </div>
          )
        })}
        <div className="h-4"></div>
      </div>

      {showScrollButton && (
        <button onClick={scrollToBottom} className="absolute bottom-40 right-6 z-10 p-2.5 bg-sidebar border border-border rounded-full shadow-xl text-accent hover:bg-accent hover:text-white transition-all animate-fade-in group">
          <ArrowDown className="w-5 h-5 group-hover:animate-bounce" />
        </button>
      )}

      <div className="bg-sidebar shrink-0 p-2 border-t border-border shadow-2xl relative">
        {isIdeasOverlayOpen && (
          <div ref={ideasOverlayRef} className="absolute bottom-full left-0 right-0 p-2 bg-gradient-to-t from-sidebar to-sidebar/80 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                <Lightbulb className="w-3 h-3 text-yellow-500" />
                <span>AI Suggestions</span>
              </div>
              <button onClick={fetchAiSuggestions} disabled={isSuggestionsLoading} className="text-gray-500 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50" title="Get new ideas"><RefreshCw className={`w-3 h-3 ${isSuggestionsLoading ? 'animate-spin' : ''}`} /></button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade">
              {isSuggestionsLoading ? (
                <>
                  <div className="h-8 w-44 bg-[#2d2d2d] rounded-lg animate-pulse"></div>
                  <div className="h-8 w-52 bg-[#2d2d2d] rounded-lg animate-pulse"></div>
                  <div className="h-8 w-36 bg-[#2d2d2d] rounded-lg animate-pulse"></div>
                </>
              ) : (
                suggestions.map((suggestion, idx) => (
                  <button key={idx} onClick={() => handleSend(suggestion)} className="whitespace-nowrap px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#2d2d2d] hover:border-accent/50 border border-[#333] rounded-lg text-xs text-gray-300 transition-all flex-shrink-0 flex items-center gap-1.5 group">
                    <span>{suggestion}</span><ChevronRight className="w-3 h-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="relative flex items-start gap-2 p-1 bg-[#1e1e1e] border border-border rounded-xl focus-within:border-accent transition-colors duration-200">
          <div className="flex items-center gap-0.5 pt-1">
            <button ref={ideasButtonRef} onClick={() => setIsIdeasOverlayOpen(p => !p)} className={`p-2 rounded-lg transition-colors ${isIdeasOverlayOpen ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} title="Show Ideas"><Lightbulb className="w-4 h-4" /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Attach files"><Paperclip className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 flex flex-col">
              {attachments.length > 0 && (
                <div className="px-2 pt-2">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {attachments.map((file, index) => (
                      <div key={index} className="relative group shrink-0 w-16 h-16 bg-[#2d2d2d] rounded-md overflow-hidden border border-transparent">
                        {file.type.startsWith('image/') ? (
                          <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center text-gray-400">
                            <FileText className="w-5 h-5 mb-1" /><span className="text-[10px] leading-tight break-all">{file.name}</span>
                          </div>
                        )}
                        <button onClick={() => handleRemoveAttachment(index)} className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <textarea 
                ref={inputRef} 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={handleKeyDown} 
                placeholder="Ask AI to build, fix, or explain..." 
                className="w-full bg-transparent border-none text-white text-sm px-2 py-3 outline-none resize-none max-h-[150px] min-h-[24px] custom-scrollbar placeholder:text-gray-600" 
                rows={1} 
              />
          </div>
          
          <div className="flex items-end self-stretch gap-2 pb-1 pr-1">
              <div className="relative" ref={modelDropdownRef}>
                  {isModelDropdownOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#2d2d30] border border-border rounded-lg shadow-2xl z-20 py-1 animate-in fade-in zoom-in-95">
                          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-500">Select Model</div>
                          <div className="my-1 h-px bg-border mx-1"></div>
                          {MODEL_CYCLE.map((modelKey) => {
                              const config = MODEL_CONFIG[modelKey];
                              const ModelOptionIcon = config.icon;
                              const isSelected = selectedModel === modelKey;
                              return (
                                  <button
                                      key={modelKey}
                                      onClick={() => {
                                          setSelectedModel(modelKey);
                                          setIsModelDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 flex items-start gap-3 transition-colors ${isSelected ? 'bg-accent/20' : 'hover:bg-active'}`}
                                  >
                                    <div className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
                                      {isSelected && <CheckCircle2 className="w-4 h-4 text-accent" />}
                                    </div>
                                      <div>
                                          <div className="flex items-center gap-1.5">
                                              <ModelOptionIcon className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-gray-300'}`} />
                                              <span className="font-medium text-sm text-white">{config.name}</span>
                                          </div>
                                          <p className="text-xs text-gray-400 mt-1">{config.description}</p>
                                      </div>
                                  </button>
                              );
                          })}
                      </div>
                  )}
                  <button 
                      onClick={() => setIsModelDropdownOpen(p => !p)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#2d2d2d] hover:bg-[#3a3d41] transition-colors"
                      title={`Model: ${MODEL_CONFIG[selectedModel].name} - ${MODEL_CONFIG[selectedModel].description}`}
                  >
                      <ModelIcon className="w-4 h-4 text-white" />
                  </button>
              </div>

             <button onClick={() => handleSend()} disabled={isLoading || (!input.trim() && attachments.length === 0)} className={`w-9 h-9 rounded-lg transition-all duration-200 flex items-center justify-center shrink-0 ${(input.trim() || attachments.length > 0) && !isLoading ? 'bg-accent text-white shadow-lg shadow-accent/20 hover:bg-blue-600 hover:scale-105' : 'bg-[#2d2d2d] text-gray-500 cursor-not-allowed'}`} title="Send Message">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};