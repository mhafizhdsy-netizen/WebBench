
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { File, ChatMessage, ChatSession, FileAction, LogEntry } from '../../types';
import { Button } from '../ui/Button';
import { generateSuggestions } from '../../services/geminiService';
import { Send, Sparkles, X, Bot, User as UserIcon, ArrowDown, Loader2, Lightbulb, RefreshCw, ChevronRight, Paperclip, FileText, Cpu, CheckCircle2, LinkIcon, History, Plus, ChevronDown, Square, Trash2, MoreVertical, AlertTriangle, Edit, XCircle, Search, ClipboardList, Zap, Microscope, Wrench } from 'lucide-react';

declare global {
  interface Window {
    Prism: any;
  }
}

// Custom CodeBlock component for stable Prism highlighting in final markdown
const CodeBlock = React.memo(({ className, children, msg }: any) => {
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

  // Check if this file path is in the message's completedFiles
  const isFileApplied = path && msg?.completedFiles?.some((f: FileAction) => f.path === path);

  return (
    <div className="my-2 border border-border bg-background rounded-lg overflow-auto no-scrollbar">
       {path && (
          <div className="px-3 py-1.5 bg-active border-b border-border text-[9px] md:text-[10px] text-gray-400 font-mono flex items-center justify-between">
              <span>{path}</span>
              {isFileApplied && <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Applied</span>}
          </div>
       )}
       <pre className="!bg-transparent !my-0 !p-3 !text-xs md:!text-sm">
        <code ref={codeRef} className={`${className} font-mono`} style={{textShadow: 'none'}}>
          {children}
        </code>
      </pre>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.className === nextProps.className &&
         prevProps.children === nextProps.children &&
         prevProps.msg?.completedFiles === nextProps.msg?.completedFiles;
});

// Live Renderer for streaming code with fixed size and fade effects
const LiveCodeRenderer = ({ stream }: { stream: ChatMessage['liveStream'] }) => {
  const codeRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (codeRef.current && window.Prism) {
      window.Prism.highlightElement(codeRef.current, false);
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [stream?.currentCode]);

  if (!stream) {
    return null;
  }

  return (
    <div className="mt-2 border border-border bg-background rounded-lg overflow-hidden animate-fade-in flex flex-col h-80">
      <div className="px-3 py-1.5 bg-active border-b border-border text-[9px] md:text-[10px] text-gray-400 font-mono flex items-center gap-2 shrink-0">
        <Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" />
        <span>Generating: {stream.currentFile}</span>
      </div>
      <div className="relative flex-1 min-h-0">
        <div ref={scrollContainerRef} className="h-full overflow-auto no-scrollbar">
          <pre className="!bg-transparent !my-0 !p-3 !font-mono">
            <code ref={codeRef} className={`language-${stream.language} !text-xs md:!text-sm`} style={{ textShadow: 'none' }}>
              {stream.currentCode || ' '}
            </code>
          </pre>
        </div>
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
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

// Process Indicator Component
const ProcessIndicator = ({ content }: { content: string }) => {
  const lowerContent = content.toLowerCase();
  
  // Explicit Phase Detection based on new System Instructions
  let step = 1;
  if (lowerContent.includes('phase 2') || lowerContent.includes('research')) step = 2;
  if (lowerContent.includes('phase 3') || lowerContent.includes('analy')) step = 3;
  if (lowerContent.includes('phase 4') || lowerContent.includes('execut') || lowerContent.includes('```')) step = 4;

  const steps = [
    { label: 'Plan', icon: ClipboardList, active: step >= 1 },
    { label: 'Research', icon: Search, active: step >= 2 },
    { label: 'Analyze', icon: Microscope, active: step >= 3 },
    { label: 'Execute', icon: Zap, active: step >= 4 },
  ];

  return (
    <div className="flex items-center gap-2 mb-3 px-1 overflow-x-auto no-scrollbar">
      {steps.map((s, i) => (
        <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider transition-all duration-300 ${s.active ? 'bg-accent/20 border-accent/50 text-accent' : 'bg-[#2d2d2d] border-[#3e3e3e] text-gray-500 opacity-50'}`}>
          <s.icon className="w-3 h-3" />
          <span>{s.label}</span>
          {s.active && step === i + 1 && <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-accent ml-1"></span>}
        </div>
      ))}
    </div>
  );
};


interface ChatMessageItemProps {
  message: ChatMessage;
  onContextMenu: (e: React.MouseEvent, message: ChatMessage) => void;
  onCancel: () => void;
}

const ChatMessageItem = React.memo<ChatMessageItemProps>(({ message: msg, onContextMenu, onCancel }) => {
  if (msg.role === 'system') {
    return (
      <div className="flex justify-center items-center my-2 md:my-3 animate-fade-in gap-3 md:gap-4">
        <div className="h-px flex-1 bg-border"></div>
        <span className="text-xs text-gray-400 bg-active px-2.5 py-1.5 rounded-full whitespace-nowrap flex items-center">
          {msg.content.includes('✅') && <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 inline mr-1.5 md:mr-2 text-green-400" />}
          {msg.content.includes('⏪') && <History className="w-3 h-3 md:w-3.5 md:h-3.5 inline mr-1.5 md:mr-2 text-cyan-400" />}
          {msg.content}
        </span>
        <div className="h-px flex-1 bg-border"></div>
      </div>
    );
  }
  
  const renderFileActionBadge = (action: FileAction) => {
    const { path, action: type } = action;

    if (type === 'create') {
      return (
        <div key={path} className="text-xs text-green-300 bg-green-900/40 px-2 py-1.5 rounded-md font-mono flex items-center gap-2 border border-green-500/20">
          <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-400" /> Created: {path}
        </div>
      );
    }
    if (type === 'update') {
      return (
        <div key={path} className="text-xs text-sky-300 bg-sky-900/40 px-2 py-1.5 rounded-md font-mono flex items-center gap-2 border border-sky-500/20">
          <Edit className="w-3 h-3 md:w-3.5 md:h-3.5 text-sky-400" /> Modified: {path}
        </div>
      );
    }
    if (type === 'delete') {
      return (
        <div key={path} className="text-xs text-red-300 bg-red-900/40 px-2 py-1.5 rounded-md font-mono flex items-center gap-2 border border-red-500/20">
          <XCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-red-400" /> Deleted: {path}
        </div>
      );
    }
    return null;
  };

  return (
    <div onContextMenu={(e) => onContextMenu(e, msg)} className={`flex flex-col w-full animate-fade-in group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={`flex w-full max-w-[95%] md:max-w-[90%] min-w-0 items-end gap-1.5 md:gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm self-start ${msg.role === 'assistant' ? 'bg-gradient-to-br from-[#2d2d2d] to-[#1e1e1e] border-[#3e3e3e]' : 'bg-accent/90 border-accent/50'}`}>
          {msg.role === 'assistant' ? <Bot className="w-3 h-3 md:w-5 md:h-5 text-accent" /> : <UserIcon className="w-3 h-3 md:w-5 md:h-5 text-white" />}
        </div>
        <div className={`relative min-w-0 rounded-2xl p-2.5 md:p-4 text-sm leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-accent text-white rounded-tr-sm' : 'bg-[#252526] border border-border text-gray-300 rounded-tl-sm'}`}>
          {msg.isError ? (
            <div className="flex items-start gap-2 md:gap-3 text-red-400">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300 text-sm">AI Assistant Error</p>
                <p className="text-xs md:text-sm">{msg.content}</p>
              </div>
            </div>
          ) : (
            <div className="markdown-content">
              {msg.role === 'assistant' && msg.isLoading && <ProcessIndicator content={msg.content || ''} />}
              
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-2 grid grid-cols-3 gap-2">
                  {msg.attachments.map((att, index) => (
                    <div key={index} className="rounded-lg overflow-hidden bg-blue-400/50">
                      {att.type.startsWith('image/') ? (
                        <img src={att.dataUrl} alt={att.name} className="w-full h-16 md:h-20 object-cover" />
                      ) : (
                        <div className="w-full h-16 md:h-20 flex flex-col items-center justify-center p-1 text-center text-white">
                          <FileText className="w-5 h-5 md:w-6 md:h-6 mb-1" />
                          <span className="text-[9px] md:text-[10px] leading-tight break-all">{att.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {msg.content && (
                <ReactMarkdown components={{
                    code: (props) => {
                        const { inline, children } = props;
                        if (inline) {
                            return <code className="bg-background px-1 py-0.5 rounded-sm text-xs">{children}</code>
                        }
                        return <CodeBlock {...props} msg={msg}>{children}</CodeBlock>;
                    },
                    blockquote({children}) { return <div className="border-l-4 border-green-500 pl-3 py-1 my-2 bg-green-500/10 rounded-r text-green-200 font-mono text-xs">{children}</div>; },
                    a({node, children, ...props}) { return <a className="text-accent hover:underline cursor-pointer" {...props}>{children}</a> }
                }}>
                  {msg.content}
                </ReactMarkdown>
              )}
              {msg.isLoading && (
                  <>
                      {msg.analysisText ? (
                          <div className="mt-2 text-gray-400 bg-black/20 px-2 py-1.5 rounded-md font-mono text-xs flex items-center gap-2 border border-border">
                              <Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" />
                              <span>{msg.analysisText}</span>
                          </div>
                      ) : msg.liveStream ? (
                          <>
                              <LiveCodeRenderer stream={msg.liveStream} />
                              {msg.streamingCompletedFiles && msg.streamingCompletedFiles.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                      {msg.streamingCompletedFiles.map(renderFileActionBadge)}
                                  </div>
                              )}
                          </>
                      ) : msg.isApplyingChanges ? (
                           <div className="mt-2 text-gray-400 bg-black/20 px-2 py-1.5 rounded-md font-mono text-xs flex items-center gap-2 border border-border">
                              <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-400 animate-pulse" /> Applying changes...
                          </div>
                      ) : (
                          <div className="mt-2 text-gray-400 bg-black/20 px-2 py-1.5 rounded-md font-mono text-xs flex items-center gap-2 border border-border animate-pulse">
                              <Cpu className="w-3 h-3 md:w-3.5 md:h-3.5" /> Thinking...
                          </div>
                      )}
                  </>
              )}
              {!msg.isLoading && msg.completedFiles && msg.completedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                      {msg.completedFiles.map(renderFileActionBadge)}
                  </div>
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5 md:gap-2">
                    <LinkIcon className="w-3 h-3 md:w-3.5 md:h-3.5" />
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
      {msg.role === 'assistant' && msg.isLoading && (
        <div className="mt-2 ml-9 md:ml-10 flex items-center gap-2">
          <button 
              onClick={onCancel}
              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-error/80 hover:bg-error text-white rounded-lg border border-red-500/50 transition-all"
          >
              <Square className="w-2.5 h-2.5 md:w-3 md:h-3" />
              Stop Generating
          </button>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
    const prev = prevProps.message;
    const next = nextProps.message;
    return (
        prev.clientId === next.clientId &&
        prev.content === next.content &&
        prev.isLoading === next.isLoading &&
        prev.isError === next.isError &&
        prev.analysisText === next.analysisText &&
        prev.isApplyingChanges === next.isApplyingChanges &&
        prev.liveStream?.currentCode === next.liveStream?.currentCode &&
        prev.liveStream?.currentFile === next.liveStream?.currentFile &&
        JSON.stringify(prev.streamingCompletedFiles) === JSON.stringify(next.streamingCompletedFiles) &&
        JSON.stringify(prev.completedFiles) === JSON.stringify(next.completedFiles)
    );
});


interface AIChatProps {
  files: Record<string, File>;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSendMessage: (prompt: string, attachments: Attachment[], model: string, sessionId: string) => Promise<void>;
  onRegenerate: (sessionId: string) => Promise<void>;
  onClose: () => void;
  onOpenCheckpoints: () => void;
  onCreateCheckpoint: () => void;
  onCreateSession: () => void;
  onSwitchSession: (sessionId: string) => void;
  onCancel: () => void;
  onDeleteMessage: (messageId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onDragStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
  onResizeStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, handle: string) => void;
  errorLogs?: LogEntry[];
}

export const AIChat: React.FC<AIChatProps> = ({ 
  files, sessions, activeSessionId, onSendMessage, onRegenerate, onClose, 
  onOpenCheckpoints, onCreateCheckpoint, onCreateSession, onSwitchSession, onCancel,
  onDeleteMessage, onDeleteSession, onDragStart, onResizeStart, errorLogs = []
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
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: ChatMessage } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ideasButtonRef = useRef<HTMLButtonElement>(null);
  const ideasOverlayRef = useRef<HTMLDivElement>(null);
  const sessionDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const isLoading = messages.length > 0 && messages[messages.length - 1].isLoading === true;

  const resizeHandles: { name: string, className: string }[] = [
    { name: 'top-left', className: 'top-0 left-0 cursor-nwse-resize w-4 h-4' },
    { name: 'top-right', className: 'top-0 right-0 cursor-nesw-resize w-4 h-4' },
    { name: 'bottom-left', className: 'bottom-0 left-0 cursor-nesw-resize w-4 h-4' },
    { name: 'bottom-right', className: 'bottom-0 right-0 cursor-nwse-resize w-4 h-4' },
    { name: 'top', className: 'top-0 left-0 w-full h-2 cursor-ns-resize' },
    { name: 'bottom', className: 'bottom-0 left-0 w-full h-2 cursor-ns-resize' },
    { name: 'left', className: 'top-0 left-0 h-full w-2 cursor-ew-resize' },
    { name: 'right', className: 'top-0 right-0 h-full w-2 cursor-ew-resize' }
  ];

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
      if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isIdeasOverlayOpen, isSessionDropdownOpen, isModelDropdownOpen, contextMenu]);

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
    setTimeout(() => {
      scrollToBottom();
    }, 50);
  }, [activeSessionId]);


  useEffect(() => {
    if (isAutoScrollEnabled.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, messages[messages.length - 1]?.liveStream?.currentCode, messages[messages.length - 1]?.streamingCompletedFiles]);

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

  const handleAutoFix = () => {
    if (!errorLogs || errorLogs.length === 0) return;
    
    const errorsText = errorLogs.map(err => {
        const msg = err.message.map(m => typeof m === 'object' ? JSON.stringify(m) : String(m)).join(' ');
        return `[${err.level.toUpperCase()}] ${msg}`;
    }).join('\n');

    const prompt = `I found the following errors in the browser console. Please analyze them and fix the code to resolve these issues:\n\n${errorsText}`;
    handleSend(prompt);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleContextMenu = (e: React.MouseEvent, message: ChatMessage) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, message });
  };

  const ModelIcon = MODEL_CONFIG[selectedModel].icon;

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    
    const { message } = contextMenu;
    const msgIndex = messages.findIndex(m => m.clientId === message.clientId);
    const isLastAssistantMsg = message.role === 'assistant' && !message.isError && 
      (msgIndex === messages.length - 1 || (msgIndex === messages.length - 2 && messages[messages.length - 1].isLoading)) && 
      messages.some(m => m.role === 'user');

    return (
      <div
        ref={contextMenuRef}
        style={{ top: contextMenu.y, left: contextMenu.x }}
        className="fixed z-[101] w-48 bg-[#2d2d30] border border-border rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95"
      >
        {isLastAssistantMsg && (
          <button onClick={() => { handleRegenerate(); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-1.5 md:gap-2 text-gray-300 hover:bg-active hover:text-white transition-colors">
            <RefreshCw className="w-3 h-3 md:w-3.5 md:h-3.5"/> Regenerate
          </button>
        )}
        {message.role === 'assistant' && !message.isLoading && !message.isError && message.id && (
          <button onClick={() => { onCreateCheckpoint(); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-1.5 md:gap-2 text-gray-300 hover:bg-active hover:text-white transition-colors">
            <History className="w-3 h-3 md:w-3.5 md:h-3.5"/> New Checkpoint
          </button>
        )}
        {(isLastAssistantMsg || (message.role === 'assistant' && !message.isLoading && !message.isError && message.id)) && (
          <div className="my-1 h-px bg-border mx-1"></div>
        )}
        {message.id && (
          <button onClick={() => { if (message.id) onDeleteMessage(message.id); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-1.5 md:gap-2 text-red-400 hover:bg-red-500/20 transition-colors">
            <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5"/> Delete
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-sidebar relative">
      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={ALLOWED_MIME_TYPES.join(',')} />
      {renderContextMenu()}
      
      {resizeHandles.map(handle => (
        <div
          key={handle.name}
          className={`absolute z-20 ${handle.className}`}
          onMouseDown={(e) => onResizeStart(e, handle.name)}
          onTouchStart={(e) => onResizeStart(e, handle.name)}
        />
      ))}
      
      <div 
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        className="h-9 md:h-10 px-3 md:px-4 flex items-center justify-between border-b border-border shrink-0 bg-[#252526]/80 backdrop-blur-sm z-10 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <div className="relative" ref={sessionDropdownRef}>
            <button onClick={() => setIsSessionDropdownOpen(p => !p)} className="flex items-center gap-1.5 p-1 md:p-1.5 rounded-md hover:bg-white/10 transition-colors">
              <span className="text-xs md:text-sm font-bold text-gray-200 tracking-wide">{activeSession?.name || 'Chat'}</span>
              <ChevronDown className={`w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400 transition-transform ${isSessionDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSessionDropdownOpen && (
              <div className="absolute top-full mt-1.5 w-56 md:w-60 bg-[#2d2d30] border border-border rounded-lg shadow-2xl py-1 z-20 animate-in fade-in zoom-in-95">
                {sessions.map(session => (
                  <div key={session.id} className={`w-full flex items-center justify-between px-3 text-xs group ${session.id === activeSessionId ? 'bg-active' : 'hover:bg-active'}`}>
                    <button onClick={() => { onSwitchSession(session.id); setIsSessionDropdownOpen(false); }} className={`flex-1 text-left py-1.5 md:py-2 transition-colors ${session.id === activeSessionId ? 'text-accent' : 'text-gray-300'}`}>
                      {session.name}
                    </button>
                    {sessions.length > 1 && (
                      <button onClick={() => onDeleteSession(session.id)} className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
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
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button onClick={onOpenCheckpoints} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="View Checkpoints">
            <History className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <div ref={scrollRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto no-scrollbar flex flex-col">
          <div className="flex-grow p-3 md:p-4 space-y-3 md:space-y-4 bg-[#1a1a1a]">
            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.clientId}
                message={msg}
                onContextMenu={handleContextMenu}
                onCancel={onCancel}
              />
            ))}
            <div className="h-4"></div>
          </div>
          <div className="bg-sidebar p-1 md:p-2 border-t border-border shadow-2xl relative shrink-0">
            {/* Auto Fix Button */}
            {errorLogs.length > 0 && (
                <div className="absolute bottom-full right-4 mb-2 animate-in slide-in-from-bottom-2 fade-in">
                    <Button onClick={handleAutoFix} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-2 shadow-lg backdrop-blur-md">
                        <Wrench className="w-4 h-4" />
                        Auto Fix ({errorLogs.length} Errors)
                    </Button>
                </div>
            )}
            
            {isIdeasOverlayOpen && (
              <div ref={ideasOverlayRef} className="absolute bottom-full left-0 right-0 p-1 md:p-2 bg-gradient-to-t from-sidebar to-sidebar/80 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    <Lightbulb className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-500" />
                    <span>AI Suggestions</span>
                  </div>
                  <button onClick={fetchAiSuggestions} disabled={isSuggestionsLoading} className="text-gray-500 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50" title="Get new ideas"><RefreshCw className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isSuggestionsLoading ? 'animate-spin' : ''}`} /></button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade">
                  {isSuggestionsLoading ? (
                    <>
                      <div className="h-7 w-40 bg-[#2d2d2d] rounded-lg animate-pulse"></div>
                      <div className="h-7 w-48 bg-[#2d2d2d] rounded-lg animate-pulse"></div>
                      <div className="h-7 w-32 bg-[#2d2d2d] rounded-lg animate-pulse"></div>
                    </>
                  ) : (
                    suggestions.map((suggestion, idx) => (
                      <button key={idx} onClick={() => handleSend(suggestion)} className="whitespace-nowrap px-2.5 py-1 text-xs bg-[#1e1e1e] hover:bg-[#2d2d2d] hover:border-accent/50 border border-[#333] rounded-lg text-gray-300 transition-all flex-shrink-0 flex items-center gap-1 group">
                        <span>{suggestion}</span><ChevronRight className="w-2.5 h-2.5 md:w-3 md:h-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="relative flex items-start gap-2 p-1 bg-[#1e1e1e] border border-border rounded-xl focus-within:border-accent transition-colors duration-200">
              <div className="flex items-center gap-0.5 pt-1">
                <button ref={ideasButtonRef} onClick={() => setIsIdeasOverlayOpen(p => !p)} className={`p-1.5 md:p-2 rounded-lg transition-colors ${isIdeasOverlayOpen ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} title="Show Ideas"><Lightbulb className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 md:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Attach files"><Paperclip className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
              </div>

              <div className="flex-1 flex flex-col">
                  {attachments.length > 0 && (
                    <div className="px-1 md:px-2 pt-1 md:pt-2">
                      <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {attachments.map((file, index) => (
                          <div key={index} className="relative group shrink-0 w-14 h-14 md:w-16 md:h-16 bg-[#2d2d2d] rounded-md overflow-hidden border border-transparent">
                            {file.type.startsWith('image/') ? (
                              <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center text-gray-400">
                                <FileText className="w-4 h-4 md:w-5 md:h-5 mb-1" /><span className="text-[9px] md:text-[10px] leading-tight break-all">{file.name}</span>
                              </div>
                            )}
                            <button onClick={() => handleRemoveAttachment(index)} className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5 md:w-3 md:h-3" /></button>
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
                    className="w-full bg-transparent border-none text-white text-sm px-1.5 py-2 md:px-2 md:py-3 outline-none resize-none max-h-[150px] min-h-[24px] no-scrollbar placeholder:text-gray-600" 
                    rows={1} 
                  />
              </div>
              
              <div className="flex items-end self-stretch gap-2 pb-1 pr-1">
                  <div className="relative" ref={modelDropdownRef}>
                      {isModelDropdownOpen && (
                          <div className="absolute bottom-full right-0 mb-2 w-60 md:w-64 bg-[#2d2d30] border border-border rounded-lg shadow-2xl z-20 py-1 animate-in fade-in zoom-in-95">
                              <div className="px-3 py-1.5 text-[9px] md:text-[10px] uppercase font-bold text-gray-500">Select Model</div>
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
                                          className={`w-full text-left px-3 py-2 flex items-start gap-2 md:gap-3 transition-colors ${isSelected ? 'bg-active/20' : 'hover:bg-active'}`}
                                      >
                                        <div className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 mt-0.5 flex items-center justify-center">
                                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />}
                                        </div>
                                          <div>
                                              <div className="flex items-center gap-1.5">
                                                  <ModelOptionIcon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isSelected ? 'text-accent' : 'text-gray-300'}`} />
                                                  <span className="font-medium text-xs md:text-sm text-white">{config.name}</span>
                                              </div>
                                              <p className="text-[9px] md:text-xs text-gray-400 mt-1">{config.description}</p>
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                      )}
                      <button 
                          onClick={() => setIsModelDropdownOpen(p => !p)}
                          className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg bg-[#2d2d2d] hover:bg-[#3a3d41] transition-colors"
                          title={`Model: ${MODEL_CONFIG[selectedModel].name} - ${MODEL_CONFIG[selectedModel].description}`}
                      >
                          <ModelIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                      </button>
                  </div>

                 <button onClick={() => handleSend()} disabled={isLoading || (!input.trim() && attachments.length === 0)} className={`w-8 h-8 md:w-9 md:h-9 rounded-lg transition-all duration-200 flex items-center justify-center shrink-0 ${(input.trim() || attachments.length > 0) && !isLoading ? 'bg-accent text-white shadow-lg shadow-accent/20 hover:bg-blue-600 hover:scale-105' : 'bg-[#2d2d2d] text-gray-500 cursor-not-allowed'}`} title="Send Message">
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                 </button>
              </div>
            </div>
          </div>
        </div>
        {showScrollButton && (
          <button onClick={scrollToBottom} className="absolute bottom-4 right-4 md:right-6 z-10 p-2.5 bg-sidebar border border-border rounded-full shadow-xl text-accent hover:bg-accent hover:text-white transition-all animate-fade-in group">
            <ArrowDown className="w-4 h-4 md:w-5 md:h-5 group-hover:animate-bounce" />
          </button>
        )}
      </div>
    </div>
  );
};
