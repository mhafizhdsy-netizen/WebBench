import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { File, ChatMessage } from '../../types';
import { Button } from '../ui/Button';
import { Send, Sparkles, X, Bot, User as UserIcon, ArrowDown, Loader2, Lightbulb, RefreshCw, ChevronRight, Paperclip, FileText, Cpu, CheckCircle2, BookmarkPlus, History, ChevronDown } from 'lucide-react';

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

// --- Contextual Suggestion Logic ---
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const getSuggestions = (activeFile: string | null, files: Record<string, File>): string[] => {
    const contextual = new Set<string>();
    const file = activeFile ? files[activeFile] : null;

    const genericPool = [
        "Make the entire site responsive",
        "Add a dark mode toggle",
        "Animate the hero section on scroll",
        "Create a sticky navigation bar",
        "Add a cookie consent banner",
        "Implement a theme switcher",
        "Build a pricing table component",
        "Add a 'back to top' button",
    ];

    if (file) {
        contextual.add("Refactor this file for clarity and performance");
        contextual.add(`Add detailed comments to ${file.name}`);

        switch (file.type) {
            case 'html':
                contextual.add("Improve this page's SEO with better meta tags");
                if (!file.content.includes('<main>')) contextual.add("Add semantic HTML5 tags like <main>, <section>");
                if (!file.content.includes('aria-')) contextual.add("Improve accessibility with ARIA attributes");
                if (!file.content.includes('<form')) contextual.add("Add a contact form to this page");
                break;
            case 'css':
                contextual.add("Organize CSS with comments and sections");
                if (!file.content.includes('keyframes')) contextual.add("Add a subtle animation for interactive elements");
                if (!file.content.includes('@media')) contextual.add("Add media queries for tablet and mobile screens");
                if (!file.content.includes(':root')) contextual.add("Centralize colors and fonts in :root variables");
                break;
            case 'javascript':
                contextual.add("Add JSDoc comments to functions in this file");
                if (file.content.match(/\.then\s*\(/)) contextual.add("Refactor Promise chains to use async/await");
                if (file.content.match(/document\.getElementById/)) contextual.add("Refactor DOM selections to use querySelector");
                break;
        }
    }
    
    const combined = [...new Set([...contextual, ...genericPool])];
    return shuffleArray(combined).slice(0, 3);
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

// FIX: Define AIChatProps interface
interface AIChatProps {
  files: Record<string, File>;
  activeFile: string | null;
  messages: ChatMessage[];
  onSendMessage: (prompt: string, attachments: Attachment[], isDeepThink: boolean) => Promise<void>;
  onRegenerate: () => Promise<void>;
  onClose: () => void;
  hasCheckpoint: boolean;
  onCreateCheckpoint: () => void;
  onRestoreCheckpoint: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ files, activeFile, messages, onSendMessage, onRegenerate, onClose, hasCheckpoint, onCreateCheckpoint, onRestoreCheckpoint }) => {
  const [input, setInput] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isDeepThink, setIsDeepThink] = useState(false);
  const [isIdeasOpen, setIsIdeasOpen] = useState(true);
  const [isCheckpointOpen, setIsCheckpointOpen] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAutoScrollEnabled = useRef(true);

  const isLoading = messages.length > 0 && messages[messages.length - 1].isLoading === true;

  const regenerateSuggestions = useCallback(() => {
    setSuggestions(getSuggestions(activeFile, files));
  }, [activeFile, files]);

  useEffect(() => {
    regenerateSuggestions();
  }, [regenerateSuggestions]);

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
  }, [messages, messages[messages.length - 1]?.liveStream?.currentCode]);

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
    if (!prompt.trim() && attachments.length === 0 || isLoading) return;

    const attachmentsToKeep = [...attachments];
    setInput('');
    setAttachments([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    await onSendMessage(prompt, attachmentsToKeep, isDeepThink);
  };
  
  const handleRegenerate = async () => {
    if (isLoading) return;
    await onRegenerate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-l border-border relative shadow-2xl">
      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={ALLOWED_MIME_TYPES.join(',')} />
      
      <div className="h-10 px-4 flex items-center justify-between border-b border-border shrink-0 bg-[#252526]/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-xs font-bold text-gray-200 tracking-wide">AI Assistant</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#1a1a1a]">
        {messages.map((msg, index) => {
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="flex justify-center items-center my-3 animate-fade-in gap-4">
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

          return (
            <div key={msg.id} className={`flex flex-col animate-fade-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex gap-3 w-full max-w-[90%] min-w-0 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${msg.role === 'assistant' ? 'bg-gradient-to-br from-[#2d2d2d] to-[#1e1e1e] border-[#3e3e3e]' : 'bg-accent/90 border-accent/50'}`}>
                  {msg.role === 'assistant' ? <Bot className="w-5 h-5 text-accent" /> : <UserIcon className="w-5 h-5 text-white" />}
                </div>
                
                <div className={`min-w-0 rounded-2xl p-4 text-sm leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-accent text-white rounded-tr-sm' : 'bg-[#252526] border border-border text-gray-300 rounded-tl-sm'}`}>
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

                  </div>
                </div>
              </div>
              
              {msg.role === 'assistant' && !msg.isLoading && (
                <div className="mt-2 ml-11 flex items-center gap-2">
                  {index === messages.length - 1 && messages.some(m => m.role === 'user') && (
                      <button 
                          onClick={handleRegenerate}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#2d2d2d] hover:bg-[#3a3d41] text-gray-400 hover:text-white rounded-lg border border-border transition-all"
                      >
                          <RefreshCw className="w-3 h-3" />
                          Regenerate
                      </button>
                  )}
                  {msg.content.includes('Changes Applied Successfully!') && (
                    <button 
                        onClick={onCreateCheckpoint}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#2d2d2d] hover:bg-[#3a3d41] text-gray-400 hover:text-white rounded-lg border border-border transition-all"
                    >
                        <BookmarkPlus className="w-3 h-3" />
                        Create Checkpoint
                    </button>
                  )}
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

      <div className="bg-sidebar shrink-0 p-4 border-t border-border shadow-2xl">
        <div className="max-h-48 overflow-y-auto custom-scrollbar mb-3 space-y-3">
            {!isLoading && (
              <div className="animate-fade-in">
                 <div className="flex items-center justify-between mb-2">
                    <button onClick={() => setIsIdeasOpen(!isIdeasOpen)} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors">
                       <Lightbulb className="w-3 h-3 text-yellow-500" />
                       <span>Ideas</span>
                       <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${isIdeasOpen ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                    <button onClick={regenerateSuggestions} className="text-gray-500 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors" title="Get new ideas"><RefreshCw className="w-3 h-3" /></button>
                 </div>
                 {isIdeasOpen && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade animate-fade-in">
                        {suggestions.map((suggestion, idx) => (
                        <button key={idx} onClick={() => handleSend(suggestion)} className="whitespace-nowrap px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#2d2d2d] hover:border-accent/50 border border-[#333] rounded-lg text-xs text-gray-300 transition-all flex-shrink-0 flex items-center gap-1.5 group">
                            <span>{suggestion}</span><ChevronRight className="w-3 h-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        ))}
                    </div>
                 )}
              </div>
            )}

            {hasCheckpoint && (
                <div className="animate-fade-in border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                        <button onClick={() => setIsCheckpointOpen(!isCheckpointOpen)} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors flex-1 text-left">
                            <History className="w-3 h-3 text-cyan-400" />
                            <span>Checkpoint</span>
                            <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${isCheckpointOpen ? 'rotate-0' : '-rotate-90'}`} />
                        </button>
                        <Button variant="secondary" size="sm" onClick={onRestoreCheckpoint} className="h-7">
                            Restore Project
                        </Button>
                    </div>
                    {isCheckpointOpen && (
                        <p className="text-xs text-gray-500 mt-1 pl-1 animate-fade-in">Revert all files to the state of your last checkpoint.</p>
                    )}
                </div>
            )}
            
            <div className="animate-fade-in border-t border-border pt-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider" title="Use a more powerful model for complex tasks. May be slower.">
                        <Cpu className="w-3 h-3 text-purple-400" /><span>Deep Think</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={isDeepThink}
                            onChange={(e) => setIsDeepThink(e.target.checked)}
                            className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                </div>
                 {isDeepThink && (
                    <p className="text-xs text-gray-500 mt-1 pl-1">Uses Gemini 3 Pro for higher quality on complex tasks. Responses may be slower.</p>
                )}
            </div>
        </div>
        
        <div className="relative group bg-[#1e1e1e] border border-[#333] focus-within:border-accent rounded-xl shadow-inner transition-all duration-200">
          {attachments.length > 0 && (
            <div className="p-2 border-b border-[#333]">
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
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask AI to build, fix, or explain..." className="w-full bg-transparent border-none text-white text-sm px-4 py-3 pl-12 outline-none resize-none max-h-[150px] min-h-[50px] custom-scrollbar placeholder:text-gray-600" rows={1} />
          
          <div className="absolute left-3 bottom-3.5 flex items-center gap-1">
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Attach files"><Paperclip className="w-4 h-4" /></button>
          </div>
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
             <span className="hidden group-focus-within:inline-block text-[10px] text-gray-600 mr-2 animate-fade-in pointer-events-none">Shift+Enter for newline</span>
             <button onClick={() => handleSend()} disabled={isLoading || (!input.trim() && attachments.length === 0)} className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${(input.trim() || attachments.length > 0) && !isLoading ? 'bg-accent text-white shadow-lg shadow-accent/20 hover:bg-blue-600 hover:scale-105' : 'bg-[#2d2d2d] text-gray-500 cursor-not-allowed'}`} title="Send Message">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
