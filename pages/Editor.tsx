import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project, File as ProjectFile, PanelType, ChatMessage } from '../types';
import { CodeEditor } from '../components/editor/CodeEditor';
import { Preview } from '../components/editor/Preview';
import { AIChat } from '../components/editor/AIChat';
import { Button } from '../components/ui/Button';
import { SettingsModal } from '../components/dashboard/SettingsModal';
import { FileExplorer } from '../components/editor/FileExplorer';
import { chatService } from '../services/chatService';
import { generateCodeStream } from '../services/geminiService';
import { SEO } from '../components/ui/SEO';
import { 
  Menu, Save, ArrowLeft, Layout, MessageSquare, Play, Download, 
  Loader2, Cloud, Settings, Files, Search, Sparkles, X, LayoutTemplate
} from 'lucide-react';
import JSZip from 'jszip';

type SidebarView = 'files' | 'ai' | 'search';

// Helper functions moved from AIChat
const sanitizeJson = (str: string) => {
  let result = '';
  let inString = false;
  let isEscaped = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && !isEscaped) {
      inString = !inString;
      result += char;
    } else if (inString) {
      if (char === '\\') {
         isEscaped = !isEscaped;
         result += char;
      } else {
         isEscaped = false;
         if (char === '\n') result += '\\n';
         else if (char === '\r') { }
         else if (char === '\t') result += '\\t';
         else result += char;
      }
    } else {
      result += char;
    }
  }
  return result;
};

const Editor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileTab, setMobileTab] = useState<PanelType>('editor');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [highlightedFiles, setHighlightedFiles] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [checkpoint, setCheckpoint] = useState<Record<string, ProjectFile> | null>(null);

  // Smarter resize handler to fix mobile keyboard issue
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      
      setIsMobile(prevIsMobile => {
        // If the mobile status hasn't changed, do nothing.
        // This is the key fix: it prevents the keyboard from closing the sidebar.
        if (prevIsMobile === newIsMobile) {
          return prevIsMobile;
        }

        // If we are transitioning between mobile and desktop, adjust sidebar visibility.
        // Moving to Desktop (!newIsMobile) -> open sidebar.
        // Moving to Mobile (newIsMobile) -> close sidebar.
        setIsSidebarOpen(!newIsMobile);
        
        return newIsMobile;
      });
    };

    // Set initial state correctly
    const initialIsMobile = window.innerWidth < 768;
    setIsMobile(initialIsMobile);
    setIsSidebarOpen(!initialIsMobile);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Project and Chat History Loading
  useEffect(() => {
    const loadProject = async () => {
      if (projectId) {
        try {
          const p = await projectService.getProject(projectId);
          if (p) {
            setProject(p);
            const initialFile = p.files['/index.html'] ? '/index.html' : Object.keys(p.files)[0];
            if (initialFile) {
              handleFileSelect(initialFile);
            }
            const chatHistory = chatService.getChatHistory(projectId);
            setChatMessages(chatHistory);
            
            // Load checkpoint
            const savedCheckpoint = localStorage.getItem(`webbench_checkpoint_${projectId}`);
            if (savedCheckpoint) setCheckpoint(JSON.parse(savedCheckpoint));

          } else { navigate('/dashboard'); }
        } catch (error) {
          console.error("Error loading project", error);
          navigate('/dashboard');
        } finally { setLoading(false); }
      }
    };
    loadProject();
  }, [projectId, navigate]);
  
  // Auto-save logic
  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => {
      forceSave(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [project, loading]);

  // Persist chat history
  useEffect(() => {
    if (projectId && !loading) {
      chatService.saveChatHistory(projectId, chatMessages);
    }
  }, [chatMessages, projectId, loading]);

  // Persist checkpoint
  useEffect(() => {
    if (projectId) {
      const key = `webbench_checkpoint_${projectId}`;
      if (checkpoint) {
        localStorage.setItem(key, JSON.stringify(checkpoint));
      } else {
        localStorage.removeItem(key);
      }
    }
  }, [checkpoint, projectId]);

  const toggleSidebar = (view: SidebarView) => {
    if (isSidebarOpen && sidebarView === view) {
      setIsSidebarOpen(false);
    } else {
      setSidebarView(view);
      setIsSidebarOpen(true);
    }
  };

  const handleFileChange = (value: string | undefined) => {
    if (project && activeFile && value !== undefined) {
      setProject(prevProject => {
        if (!prevProject) return null;
        const updatedFiles = { ...prevProject.files };
        updatedFiles[activeFile] = { ...updatedFiles[activeFile], content: value, lastModified: Date.now() };
        return { ...prevProject, files: updatedFiles };
      });
    }
  };

  const handleFileSelect = (path: string) => {
    if (project?.files[path]?.type === 'image') return;
    setActiveFile(path);
    if (!openFiles.includes(path)) {
      setOpenFiles(prev => [...prev, path]);
    }
    if (isMobile) {
      setMobileTab('editor');
    }
  };

  const handleCloseFile = (path: string) => {
    const newOpenFiles = openFiles.filter(f => f !== path);
    setOpenFiles(newOpenFiles);
    if (activeFile === path) {
      setActiveFile(newOpenFiles[newOpenFiles.length - 1] || null);
    }
  };

  const forceSave = async (withRefresh = true) => {
    if (project && projectId && !isSaving) {
      setIsSaving(true);
      await projectService.updateProject(projectId, { files: project.files });
      if (withRefresh) setRefreshTrigger(prev => prev + 1);
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const downloadProject = async () => {
    if (!project) return;
    const zip = new JSZip();
    Object.values(project.files).forEach((file: ProjectFile) => {
      const path = file.path.startsWith('/') ? file.path.substring(1) : file.path;
      if (file.name !== '.keep') zip.file(path, file.content);
    });
    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `[ ${project.name} ]_WebBench.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAIChanges = (filesToProcess: any[]): Promise<string[]> => {
    if (!project || !projectId) return Promise.resolve([]);
    let updatedFiles = { ...project.files };
    const changedPaths: string[] = [];
    let newOpenFiles = [...openFiles];
    
    filesToProcess.forEach((f: any) => {
      const path = f.path.startsWith('/') ? f.path : '/' + f.path;
      if (f.action === 'delete') {
        Object.keys(updatedFiles).forEach(key => {
          if (key === path || key.startsWith(path + '/')) {
            delete updatedFiles[key];
            if (activeFile === key) setActiveFile(null);
            newOpenFiles = newOpenFiles.filter(op => op !== key);
          }
        });
      } else {
        updatedFiles[path] = {
          path, name: path.split('/').pop()!,
          type: f.type || 'plaintext', content: f.content || '',
          lastModified: Date.now()
        };
        if (!newOpenFiles.includes(path) && newOpenFiles.length < 10) newOpenFiles.push(path);
        if (!activeFile) setActiveFile(path);
      }
      changedPaths.push(path);
    });
    
    setHighlightedFiles(new Set(changedPaths));
    setTimeout(() => setHighlightedFiles(new Set()), 4000);

    setProject({ ...project, files: updatedFiles });
    setOpenFiles(newOpenFiles);
    if (activeFile && !updatedFiles[activeFile]) {
      setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[0] : null);
    }
    setRefreshTrigger(p => p + 1);
    return Promise.resolve(changedPaths);
  };

 const streamAndApplyResponse = async (prompt: string, attachments: any[], aiMsgId: string, isDeepThink: boolean) => {
    if (!project) return;
    try {
      const modelName = isDeepThink ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
      const streamResponse = await generateCodeStream(
        prompt, 
        project.files, 
        activeFile, 
        attachments.map(a => ({ mimeType: a.mimeType, data: a.data })),
        modelName,
        isDeepThink
      );
      let fullText = '';
      const completedFileBlocksRegex = /```(\w+)\s*\n(?:<!--|\/\/|\/\*)\s*(\/[a-zA-Z0-9_\-\.\/]+)[\s\S]*?\n```/g;
      
      for await (const chunk of streamResponse) {
        fullText += chunk.text || "";

        const jsonBlockStarted = fullText.includes('```json');
        const conversationalPart = jsonBlockStarted ? fullText.substring(0, fullText.indexOf('```json')) : fullText;
        
        const completedFiles = [...conversationalPart.matchAll(completedFileBlocksRegex)].map(match => match[2]);

        let liveStreamData: ChatMessage['liveStream'] | undefined = undefined;
        let contentForMarkdown = conversationalPart;

        const lastOpeningFenceMatch = [...conversationalPart.matchAll(/```(\w*)\s*\n/g)].pop();

        if (lastOpeningFenceMatch) {
            const lastOpeningFenceIndex = lastOpeningFenceMatch.index!;
            const contentAfterLastOpen = conversationalPart.substring(lastOpeningFenceIndex);

            if (!contentAfterLastOpen.substring(lastOpeningFenceMatch[0].length).includes('```')) {
                const language = lastOpeningFenceMatch[1] || 'plaintext';
                const codeContent = contentAfterLastOpen.substring(lastOpeningFenceMatch[0].length);
                const pathMatch = codeContent.match(/^(?:<!--|\/\/|\/\*)\s*(\/[a-zA-Z0-9_\-\.\/]+)/);

                if (pathMatch && language.toLowerCase() !== 'json') {
                    liveStreamData = {
                        currentFile: pathMatch[1],
                        language: language,
                        currentCode: codeContent.replace(/^(?:<!--|\/\/|\/\*)\s*(\/[a-zA-Z0-9_\-\.\/]+)\s*(\*\/)?\n?/, ''),
                    };
                    contentForMarkdown = conversationalPart.substring(0, lastOpeningFenceIndex);
                }
            }
        }
        
        setChatMessages(prev => prev.map(msg => 
            msg.id === aiMsgId 
            ? { ...msg, 
                content: contentForMarkdown,
                liveStream: jsonBlockStarted ? undefined : liveStreamData,
                completedFiles: completedFiles,
                isApplyingChanges: jsonBlockStarted,
                isLoading: true,
              }
            : msg
        ));
      }

      const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
      const jsonMatch = fullText.match(jsonBlockRegex);
      const finalContent = fullText.replace(jsonBlockRegex, '').trim();

      if (jsonMatch && jsonMatch[1]) {
        try {
          const response = JSON.parse(sanitizeJson(jsonMatch[1]));
          
          if (response.files && Array.isArray(response.files) && response.files.length > 0) {
            const changedPaths = await handleAIChanges(response.files);
            const successMsg = `\n\n✨ **Changes Applied Successfully!**`;
            setChatMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, content: finalContent + successMsg, isLoading: false, liveStream: undefined, isApplyingChanges: false, completedFiles: changedPaths } : msg));
          } else {
             const generatedFiles = [...finalContent.matchAll(completedFileBlocksRegex)].map(match => match[2]);
            setChatMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, content: finalContent, isLoading: false, liveStream: undefined, isApplyingChanges: false, completedFiles: generatedFiles } : msg));
          }
        } catch (e) {
          console.error("Failed to parse AI JSON response", e);
          const errorContent = "Sorry, I couldn't process the file changes. Here's my explanation:\n" + finalContent;
          setChatMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, content: errorContent, isLoading: false, liveStream: undefined, isApplyingChanges: false } : msg));
        }
      } else {
        const generatedFiles = [...finalContent.matchAll(completedFileBlocksRegex)].map(match => match[2]);
        setChatMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, content: finalContent, isLoading: false, liveStream: undefined, completedFiles: generatedFiles } : msg));
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, content: "Sorry, I encountered an error processing your request.", isLoading: false, liveStream: undefined } : msg));
    }
  };

  const handleSendMessage = async (prompt: string, attachments: any[], isDeepThink: boolean) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      attachments: attachments.map(a => ({ name: a.name, type: a.type, dataUrl: a.dataUrl })),
      isDeepThink: isDeepThink,
    };

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: ChatMessage = { id: aiMsgId, role: 'assistant', content: '', timestamp: Date.now(), isLoading: true, liveStream: undefined, isDeepThink };

    setChatMessages(prev => [...prev, userMsg, aiMsg]);
    await streamAndApplyResponse(prompt, attachments, aiMsgId, isDeepThink);
  };

  const handleRegenerate = async () => {
    const lastUserMessage = [...chatMessages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    const lastUserMessageIndex = chatMessages.findLastIndex(m => m.role === 'user');
    const aiMsgId = (Date.now() + 1).toString();
    const isDeepThink = lastUserMessage.isDeepThink || false;
    const aiMsg: ChatMessage = { id: aiMsgId, role: 'assistant', content: '', timestamp: Date.now(), isLoading: true, liveStream: undefined, isDeepThink };

    setChatMessages(prev => [...prev.slice(0, lastUserMessageIndex + 1), aiMsg]);

    const attachments = lastUserMessage.attachments?.map(att => ({
        name: att.name, type: att.type, mimeType: att.type, dataUrl: att.dataUrl, data: att.dataUrl.split(',')[1],
    })) || [];
    
    await streamAndApplyResponse(lastUserMessage.content, attachments, aiMsgId, isDeepThink);
  };

  const handleCreateCheckpoint = () => {
    if (project) {
      setCheckpoint(project.files);
      const checkpointMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: '✅ Checkpoint created. You can restore your project to this point.',
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, checkpointMsg]);
    }
  };

  const handleRestoreCheckpoint = () => {
    if (project && checkpoint) {
      setProject({ ...project, files: checkpoint });
      setRefreshTrigger(p => p + 1);
      const restoreMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: '⏪ Project restored to the last checkpoint.',
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, restoreMsg]);
    }
  };

  const handleCreateFile = (path: string, isFolder: boolean) => {
     if (!project) return;
     let fullPath = path;
     if (isFolder) fullPath += '/.keep';
     
     if (project.files[fullPath] || (!isFolder && Object.keys(project.files).some(k => k.startsWith(path + '/')))) {
      alert("A file or folder with this name already exists at this path!"); return;
    }

    const updatedFiles = { ...project.files };
    if (isFolder) {
      updatedFiles[fullPath] = { path: fullPath, name: '.keep', content: '', type: 'plaintext', lastModified: Date.now() };
    } else {
      const name = path.split('/').pop() || 'new-file';
      const ext = name.split('.').pop();
      let type: any = 'plaintext';
      if(ext === 'html') type = 'html'; else if(ext === 'css') type = 'css'; else if(ext === 'js') type = 'javascript'; else if(ext === 'json') type = 'json';
      updatedFiles[path] = { path, name, content: '', type, lastModified: Date.now() };
      handleFileSelect(path);
    }
    setProject({ ...project, files: updatedFiles });
  };
  
  const handleRenameFile = (oldPath: string, newPath: string) => {
    if (!project || project.files[newPath]) {
      alert("A file with this name already exists."); return;
    }
    const updatedFiles = { ...project.files };
    const isFolderRename = !updatedFiles[oldPath] && Object.keys(updatedFiles).some(k => k.startsWith(oldPath + '/'));

    if (isFolderRename) {
      Object.keys(updatedFiles).forEach(key => {
        if (key.startsWith(oldPath + '/')) {
          const newKey = key.replace(oldPath, newPath);
          updatedFiles[newKey] = { ...updatedFiles[key], path: newKey, name: newKey.split('/').pop() || '' };
          delete updatedFiles[key];
          if (activeFile === key) setActiveFile(newKey);
          setOpenFiles(prev => prev.map(f => f === key ? newKey : f));
        }
      });
    } else if (updatedFiles[oldPath]) {
      updatedFiles[newPath] = { ...updatedFiles[oldPath], path: newPath, name: newPath.split('/').pop() || '' };
      delete updatedFiles[oldPath];
      if (activeFile === oldPath) setActiveFile(newPath);
      setOpenFiles(prev => prev.map(f => f === oldPath ? newPath : f));
    }
    setProject({ ...project, files: updatedFiles });
  };

  const handleDeleteFile = (path: string) => {
    if (!project) return;
    const updatedFiles = { ...project.files };
    const isFolder = !updatedFiles[path] && Object.keys(updatedFiles).some(k => k.startsWith(path + '/'));

    Object.keys(updatedFiles).forEach(key => {
      if (isFolder ? key.startsWith(path + '/') : key === path) {
        delete updatedFiles[key];
      }
    });
    setProject({ ...project, files: updatedFiles });
    if (activeFile === path || activeFile?.startsWith(path + '/')) setActiveFile(null);
    setOpenFiles(prev => prev.filter(f => f !== path && !f.startsWith(path + '/')));
  };

  const handleDuplicateFile = (oldPath: string, newPath: string) => {
    if (!project || !project.files[oldPath]) return;

    const originalFile = project.files[oldPath];
    const newFile: ProjectFile = {
      ...originalFile,
      path: newPath,
      name: newPath.split('/').pop()!,
      lastModified: Date.now(),
    };

    const updatedFiles = { ...project.files, [newPath]: newFile };
    setProject({ ...project, files: updatedFiles });
    handleFileSelect(newPath);
  };

  if (loading || !project) return <div className="h-screen flex items-center justify-center bg-background text-white"><Loader2 className="animate-spin w-8 h-8"/></div>;

  return (
    <>
      <SEO 
        title={`Editor: ${project.name}`}
        description={`Live-edit ${project.name} with an integrated AI assistant, real-time preview, and a VS Code-like experience, all in your browser.`}
        keywords="code editor, AI coding assistant, live preview, web development IDE, WebBench"
      />
      <div className="h-screen flex flex-col bg-background text-gray-300 overflow-hidden transition-colors duration-300">
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        <header className="h-10 bg-[#1e1e1e] border-b border-[#2b2b2b] flex items-center justify-between px-3 z-20 shrink-0 select-none">
          <div className="flex items-center gap-3">
            {isMobile && (
              <div className="flex items-center gap-1">
                <button onClick={() => navigate('/dashboard')} className="hover:bg-active p-1 rounded text-gray-400 hover:text-white transition-colors" title="Back to Dashboard">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hover:bg-active p-1 rounded text-gray-400 hover:text-white transition-colors" title="Toggle Explorer">
                  <Menu className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {!isMobile && (
                <button onClick={() => navigate('/dashboard')} className="hover:bg-active p-1 rounded text-gray-400 hover:text-white transition-colors" title="Back to Dashboard">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <span className="font-medium text-sm text-gray-200 truncate max-w-[150px] sm:max-w-[200px]">{project.name}</span>
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin text-yellow-500 opacity-70"/> : <Cloud className="w-3 h-3 text-gray-500 opacity-50"/>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isMobile ? (
              <>
              <button onClick={() => { setMobileTab('preview'); setRefreshTrigger(p => p + 1); }} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${mobileTab === 'preview' ? 'text-accent' : 'text-gray-400'}`} title="Preview"><Play className="w-4 h-4" /></button>
              <button onClick={() => setMobileTab('ai')} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${mobileTab === 'ai' ? 'text-accent' : 'text-gray-400'}`} title="AI Assistant"><Sparkles className="w-4 h-4" /></button>
              </>
            ) : (
              <button onClick={() => setShowPreview(!showPreview)} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${showPreview ? 'text-accent' : 'text-gray-400'}`} title="Toggle Preview Pane"><LayoutTemplate className="w-4 h-4" /></button>
            )}
            <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400" title="Settings">
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-600 mx-1"></div>
            <Button size="sm" variant="secondary" onClick={downloadProject} className="h-7 px-2 text-xs flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export</span></Button>
            <Button size="sm" onClick={() => forceSave()} className="h-7 px-2 text-xs flex items-center gap-1.5 bg-green-700 hover:bg-green-600"><Save className="w-3.5 h-3.5" /><span className="hidden sm:inline">Save</span></Button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden relative">
          <div className="flex shrink-0">
              <div className={`w-12 bg-[#252526] border-r border-[#2b2b2b] flex-col items-center py-2 shrink-0 z-30 ${isMobile ? 'hidden' : 'flex'}`}>
                <button onClick={() => toggleSidebar('files')} className={`w-12 h-12 flex items-center justify-center relative ${sidebarView === 'files' && isSidebarOpen ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`} title="Explorer"><Files className="w-6 h-6 stroke-[1.5]" />{sidebarView === 'files' && isSidebarOpen && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent"></div>}</button>
                <button onClick={() => toggleSidebar('search')} className={`w-12 h-12 flex items-center justify-center relative ${sidebarView === 'search' && isSidebarOpen ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`} title="Search"><Search className="w-6 h-6 stroke-[1.5]" />{sidebarView === 'search' && isSidebarOpen && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent"></div>}</button>
                <button onClick={() => toggleSidebar('ai')} className={`w-12 h-12 flex items-center justify-center relative ${sidebarView === 'ai' && isSidebarOpen ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`} title="AI Assistant"><Sparkles className="w-6 h-6 stroke-[1.5]" />{sidebarView === 'ai' && isSidebarOpen && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent"></div>}</button>
              </div>
              <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64 lg:w-72' : 'w-0'} overflow-hidden`}>
                  <div className="w-64 lg:w-72 h-full bg-sidebar border-r border-border flex flex-col shrink-0">
                      {sidebarView === 'files' && <FileExplorer files={project.files} activeFile={activeFile} highlightedFiles={highlightedFiles} onFileSelect={handleFileSelect} onCreate={handleCreateFile} onRename={handleRenameFile} onDelete={handleDeleteFile} onDuplicate={handleDuplicateFile} />}
                      {sidebarView === 'ai' && <AIChat files={project.files} activeFile={activeFile} messages={chatMessages} onSendMessage={handleSendMessage} onRegenerate={handleRegenerate} onClose={() => setIsSidebarOpen(false)} hasCheckpoint={!!checkpoint} onCreateCheckpoint={handleCreateCheckpoint} onRestoreCheckpoint={handleRestoreCheckpoint} />}
                      {sidebarView === 'search' && <div className="p-4 text-gray-500 text-sm text-center mt-10"><Search className="w-8 h-8 mx-auto mb-2 opacity-50" />Global search coming soon</div>}
                  </div>
              </div>
          </div>
          
          {isMobile && isSidebarOpen && (
            <div className="absolute top-0 left-0 h-full w-4/5 max-w-[300px] z-40 bg-sidebar border-r border-border flex flex-col animate-in slide-in-from-left-full duration-300">
              <FileExplorer files={project.files} activeFile={activeFile} highlightedFiles={highlightedFiles} onFileSelect={path => { handleFileSelect(path); setIsSidebarOpen(false); }} onCreate={handleCreateFile} onRename={handleRenameFile} onDelete={handleDeleteFile} onDuplicate={handleDuplicateFile} />
            </div>
          )}
          {isMobile && isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 bg-black/50 z-30 animate-in fade-in duration-300"></div>}
          
          {isMobile && mobileTab === 'ai' && <div className="absolute inset-0 z-20 bg-sidebar flex flex-col"><AIChat files={project.files} activeFile={activeFile} messages={chatMessages} onSendMessage={handleSendMessage} onRegenerate={handleRegenerate} onClose={() => setMobileTab('editor')} hasCheckpoint={!!checkpoint} onCreateCheckpoint={handleCreateCheckpoint} onRestoreCheckpoint={handleRestoreCheckpoint} /></div>}

          <div className={`bg-background h-full flex flex-col min-w-0 ${isMobile ? (mobileTab === 'editor' ? 'flex flex-1 w-full' : 'hidden') : 'flex-1 relative'}`}>
            <CodeEditor files={project.files} activeFile={activeFile} openFiles={openFiles} onChange={handleFileChange} onCloseFile={handleCloseFile} onSelectFile={handleFileSelect} isMobile={isMobile} />
          </div>

          {((!isMobile && showPreview) || (isMobile && mobileTab === 'preview')) && (
            <div className={`bg-sidebar border-l border-border h-full flex flex-col transition-colors duration-300 ${isMobile ? 'w-full absolute inset-0 z-10' : 'md:w-2/5 lg:w-1/3 shrink-0 relative'}`}>
              {isMobile && <div className="h-10 flex items-center justify-between px-2 bg-[#1e1e1e] border-b border-[#333] shrink-0"><span className="text-xs font-bold text-gray-400 uppercase">Preview</span><button onClick={() => setMobileTab('editor')}><X className="w-4 h-4 text-gray-400"/></button></div>}
              <Preview files={project.files} refreshTrigger={refreshTrigger} />
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Editor;