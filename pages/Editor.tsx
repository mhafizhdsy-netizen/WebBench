
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project, File as ProjectFile, PanelType, ChatMessage, ChatSession, Checkpoint, FileAction, LogEntry } from '../types';
import { CodeEditor } from '../components/editor/CodeEditor';
import { Preview } from '../components/editor/Preview';
import { AIChat } from '../components/editor/AIChat';
import { Button } from '../components/ui/Button';
import { SettingsModal } from '../components/dashboard/SettingsModal';
import { FileExplorer } from '../components/editor/FileExplorer';
import { generateCodeStream } from '../services/geminiService';
import { SEO } from '../components/ui/SEO';
import { CheckpointModal } from '../components/editor/CheckpointModal';
import { GitPanel } from '../components/editor/GitPanel';
import { 
  Menu, Save, ArrowLeft, Layout, MessageSquare, Play, Download, 
  Loader2, Cloud, Settings, Files, Search, Sparkles, X, LayoutTemplate,
  AlertTriangle, Check, CloudOff, AlertCircle, TerminalSquare, GitBranch
} from 'lucide-react';
import JSZip from 'jszip';
import { ActionModal, ActionModalConfig } from '../components/dashboard/ActionModal';
import { WebContainer } from '@webcontainer/api';
import { TerminalPanel } from '../components/editor/TerminalPanel';
import { useSettings } from '../context/ThemeContext';

type SidebarView = 'files' | 'search' | 'git';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type StartupStatus = 'idle' | 'booting' | 'mounting' | 'installing' | 'starting' | 'running' | 'error';

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
};

const WEBCONTAINER_BOOT_TIMEOUT = 30000;

export const Editor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false);
  
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [showPreview, setShowPreview] = useState(true);
  const [mobileTab, setMobileTab] = useState<PanelType>('editor');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [highlightedFiles, setHighlightedFiles] = useState<Set<string>>(new Set());
  
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isCreateCheckpointModalOpen, setIsCreateCheckpointModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [previewEntryPath, setPreviewEntryPath] = useState('/index.html');
  
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([]);
  const [modalConfig, setModalConfig] = useState<ActionModalConfig | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const firstOpen = useRef(true);

  const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null);
  const [startupStatus, setStartupStatus] = useState<StartupStatus>('idle');
  const [startupLog, setStartupLog] = useState('');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  
  const { editorSettings } = useSettings();

  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      if (newIsMobile !== isMobile) {
        setIsMobile(newIsMobile);
        setIsSidebarOpen(!newIsMobile);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'console') {
        setConsoleLogs(prev => [...prev, {
          level: e.data.level,
          message: e.data.message,
          timestamp: Date.now()
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCreateSession = async (arg?: any) => {
    // Safely handle event object to prevent circular structure errors
    if (arg && typeof arg === 'object' && 'preventDefault' in arg) {
        arg.preventDefault();
        arg.stopPropagation();
    }
    const targetProjectId = (typeof arg === 'string') ? arg : projectId;
    
    if (!targetProjectId) return;

    try {
        const session = await projectService.createChatSession(targetProjectId, 'New Chat');
        setChatSessions(prev => [session, ...prev]);
        setActiveSessionId(session.id);
        if (isMobile) setMobileTab('ai');
        else if (!showPreview) setShowPreview(true);
    } catch (e: any) {
        console.error("Failed to create chat session", e);
        setActionError(e.message);
    }
  };

  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setLoadError(null);
    try {
        const [proj, sessions, cps] = await Promise.all([
            projectService.getProject(projectId),
            projectService.getChatSessions(projectId),
            projectService.getCheckpointsForProject(projectId)
        ]);

        if (!proj) throw new Error("Project not found");
        
        setProject(proj);
        setChatSessions(sessions);
        setCheckpoints(cps);

        if (sessions.length > 0) {
            setActiveSessionId(sessions[0].id);
        } else {
            // Create initial session if none exists
            handleCreateSession(projectId);
        }

        // Open last opened file or first file
        const files = Object.values(proj.files);
        if (files.length > 0) {
            const initialFile = files.find(f => f.name === 'index.html' || f.name === 'App.tsx' || f.name === 'main.py' || f.name === 'index.php') || files[0];
            setActiveFile(initialFile.path);
            setOpenFiles([initialFile.path]);
        }
    } catch (e: any) {
        setLoadError(e.message);
    } finally {
        setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Save functionality
  const saveProject = async (currentProject: Project) => {
    setSaveStatus('saving');
    try {
        await projectService.updateProject(currentProject.id, { files: currentProject.files });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
        setSaveStatus('error');
        console.error("Save failed", e);
    }
  };

  const debouncedSave = useCallback(debounce((p: Project) => saveProject(p), 1000), []);

  const handleFileChange = (newContent: string | undefined) => {
    if (!project || !activeFile || newContent === undefined) return;
    
    const updatedFiles = {
        ...project.files,
        [activeFile]: {
            ...project.files[activeFile],
            content: newContent,
            lastModified: Date.now()
        }
    };
    
    const updatedProject = { ...project, files: updatedFiles };
    setProject(updatedProject);
    
    if (editorSettings.autoSave) {
        debouncedSave(updatedProject);
    } else {
        setSaveStatus('idle'); // Just marks as dirty effectively
    }
  };

  const handleManualSave = async () => {
    if (project) {
        await saveProject(project);
    }
  };

  // WebContainer Logic
  useEffect(() => {
      if (!project) return;
      const isRunnable = project.type === 'react-vite' || project.type === 'nextjs';
      
      if (isRunnable && !webcontainerInstance && !loading) {
          bootWebContainer();
      }
  }, [project, loading]);

  const bootWebContainer = async () => {
      if (!project) return;
      
      setStartupStatus('booting');
      setStartupLog('Initializing WebContainer...\n');
      
      try {
          const { WebContainer } = await import('@webcontainer/api');
          const instance = await WebContainer.boot();
          setWebcontainerInstance(instance);
          
          setStartupStatus('mounting');
          setStartupLog(prev => prev + 'Mounting files...\n');
          
          const fileSystem: any = {};
          Object.values(project.files).forEach(file => {
              if (file.name === '.keep') return;
              const parts = file.path.split('/').filter(Boolean);
              let current = fileSystem;
              for (let i = 0; i < parts.length - 1; i++) {
                  const part = parts[i];
                  if (!current[part]) current[part] = { directory: {} };
                  current = current[part].directory;
              }
              const fileName = parts[parts.length - 1];
              current[fileName] = { file: { contents: file.content } };
          });
          
          await instance.mount(fileSystem);
          
          setStartupStatus('installing');
          setStartupLog(prev => prev + 'Installing dependencies...\n');
          
          const installProcess = await instance.spawn('npm', ['install']);
          installProcess.output.pipeTo(new WritableStream({
              write(data) {
                  setStartupLog(prev => prev + data);
              }
          }));
          
          if ((await installProcess.exit) !== 0) {
              throw new Error('Installation failed');
          }
          
          setStartupStatus('starting');
          setStartupLog(prev => prev + 'Starting server...\n');
          
          const devProcess = await instance.spawn('npm', ['run', 'dev']);
          devProcess.output.pipeTo(new WritableStream({
              write(data) {
                  setStartupLog(prev => prev + data);
              }
          }));
          
          instance.on('server-ready', (port, url) => {
              setServerUrl(url);
              setStartupStatus('running');
              setStartupLog(prev => prev + `Server ready at ${url}\n`);
          });
          
      } catch (e: any) {
          console.error(e);
          setStartupStatus('error');
          setStartupLog(prev => prev + `\nError: ${e.message}`);
      }
  };

  const handleSendMessage = async (prompt: string, attachments: any[], model: string, sessionId: string) => {
      if (!project || !projectId) return;
      
      const userMsg: ChatMessage = {
          clientId: Date.now().toString(),
          session_id: sessionId,
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
          attachments,
          model
      };

      // Optimistic update
      const sessionIndex = chatSessions.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) return;
      
      const updatedSessions = [...chatSessions];
      updatedSessions[sessionIndex] = {
          ...updatedSessions[sessionIndex],
          messages: [...updatedSessions[sessionIndex].messages, userMsg]
      };
      setChatSessions(updatedSessions);

      try {
          await projectService.saveChatMessage(userMsg);
          
          const assistantMsgId = (Date.now() + 1).toString();
          const assistantMsgPlaceholder: ChatMessage = {
              clientId: assistantMsgId,
              session_id: sessionId,
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
              isLoading: true,
              model
          };
          
          updatedSessions[sessionIndex].messages.push(assistantMsgPlaceholder);
          setChatSessions([...updatedSessions]);

          const stream = await generateCodeStream(
              prompt,
              project.files,
              activeFile,
              attachments.map(a => ({ mimeType: a.mimeType, data: a.data })),
              model
          );

          let fullContent = '';
          let accumulatedJson = '';
          
          for await (const chunk of stream) {
             const text = chunk.text();
             if (text) {
                 fullContent += text;
                 
                 // Update UI with streaming content
                 setChatSessions(prev => {
                     const sessIdx = prev.findIndex(s => s.id === sessionId);
                     if (sessIdx === -1) return prev;
                     
                     const msgs = [...prev[sessIdx].messages];
                     const msgIdx = msgs.findIndex(m => m.clientId === assistantMsgId);
                     if (msgIdx !== -1) {
                         msgs[msgIdx] = { ...msgs[msgIdx], content: fullContent };
                     }
                     
                     const newSessions = [...prev];
                     newSessions[sessIdx] = { ...newSessions[sessIdx], messages: msgs };
                     return newSessions;
                 });
                 
                 // Try to extract JSON at the end
                 const jsonMatch = fullContent.match(/```json\s*([\s\S]*?)\s*```$/);
                 if (jsonMatch) {
                     accumulatedJson = jsonMatch[1];
                 }
             }
          }
          
          // Process file updates from JSON
          let completedFiles: FileAction[] = [];
          if (accumulatedJson) {
              try {
                  const data = JSON.parse(accumulatedJson);
                  if (data.files && Array.isArray(data.files)) {
                      const newFiles = { ...project.files };
                      data.files.forEach((fileOp: any) => {
                          if (fileOp.action === 'create' || fileOp.action === 'update') {
                              newFiles[fileOp.path] = {
                                  path: fileOp.path,
                                  name: fileOp.path.split('/').pop() || '',
                                  type: fileOp.type || 'plaintext',
                                  content: fileOp.content,
                                  lastModified: Date.now()
                              };
                              completedFiles.push({ action: fileOp.action, path: fileOp.path });
                          } else if (fileOp.action === 'delete') {
                              delete newFiles[fileOp.path];
                              completedFiles.push({ action: 'delete', path: fileOp.path });
                          }
                      });
                      
                      const updatedProject = { ...project, files: newFiles };
                      setProject(updatedProject);
                      saveProject(updatedProject);
                      setRefreshTrigger(prev => prev + 1);
                      setHighlightedFiles(new Set(completedFiles.map(f => f.path)));
                      setTimeout(() => setHighlightedFiles(new Set()), 5000);
                  }
              } catch (e) {
                  console.error("Failed to parse JSON file operations", e);
              }
          }

          // Final update
          setChatSessions(prev => {
             const sessIdx = prev.findIndex(s => s.id === sessionId);
             if (sessIdx === -1) return prev;
             
             const msgs = [...prev[sessIdx].messages];
             const msgIdx = msgs.findIndex(m => m.clientId === assistantMsgId);
             if (msgIdx !== -1) {
                 msgs[msgIdx] = { 
                     ...msgs[msgIdx], 
                     content: fullContent, 
                     isLoading: false,
                     completedFiles
                 };
                 // Save assistant message to DB
                 projectService.saveChatMessage(msgs[msgIdx]);
             }
             
             const newSessions = [...prev];
             newSessions[sessIdx] = { ...newSessions[sessIdx], messages: msgs };
             return newSessions;
          });

      } catch (e: any) {
          console.error("Chat Error", e);
          setChatSessions(prev => {
             const sessIdx = prev.findIndex(s => s.id === sessionId);
             if (sessIdx === -1) return prev;
             
             const msgs = [...prev[sessIdx].messages];
             // Find the loading message or append error
             const lastMsg = msgs[msgs.length - 1];
             if (lastMsg.isLoading) {
                 msgs[msgs.length - 1] = { 
                     ...lastMsg, 
                     content: e.message || "An error occurred.", 
                     isLoading: false,
                     isError: true 
                 };
             }
             const newSessions = [...prev];
             newSessions[sessIdx] = { ...newSessions[sessIdx], messages: msgs };
             return newSessions;
          });
      }
  };

  const handleCreateCheckpoint = async (config: ActionModalConfig, value?: string) => {
      if (!project || !projectId || !value) return;
      try {
          const cp = await projectService.createCheckpoint(projectId, value, project.files);
          setCheckpoints([cp, ...checkpoints]);
      } catch (e: any) {
          setActionError(e.message);
      }
  };
  
  const handleRestoreCheckpoint = async (cp: Checkpoint) => {
      if (!project) return;
      setProject({ ...project, files: cp.files });
      await saveProject({ ...project, files: cp.files });
      setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteCheckpoint = async (id: string) => {
      try {
          await projectService.deleteCheckpoint(id);
          setCheckpoints(prev => prev.filter(c => c.id !== id));
      } catch (e: any) {
          setActionError(e.message);
      }
  };

  const handleDownloadZip = async () => {
    if (!project) return;
    const zip = new JSZip();
    Object.values(project.files).forEach(file => {
        if (file.name !== '.keep') {
            const path = file.path.startsWith('/') ? file.path.substring(1) : file.path;
            zip.file(path, file.content);
        }
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Helper to update files from GitPanel or Explorer
  const updateFiles = async (files: Record<string, ProjectFile>) => {
      if (!project) return;
      const newFiles = { ...project.files, ...files };
      const updatedProject = { ...project, files: newFiles };
      setProject(updatedProject);
      await saveProject(updatedProject);
      setRefreshTrigger(p => p + 1);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-background"><WebBenchLoader size="lg" text="Loading Editor..." /></div>;
  if (loadError || !project) return <div className="h-screen flex items-center justify-center bg-background text-white flex-col gap-4"><AlertCircle className="w-12 h-12 text-red-500" /><p>{loadError || "Project not found"}</p><Button onClick={() => navigate('/dashboard')}>Go Home</Button></div>;

  const SidebarContent = () => {
      switch (sidebarView) {
          case 'files':
              return (
                <FileExplorer 
                    files={project.files}
                    activeFile={activeFile}
                    highlightedFiles={highlightedFiles}
                    onFileSelect={(path) => {
                        setActiveFile(path);
                        if (!openFiles.includes(path)) setOpenFiles([...openFiles, path]);
                        if (isMobile) setMobileTab('editor');
                    }}
                    onCreate={(path, isFolder) => {
                        if (isFolder) return; // Basic implementation for files only here for brevity, full impl in component
                        updateFiles({ [path]: { path, name: path.split('/').pop() || '', type: 'plaintext', content: '', lastModified: Date.now() } });
                    }}
                    onRename={(oldPath, newPath) => {
                         const newFiles = { ...project.files };
                         newFiles[newPath] = { ...newFiles[oldPath], path: newPath, name: newPath.split('/').pop() || '' };
                         delete newFiles[oldPath];
                         setProject({ ...project, files: newFiles });
                         saveProject({ ...project, files: newFiles });
                    }}
                    onDelete={(path) => {
                        const newFiles = { ...project.files };
                        delete newFiles[path];
                        setProject({ ...project, files: newFiles });
                        saveProject({ ...project, files: newFiles });
                        if (activeFile === path) setActiveFile(null);
                        setOpenFiles(openFiles.filter(f => f !== path));
                    }}
                    onDuplicate={(oldPath, newPath) => {
                         const newFiles = { ...project.files };
                         newFiles[newPath] = { ...newFiles[oldPath], path: newPath, name: newPath.split('/').pop() || '' };
                         setProject({ ...project, files: newFiles });
                         saveProject({ ...project, files: newFiles });
                    }}
                    isMobile={isMobile}
                />
              );
          case 'git':
              return (
                  <GitPanel 
                    project={project} 
                    checkpoints={checkpoints} 
                    onCreateCheckpoint={async (msg, files) => {
                        if (projectId) {
                            const cp = await projectService.createCheckpoint(projectId, msg, files || project.files);
                            setCheckpoints([cp, ...checkpoints]);
                        }
                    }}
                    onRefresh={loadProjectData}
                    onUpdateFiles={updateFiles}
                  />
              );
          default:
              return null;
      }
  };

  return (
    <>
        <SEO title={`Editor - ${project.name}`} />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        <CheckpointModal 
            isOpen={isCheckpointModalOpen} 
            onClose={() => setIsCheckpointModalOpen(false)}
            checkpoints={checkpoints}
            onRestore={handleRestoreCheckpoint}
            onDelete={handleDeleteCheckpoint}
            onCreate={() => setModalConfig({ type: 'createCheckpoint', project })}
        />
        <ActionModal 
            isOpen={!!modalConfig} 
            config={modalConfig} 
            onClose={() => setModalConfig(null)} 
            onConfirm={handleCreateCheckpoint}
        />

        <div className="h-screen w-full flex flex-col bg-background text-gray-300 overflow-hidden">
            {/* Header */}
            <header className="h-10 md:h-12 border-b border-border bg-sidebar flex items-center justify-between px-3 shrink-0 select-none">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate max-w-[150px] md:max-w-xs">{project.name}</span>
                        {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
                        {saveStatus === 'saved' && <Check className="w-3 h-3 text-green-400" />}
                        {saveStatus === 'error' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                     {!isMobile && (
                        <>
                             <Button size="sm" variant="ghost" onClick={() => setIsTerminalOpen(!isTerminalOpen)} title="Toggle Terminal">
                                <TerminalSquare className="w-4 h-4" />
                             </Button>
                             <Button size="sm" variant="ghost" onClick={() => setShowPreview(!showPreview)} title="Toggle Preview">
                                <Layout className="w-4 h-4" />
                             </Button>
                        </>
                     )}
                     <Button size="sm" variant="secondary" onClick={handleDownloadZip} title="Download Project">
                        <Download className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Export</span>
                     </Button>
                     <Button size="sm" onClick={handleManualSave} className="hidden md:flex">
                        <Save className="w-4 h-4 mr-2" /> Save
                     </Button>
                     <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                        <Settings className="w-4 h-4" />
                     </button>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                {(isSidebarOpen || !isMobile) && (
                    <div className={`${isMobile ? 'fixed inset-0 z-40 flex' : 'w-64 flex flex-col'} border-r border-border bg-sidebar`}>
                        <div className="w-12 flex flex-col items-center py-4 border-r border-border bg-[#1e1e1e] shrink-0">
                            <button onClick={() => setSidebarView('files')} className={`p-2 mb-2 rounded ${sidebarView === 'files' ? 'text-accent bg-accent/10' : 'text-gray-400 hover:text-white'}`}><Files className="w-5 h-5"/></button>
                            <button onClick={() => setSidebarView('git')} className={`p-2 mb-2 rounded ${sidebarView === 'git' ? 'text-accent bg-accent/10' : 'text-gray-400 hover:text-white'}`}><GitBranch className="w-5 h-5"/></button>
                        </div>
                        <div className="flex-1 flex flex-col min-w-0 bg-sidebar relative">
                            {isMobile && <button onClick={() => setIsSidebarOpen(false)} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full z-10"><X className="w-4 h-4"/></button>}
                            <SidebarContent />
                        </div>
                    </div>
                )}

                {/* Editor Area */}
                <div className={`flex-1 flex flex-col min-w-0 ${isMobile && mobileTab !== 'editor' ? 'hidden' : 'flex'}`}>
                     <CodeEditor 
                        files={project.files}
                        activeFile={activeFile}
                        openFiles={openFiles}
                        onChange={handleFileChange}
                        onCloseFile={(path) => {
                            const newOpen = openFiles.filter(p => p !== path);
                            setOpenFiles(newOpen);
                            if (activeFile === path) setActiveFile(newOpen[newOpen.length - 1] || null);
                        }}
                        onSelectFile={(path) => setActiveFile(path)}
                        onSave={handleManualSave}
                        isMobile={isMobile}
                        isRunnableProject={project.type === 'react-vite' || project.type === 'nextjs'}
                        onToggleTerminal={() => setIsTerminalOpen(p => !p)}
                     />
                     
                     {/* Terminal Panel */}
                     {isTerminalOpen && (
                        <div className="h-64 border-t border-border shrink-0">
                             <TerminalPanel 
                                webcontainerInstance={webcontainerInstance}
                                isContainerReady={startupStatus === 'running'}
                                onClose={() => setIsTerminalOpen(false)}
                                projectType={project.type}
                                files={project.files}
                             />
                        </div>
                     )}
                </div>

                {/* Right Panel (Preview / AI) */}
                {(!isMobile || mobileTab !== 'editor') && showPreview && (
                    <div className={`w-full md:w-[400px] lg:w-[500px] xl:w-[600px] flex flex-col border-l border-border bg-[#1e1e1e] ${isMobile ? 'flex-1' : ''}`}>
                        <div className="flex border-b border-border bg-[#252526]">
                             <button onClick={() => { if(isMobile) setMobileTab('preview'); }} className={`flex-1 py-2 text-xs font-bold uppercase ${(!isMobile || mobileTab === 'preview') ? 'border-b-2 border-accent text-white' : 'text-gray-500'}`}>Preview</button>
                             <button onClick={() => { if(isMobile) setMobileTab('ai'); }} className={`flex-1 py-2 text-xs font-bold uppercase ${isMobile && mobileTab === 'ai' ? 'border-b-2 border-accent text-white' : 'text-gray-500'}`}>AI Assistant</button>
                        </div>
                        
                        <div className="flex-1 overflow-hidden relative">
                             {(!isMobile || mobileTab === 'preview') && (
                                <div className={`absolute inset-0 flex flex-col ${isMobile && mobileTab !== 'preview' ? 'hidden' : ''}`}>
                                    <Preview 
                                        project={project}
                                        refreshTrigger={refreshTrigger}
                                        previewEntryPath={previewEntryPath}
                                        onNavigate={setPreviewEntryPath}
                                        isMobile={isMobile}
                                        onClose={() => setShowPreview(false)}
                                        startupStatus={startupStatus}
                                        startupLog={startupLog}
                                        serverUrl={serverUrl}
                                        logs={consoleLogs}
                                        onClearLogs={() => setConsoleLogs([])}
                                    />
                                </div>
                             )}
                             
                             {/* AI Chat Overlay or Tab */}
                             <div className={`absolute inset-0 z-10 flex flex-col bg-sidebar transition-transform duration-300 ${!isMobile && !showPreview ? 'translate-x-full' : 'translate-x-0'} ${isMobile && mobileTab !== 'ai' ? 'hidden' : ''} ${!isMobile ? 'pointer-events-none opacity-0' : ''}`} style={!isMobile ? { pointerEvents: 'auto', opacity: 1, position: 'relative' } : {}}>
                                 <AIChat 
                                    files={project.files}
                                    sessions={chatSessions}
                                    activeSessionId={activeSessionId}
                                    onSendMessage={handleSendMessage}
                                    onRegenerate={async (sid) => { /* logic */ }}
                                    onClose={() => { if(isMobile) setMobileTab('editor'); else setShowPreview(false); }}
                                    onOpenCheckpoints={() => setIsCheckpointModalOpen(true)}
                                    onCreateCheckpoint={() => setModalConfig({ type: 'createCheckpoint', project })}
                                    onCreateSession={() => handleCreateSession(projectId)}
                                    onSwitchSession={setActiveSessionId}
                                    onCancel={() => abortControllerRef.current?.abort()}
                                    onDeleteMessage={async (id) => { await projectService.deleteChatMessage(id); loadProjectData(); }}
                                    onDeleteSession={async (id) => { await projectService.deleteChatSession(id); loadProjectData(); }}
                                    onDragStart={() => {}}
                                    onResizeStart={() => {}}
                                    errorLogs={consoleLogs.filter(l => l.level === 'error')}
                                 />
                             </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Mobile Navigation Footer */}
            {isMobile && (
                <div className="h-12 border-t border-border bg-sidebar flex items-center justify-around shrink-0 z-50">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-400 hover:text-white"><Files className="w-5 h-5"/></button>
                    <button onClick={() => setMobileTab('editor')} className={`p-2 ${mobileTab === 'editor' ? 'text-accent' : 'text-gray-400'}`}><LayoutTemplate className="w-5 h-5"/></button>
                    <button onClick={() => setMobileTab('preview')} className={`p-2 ${mobileTab === 'preview' ? 'text-accent' : 'text-gray-400'}`}><Play className="w-5 h-5"/></button>
                    <button onClick={() => setMobileTab('ai')} className={`p-2 ${mobileTab === 'ai' ? 'text-accent' : 'text-gray-400'}`}><Sparkles className="w-5 h-5"/></button>
                </div>
            )}
        </div>
    </>
  );
};

export default Editor;
