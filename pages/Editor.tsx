import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project, File as ProjectFile, PanelType, ChatMessage, ChatSession, Checkpoint } from '../types';
import { CodeEditor } from '../components/editor/CodeEditor';
import { Preview } from '../components/editor/Preview';
import { AIChat } from '../components/editor/AIChat';
import { Button } from '../components/ui/Button';
import { SettingsModal } from '../components/dashboard/SettingsModal';
import { FileExplorer } from '../components/editor/FileExplorer';
import { generateCodeStream } from '../services/geminiService';
import { SEO } from '../components/ui/SEO';
import { CheckpointModal } from '../components/editor/CheckpointModal';
import { 
  Menu, Save, ArrowLeft, Layout, MessageSquare, Play, Download, 
  Loader2, Cloud, Settings, Files, Search, Sparkles, X, LayoutTemplate,
  AlertTriangle, Check, CloudOff, AlertCircle
} from 'lucide-react';
import JSZip from 'jszip';
import { ActionModal } from '../components/dashboard/ActionModal';

type SidebarView = 'files' | 'search';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Regex to match a complete file code block including the path comment
// This will be used to strip them from the final markdown content display
const FILE_CODE_BLOCK_FULL_REGEX = /```[a-zA-Z]*\s*\n(?:<!--|\/\/|\/\*)\s*(\/[a-zA-Z0-9_\-\.\/]+)[\s\S]*?```/g;


const Editor: React.FC = () => {
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
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // State for draggable/resizable modal
  const modalRef = useRef<HTMLDivElement>(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [modalSize, setModalSize] = useState({ width: 0, height: 0 });
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialModalState = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const resizeHandleRef = useRef<string | null>(null);
  const firstOpen = useRef(true);

  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      if (newIsMobile !== isMobile) {
        setIsMobile(newIsMobile);
        // Automatically close sidebar when switching to mobile, open on desktop
        setIsSidebarOpen(!newIsMobile);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  const loadInitialData = useCallback(async () => {
    if (!projectId) {
      setLoadError("Project ID is missing.");
      setLoading(false);
      return;
    }
    try {
      const p = await projectService.getProject(projectId);
      if (!p) {
        setLoadError("Project not found.");
        return;
      }
      setProject(p);
      const initialFile = p.files['/index.html'] ? '/index.html' : Object.keys(p.files)[0];
      if (initialFile) handleFileSelect(initialFile);

      const [loadedSessions, loadedCheckpoints] = await Promise.all([
        projectService.getChatSessions(projectId),
        projectService.getCheckpointsForProject(projectId),
      ]);
      
      setCheckpoints(loadedCheckpoints);

      if (loadedSessions.length > 0) {
        setChatSessions(loadedSessions);
        setActiveSessionId(loadedSessions[0].id);
      } else {
        // Create a default session if none exist
        await handleCreateSession(projectId);
      }

    } catch (error: any) {
      console.error("Error loading project data", error);
      setLoadError(error.message || "An unknown error occurred while loading the project.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);
  
  useEffect(() => {
    if (loading || saveStatus === 'saving') return;
    const timeout = setTimeout(() => {
      forceSave(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [project, loading]);

  useEffect(() => {
    if (isChatModalOpen) {
      if (firstOpen.current) {
        const defaultWidth = Math.min(window.innerWidth * 0.8, 768);
        const defaultHeight = Math.min(window.innerHeight * 0.75, 650);
        const defaultX = Math.max(16, (window.innerWidth - defaultWidth) / 2);
        const defaultY = Math.max(16, (window.innerHeight - defaultHeight) / 2);
  
        setModalSize({ width: defaultWidth, height: defaultHeight });
        setModalPosition({ x: defaultX, y: defaultY });
        
        firstOpen.current = false;
      }
    } else {
      firstOpen.current = true;
    }
  }, [isChatModalOpen]);


  const handleCreateSession = async (pId = projectId) => {
    if (!pId) return;
    try {
      const newSession = await projectService.createChatSession(pId, `Chat ${chatSessions.length + 1}`);
      setChatSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    } catch(e: any) {
      setActionError(e.message);
    }
  };

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
    if (project && projectId && saveStatus !== 'saving') {
      setSaveStatus('saving');
      try {
        await projectService.updateProject(projectId, { files: project.files });
        if (withRefresh) setRefreshTrigger(prev => prev + 1);
        setSaveStatus('saved');
      } catch (error) {
        console.error("Save error:", error);
        setSaveStatus('error');
      } finally {
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
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
    a.download = `${project.name}-WebBench.zip`;
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
        changedPaths.push(path); // Always record the path being acted upon.

        if (f.action === 'delete') {
            Object.keys(updatedFiles).forEach(key => {
                // Delete the file itself, or if it's a folder, delete everything inside it.
                if (key === path || key.startsWith(path + '/')) {
                    delete updatedFiles[key];
                    if (activeFile === key) setActiveFile(null);
                    newOpenFiles = newOpenFiles.filter(op => op !== key);
                }
            });
        } else { // 'create' or 'update'
            if (f.type === 'folder') {
                const folderPath = path.endsWith('/') ? path.slice(0, -1) : path;
                const keepFilePath = `${folderPath}/.keep`;
                if (!updatedFiles[keepFilePath]) {
                    updatedFiles[keepFilePath] = {
                        path: keepFilePath, name: '.keep',
                        type: 'plaintext', content: '',
                        lastModified: Date.now()
                    };
                }
            } else {
                updatedFiles[path] = {
                    path, name: path.split('/').pop()!,
                    type: f.type || 'plaintext', content: f.content || '',
                    lastModified: Date.now()
                };
                if (!newOpenFiles.includes(path) && newOpenFiles.length < 10) {
                    newOpenFiles.push(path);
                }
                if (!activeFile) {
                    setActiveFile(path);
                }
            }
        }
    });

    setHighlightedFiles(new Set(changedPaths));
    setTimeout(() => setHighlightedFiles(new Set()), 4000);

    setProject({ ...project, files: updatedFiles });
    setOpenFiles(newOpenFiles);
    if (activeFile && !updatedFiles[activeFile]) {
        setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
    }
    setRefreshTrigger(p => p + 1);
    return Promise.resolve(changedPaths);
  };

  const updateMessageInState = (sessionId: string, message: ChatMessage) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session => {
        if (session.id === sessionId) {
          const existingMsgIndex = session.messages.findIndex(m => m.clientId === message.clientId);
          let newMessages;
          if (existingMsgIndex > -1) {
            newMessages = session.messages.map(m => m.clientId === message.clientId ? message : m);
          } else {
            newMessages = [...session.messages, message];
          }
          return { ...session, messages: newMessages };
        }
        return session;
      })
    );
  };

  const streamAndApplyResponse = async (prompt: string, attachments: any[], aiMsg: ChatMessage, model: string) => {
    if (!project) return;
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // --- Client-side Analysis Simulation ---
      const filesToAnalyze = Object.keys(project.files).filter(p => project.files[p].name !== '.keep');
      for (const filePath of filesToAnalyze) {
          if (signal.aborted) throw new Error("Cancelled by user.");
          
          const analysisUpdate: Partial<ChatMessage> = {
              isLoading: true,
              analysisText: `Analyze: ${filePath}`,
          };
          updateMessageInState(aiMsg.session_id, { ...aiMsg, ...analysisUpdate });

          await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // --- Transition to Thinking State ---
      const thinkingUpdate: Partial<ChatMessage> = {
          isLoading: true,
          analysisText: undefined, // Clear analysis text
          content: '',
      };
      updateMessageInState(aiMsg.session_id, { ...aiMsg, ...thinkingUpdate });

      const streamResponse = await generateCodeStream( prompt, project.files, activeFile, attachments, model, signal );
      let fullText = '';
      let sources = new Map<string, string>();
      
      for await (const chunk of streamResponse) {
        if (signal.aborted) throw new Error("Cancelled by user.");

        fullText += chunk.text || "";

        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
          for (const g_chunk of groundingChunks) {
            if (g_chunk.web) {
              sources.set(g_chunk.web.uri, g_chunk.web.title || g_chunk.web.uri);
            }
          }
        }
        
        // Find all completed code blocks from the full stream text
        const completedBlocks = [...fullText.matchAll(FILE_CODE_BLOCK_FULL_REGEX)];
        const completedFilesInStream = completedBlocks.map(match => match[1]);

        // Temporarily remove completed blocks to find the live one
        let textForLiveParsing = fullText;
        completedBlocks.forEach(match => {
            textForLiveParsing = textForLiveParsing.replace(match[0], '');
        });

        let currentLiveStreamData: ChatMessage['liveStream'] | undefined = undefined;
        let contentForMarkdown = textForLiveParsing; // This now only contains summary + live block + json block

        const lastOpeningFenceMatch = [...textForLiveParsing.matchAll(/```(\w*)\s*\n/g)].pop();
        if (lastOpeningFenceMatch) {
            const lastOpeningFenceIndex = lastOpeningFenceMatch.index!;
            const contentAfterLastOpen = textForLiveParsing.substring(lastOpeningFenceIndex);
            
            if (!contentAfterLastOpen.substring(lastOpeningFenceMatch[0].length).includes('```')) {
                const language = lastOpeningFenceMatch[1] || 'plaintext';
                const codeContent = contentAfterLastOpen.substring(lastOpeningFenceMatch[0].length);
                const pathMatch = codeContent.match(/^(?:<!--|\/\/|\/\*)\s*(\/[a-zA-Z0-9_\-\.\/]+)/);
                
                // Ensure it's a file block and not the final json block
                if (pathMatch && language.toLowerCase() !== 'json') {
                    currentLiveStreamData = {
                        currentFile: pathMatch[1],
                        language: language,
                        currentCode: codeContent.replace(/^(?:<!--|\/\/|\/\*)\s*(\/[a-zA-Z0-9_\-\.\/]+)\s*(\*\/)?\n?/, ''),
                    };
                    // FIX: Remove the live block from markdown content to prevent duplication
                    contentForMarkdown = textForLiveParsing.substring(0, lastOpeningFenceIndex).trim();
                }
            }
        }

        // Now, also remove the final JSON block from the markdown content
        const finalJsonBlockRegex = /```json\s*[\s\S]*?```\s*$/;
        contentForMarkdown = contentForMarkdown.replace(finalJsonBlockRegex, '').trim();

        const jsonBlockDetected = fullText.includes('```json');

        const updatedMsg: Partial<ChatMessage> = { 
            content: contentForMarkdown,
            liveStream: currentLiveStreamData,
            streamingCompletedFiles: completedFilesInStream,
            isApplyingChanges: jsonBlockDetected,
            isLoading: true,
        };
        updateMessageInState(aiMsg.session_id, { ...aiMsg, ...updatedMsg });
      }

      const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
      const jsonMatch = fullText.match(jsonBlockRegex);
      
      let finalContentForMessage = fullText.replace(FILE_CODE_BLOCK_FULL_REGEX, '').replace(jsonBlockRegex, '').trim();

      let completedPaths: string[] = [];
      let isError = false;
      let errorContent = '';
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          // Sanitize the JSON string before parsing to remove trailing commas etc.
          const sanitizedJson = jsonMatch[1].trim().replace(/,(?=\s*?[\}\]])/g, '');
          const response = JSON.parse(sanitizedJson);
          if (response.files && Array.isArray(response.files) && response.files.length > 0) {
            completedPaths = await handleAIChanges(response.files);
          }
        } catch (e: any) {
          console.error("Failed to parse AI JSON response", e, "Raw JSON:", jsonMatch[1]);
          isError = true;
          errorContent = `Sorry, I couldn't process the file changes due to a formatting error in my response. Here's my explanation:\n\n${fullText.replace(jsonBlockRegex, '')}\n\n**Faulty JSON block:**\n\`\`\`json\n${jsonMatch[1]}\n\`\`\``;
        }
      } else {
        completedPaths = [...fullText.matchAll(FILE_CODE_BLOCK_FULL_REGEX)].map(match => match[1]);
      }
      
      const finalSources = Array.from(sources, ([uri, title]) => ({ uri, title }));
      
      const finalMessageUpdate: ChatMessage = { 
          ...aiMsg, 
          isLoading: false, 
          liveStream: undefined,
          streamingCompletedFiles: undefined,
          isApplyingChanges: false, 
          sources: finalSources, 
          content: isError ? errorContent : finalContentForMessage,
          completedFiles: isError ? [] : completedPaths,
          isError: isError
      };
      
      const savedMessage = await projectService.saveChatMessage(finalMessageUpdate);
      updateMessageInState(aiMsg.session_id, { ...finalMessageUpdate, ...savedMessage });
    
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorContent = signal.aborted ? "Generation cancelled." : `Sorry, I encountered an error: ${error.message}`;
      const finalMessage = { ...aiMsg, content: errorContent, isLoading: false, liveStream: undefined, streamingCompletedFiles: undefined, isError: true };
      const savedMessage = await projectService.saveChatMessage(finalMessage);
      updateMessageInState(aiMsg.session_id, { ...finalMessage, ...savedMessage });
    } finally {
        abortControllerRef.current = null;
    }
  };
  
  const handleSendMessage = async (prompt: string, attachments: any[], model: string, sessionId: string) => {
    const userMsg: ChatMessage = {
      clientId: Date.now().toString(),
      session_id: sessionId,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      attachments: attachments.map(a => ({ name: a.name, type: a.type, dataUrl: a.dataUrl })),
      model,
    };

    const aiMsg: ChatMessage = { 
        clientId: (Date.now() + 1).toString(), 
        session_id: sessionId, 
        role: 'assistant', content: '', timestamp: Date.now(), isLoading: true, liveStream: undefined, model 
    };
    
    setChatSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, userMsg, aiMsg] } : s));

    const savedUserMsg = await projectService.saveChatMessage(userMsg);
    updateMessageInState(sessionId, {...userMsg, ...savedUserMsg});

    const attachmentData = attachments.map(a => ({ mimeType: a.mimeType, data: a.dataUrl.split(',')[1] }));
    await streamAndApplyResponse(prompt, attachmentData, aiMsg, model);
  };

  const handleRegenerate = async (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    const lastUserMessageIndex = session.messages.map(m => m.role).lastIndexOf('user');
    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = session.messages[lastUserMessageIndex];
    if (!lastUserMessage) return;

    const model = lastUserMessage.model || 'gemini-2.5-flash';
    const aiMsg: ChatMessage = { clientId: (Date.now() + 1).toString(), session_id: sessionId, role: 'assistant', content: '', timestamp: Date.now(), isLoading: true, model };

    setChatSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages.slice(0, lastUserMessageIndex + 1), aiMsg] } : s));

    const attachments = lastUserMessage.attachments?.map(att => ({
        mimeType: att.type, data: att.dataUrl.split(',')[1],
    })) || [];
    
    await streamAndApplyResponse(lastUserMessage.content, attachments, aiMsg, model);
  };
  
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCreateCheckpoint = async (name: string) => {
    if (project && projectId) {
      try {
        const newCheckpoint = await projectService.createCheckpoint(projectId, name, project.files);
        setCheckpoints(prev => [newCheckpoint, ...prev]);
        const systemMsg: ChatMessage = {
          clientId: Date.now().toString(),
          session_id: activeSessionId!,
          role: 'system',
          content: `✅ Checkpoint "${name}" created.`,
          timestamp: Date.now(),
        };
        setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, systemMsg] } : s));
        await projectService.saveChatMessage(systemMsg);
      } catch (e: any) {
        setActionError(e.message);
      }
    }
  };
  
  const handleRestoreCheckpoint = (checkpoint: Checkpoint) => {
    if (project) {
      setProject({ ...project, files: checkpoint.files });
      setRefreshTrigger(p => p + 1);
      const systemMsg: ChatMessage = {
        clientId: Date.now().toString(),
        session_id: activeSessionId!,
        role: 'system',
        content: `⏪ Project restored to checkpoint "${checkpoint.name}".`,
        timestamp: Date.now(),
      };
      setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, systemMsg] } : s));
      projectService.saveChatMessage(systemMsg);
    }
  };

  const handleDeleteCheckpoint = async (checkpointId: string) => {
    try {
      await projectService.deleteCheckpoint(checkpointId);
      setCheckpoints(prev => prev.filter(c => c.id !== checkpointId));
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeSessionId) return;
    try {
      await projectService.deleteChatMessage(messageId);
      setChatSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, messages: s.messages.filter(m => m.id !== messageId) }
          : s
      ));
    } catch (error: any) {
      setActionError(error.message);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (chatSessions.length <= 1) {
      setActionError("Cannot delete the last chat session.");
      return;
    }
    try {
      await projectService.deleteChatSession(sessionId);
      const remainingSessions = chatSessions.filter(s => s.id !== sessionId);
      setChatSessions(remainingSessions);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remainingSessions[0]?.id || null);
      }
    } catch (error: any) {
      setActionError(error.message);
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
      updatedFiles[fullPath] = { path: fullPath, name: '.keep', content: '', type: 'markdown', lastModified: Date.now() };
    } else {
      const name = path.split('/').pop() || 'new-file';
      const ext = name.split('.').pop();
      let type: ProjectFile['type'] = 'html';
      if(ext === 'css') type = 'css'; else if(ext === 'js') type = 'javascript'; else if(ext === 'json') type = 'json';
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
  
  const getSaveStatusTitle = () => {
    switch(saveStatus) {
      case 'saving': return "Saving...";
      case 'saved': return "Saved successfully!";
      case 'error': return "Save failed!";
      case 'idle':
      default: return "Changes saved";
    }
  };

  const renderSaveStatus = () => {
    switch(saveStatus) {
      case 'saving': return <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin text-yellow-500" />;
      case 'saved': return <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />;
      case 'error': return <CloudOff className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500" />;
      case 'idle':
      default:
        return <Cloud className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500" />;
    }
  };

  // --- Draggable & Resizable Modal Logic ---
  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (isResizingRef.current && resizeHandleRef.current && modalRef.current) {
      const dx = clientX - dragStartPos.current.x;
      const dy = clientY - dragStartPos.current.y;
      
      let newWidth = initialModalState.current.width;
      let newHeight = initialModalState.current.height;
      let newX = initialModalState.current.x;
      let newY = initialModalState.current.y;
      
      const handle = resizeHandleRef.current;

      if (handle.includes('right')) newWidth = initialModalState.current.width + dx;
      if (handle.includes('bottom')) newHeight = initialModalState.current.height + dy;
      if (handle.includes('left')) {
        newWidth = initialModalState.current.width - dx;
        newX = initialModalState.current.x + dx;
      }
      if (handle.includes('top')) {
        newHeight = initialModalState.current.height - dy;
        newY = initialModalState.current.y + dy;
      }

      const minWidth = 400;
      const minHeight = 300;
      if (newWidth < minWidth) {
        if (handle.includes('left')) newX = initialModalState.current.x + initialModalState.current.width - minWidth;
        newWidth = minWidth;
      }
      if (newHeight < minHeight) {
        if (handle.includes('top')) newY = initialModalState.current.y + initialModalState.current.height - minHeight;
        newHeight = minHeight;
      }

      setModalSize({ width: newWidth, height: newHeight });
      setModalPosition({ x: newX, y: newY });

    } else if (isDraggingRef.current && modalRef.current) {
      let newX = clientX - dragOffset.current.x;
      let newY = clientY - dragOffset.current.y;
      
      const modalWidth = modalRef.current.offsetWidth;
      const modalHeight = modalRef.current.offsetHeight;
      
      newX = Math.max(16, Math.min(newX, window.innerWidth - modalWidth - 16));
      newY = Math.max(16, Math.min(newY, window.innerHeight - modalHeight - 16));
  
      setModalPosition({ x: newX, y: newY });
    }
  }, []);

  const handleEnd = useCallback(() => {
    isDraggingRef.current = false;
    isResizingRef.current = false;
    resizeHandleRef.current = null;
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleEnd);
    window.removeEventListener('touchmove', handleMove);
    window.removeEventListener('touchend', handleEnd);
    document.body.style.userSelect = '';
  }, [handleMove]);

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!modalRef.current) return;
    const isTouchEvent = 'touches' in e;
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;
    
    isDraggingRef.current = true;
    dragOffset.current = {
      x: clientX - modalRef.current.getBoundingClientRect().left,
      y: clientY - modalRef.current.getBoundingClientRect().top,
    };
    
    if (isTouchEvent) {
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    } else {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
    }
    
    document.body.style.userSelect = 'none';
  }, [handleMove, handleEnd]);
  
  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, handle: string) => {
    e.stopPropagation();
    isResizingRef.current = true;
    resizeHandleRef.current = handle;
    
    const isTouchEvent = 'touches' in e;
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;

    dragStartPos.current = { x: clientX, y: clientY };
    initialModalState.current = { ...modalPosition, ...modalSize };
    
    if (isTouchEvent) {
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    } else {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
    }
    
    document.body.style.userSelect = 'none';
  }, [modalPosition, modalSize, handleMove, handleEnd]);


  if (loading) return <div className="h-screen flex items-center justify-center bg-background text-white"><Loader2 className="animate-spin w-7 h-7 md:w-8 md:h-8"/></div>;

  if (loadError) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background text-red-400 p-4 md:p-6">
      <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 mb-3 md:mb-4"/>
      <h2 className="text-xl md:text-2xl font-bold text-white">Failed to Load Project</h2>
      <p className="text-sm md:text-base text-gray-400 mt-2 text-center">{loadError}</p>
      <Button onClick={() => navigate('/dashboard')} size="md" className="mt-6">
        Back to Dashboard
      </Button>
    </div>
  );
  
  if (!project) return null;

  return (
    <>
      <SEO 
        title={`Editor: ${project.name}`}
        description={`Live-edit ${project.name} with an integrated AI assistant, real-time preview, and a VS Code-like experience, all in your browser.`}
        keywords="code editor, AI coding assistant, live preview, web development IDE, WebBench"
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {isCheckpointModalOpen && (
        <CheckpointModal 
          isOpen={isCheckpointModalOpen}
          onClose={() => setIsCheckpointModalOpen(false)}
          checkpoints={checkpoints}
          onRestore={handleRestoreCheckpoint}
          onDelete={handleDeleteCheckpoint}
          onCreate={() => setIsCreateCheckpointModalOpen(true)}
        />
      )}
      {isCreateCheckpointModalOpen && (
        <ActionModal
          isOpen={true}
          config={{ type: 'createCheckpoint', project }}
          onClose={() => setIsCreateCheckpointModalOpen(false)}
          onConfirm={async (_, value) => {
            if (value) await handleCreateCheckpoint(value);
            setIsCreateCheckpointModalOpen(false);
          }}
        />
      )}

      {isChatModalOpen && (
        <div 
          ref={modalRef}
          style={{
            position: 'fixed',
            top: `${modalPosition.y}px`,
            left: `${modalPosition.x}px`,
            width: modalSize.width > 0 ? `${modalSize.width}px` : undefined,
            height: modalSize.height > 0 ? `${modalSize.height}px` : undefined,
            zIndex: 50,
          }}
          className="bg-sidebar border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
        >
          <AIChat 
            files={project.files} 
            sessions={chatSessions} 
            activeSessionId={activeSessionId} 
            onSendMessage={handleSendMessage} 
            onRegenerate={handleRegenerate} 
            onClose={() => setIsChatModalOpen(false)} 
            onOpenCheckpoints={() => setIsCheckpointModalOpen(true)} 
            onCreateCheckpoint={() => setIsCreateCheckpointModalOpen(true)}
            onCreateSession={handleCreateSession} 
            onSwitchSession={setActiveSessionId} 
            onCancel={handleCancelGeneration} 
            onDeleteMessage={handleDeleteMessage} 
            onDeleteSession={handleDeleteSession}
            onDragStart={handleDragStart}
            onResizeStart={handleResizeStart}
          />
        </div>
      )}

      <div className="h-screen flex flex-col bg-background text-gray-300 overflow-hidden transition-colors duration-300">
        <header className="h-9 md:h-10 bg-[#1e1e1e] border-b border-[#2b2b2b] flex items-center justify-between px-2 md:px-3 z-20 shrink-0 select-none">
          <div className="flex items-center gap-2 md:gap-3">
            {isMobile && (
              <div className="flex items-center gap-1">
                <button onClick={() => navigate('/dashboard')} className="hover:bg-active p-1 rounded text-gray-400 hover:text-white transition-colors" title="Back to Dashboard">
                    <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hover:bg-active p-1 rounded text-gray-400 hover:text-white transition-colors" title="Toggle Explorer">
                  <Menu className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {!isMobile && (
                <button onClick={() => navigate('/dashboard')} className="hover:bg-active p-1 rounded text-gray-400 hover:text-white transition-colors" title="Back to Dashboard">
                  <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              )}
              <span className="font-medium text-sm md:text-base text-gray-200 truncate max-w-[120px] md:max-w-[200px] lg:max-w-[300px]">{project.name}</span>
              <div className="w-4 h-4 flex items-center justify-center" title={getSaveStatusTitle()}>{renderSaveStatus()}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isMobile ? (
              <>
              <button onClick={() => { setMobileTab('preview'); setRefreshTrigger(p => p + 1); }} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${mobileTab === 'preview' ? 'text-accent' : 'text-gray-400'}`} title="Preview"><Play className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
              <button onClick={() => setIsChatModalOpen(true)} className={`p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400`} title="AI Assistant"><Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
              </>
            ) : (
              <button onClick={() => setShowPreview(!showPreview)} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${showPreview ? 'text-accent' : 'text-gray-400'}`} title="Toggle Preview Pane"><LayoutTemplate className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
            )}
            <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400" title="Settings">
              <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <div className="w-px h-4 bg-gray-600 mx-1"></div>
            <Button size="xs" className="flex items-center gap-1.5 md:h-8 md:px-3 md:text-sm" variant="secondary" onClick={downloadProject}><Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export</span></Button>
            <Button size="xs" className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 md:h-8 md:px-3 md:text-sm" onClick={() => forceSave()}><Save className="w-3.5 h-3.5" /><span className="hidden sm:inline">Save</span></Button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden relative">
          {actionError && (
             <div className="absolute top-3 right-3 z-[101] p-3 md:p-4 max-w-xs md:max-w-sm bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-2 md:gap-3 text-red-300 text-xs md:text-sm animate-fade-in shadow-2xl">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5 text-red-400" />
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="ml-auto p-1 rounded-full hover:bg-white/10">
                <X className="w-3.5 h-3.5 md:w-4 md:h-4"/>
              </button>
            </div>
          )}
          <div className="flex shrink-0">
              <div className={`w-10 md:w-12 bg-[#252526] border-r border-[#2b2b2b] flex-col items-center py-2 shrink-0 z-30 ${isMobile ? 'hidden' : 'flex'}`}>
                <button onClick={() => toggleSidebar('files')} className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center relative ${sidebarView === 'files' && isSidebarOpen ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`} title="Explorer"><Files className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" />{sidebarView === 'files' && isSidebarOpen && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent"></div>}</button>
                <button onClick={() => toggleSidebar('search')} className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center relative ${sidebarView === 'search' && isSidebarOpen ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`} title="Search"><Search className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" />{sidebarView === 'search' && isSidebarOpen && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent"></div>}</button>
                <button onClick={() => setIsChatModalOpen(true)} className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center relative text-gray-500 hover:text-gray-300`} title="AI Assistant"><Sparkles className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" /></button>
              </div>
              <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-56 md:w-64 lg:w-72' : 'w-0'} overflow-hidden`}>
                  <div className="w-56 md:w-64 lg:w-72 h-full bg-sidebar border-r border-border flex flex-col shrink-0">
                      {sidebarView === 'files' && <FileExplorer files={project.files} activeFile={activeFile} highlightedFiles={highlightedFiles} onFileSelect={handleFileSelect} onCreate={handleCreateFile} onRename={handleRenameFile} onDelete={handleDeleteFile} onDuplicate={handleDuplicateFile} isMobile={isMobile} />}
                      {sidebarView === 'search' && <div className="p-4 text-gray-500 text-sm text-center mt-10"><Search className="w-7 h-7 md:w-8 md:h-8 mx-auto mb-2 opacity-50" />Global search coming soon</div>}
                  </div>
              </div>
          </div>
          
          {isMobile && isSidebarOpen && (
            <div className="absolute top-0 left-0 h-full w-4/5 max-w-[280px] z-40 bg-sidebar border-r border-border flex flex-col animate-in slide-in-from-left-full duration-300">
              <FileExplorer files={project.files} activeFile={activeFile} highlightedFiles={highlightedFiles} onFileSelect={path => { handleFileSelect(path); setIsSidebarOpen(false); }} onCreate={handleCreateFile} onRename={handleRenameFile} onDelete={handleDeleteFile} onDuplicate={handleDuplicateFile} isMobile={isMobile} />
            </div>
          )}
          {isMobile && isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 bg-black/50 z-30 animate-in fade-in duration-300"></div>}
          
          <div className={`bg-background h-full flex flex-col min-w-0 ${isMobile ? (mobileTab === 'editor' ? 'flex flex-1 w-full' : 'hidden') : 'flex-1 relative'}`}>
            <CodeEditor files={project.files} activeFile={activeFile} openFiles={openFiles} onChange={handleFileChange} onCloseFile={handleCloseFile} onSelectFile={handleFileSelect} isMobile={isMobile} />
          </div>

          {((!isMobile && showPreview) || (isMobile && mobileTab === 'preview')) && (
            <div className={`bg-sidebar border-l border-border h-full flex flex-col transition-colors duration-300 ${isMobile ? 'w-full absolute inset-0 z-10' : 'md:w-2/5 lg:w-1/3 shrink-0 relative'}`}>
              {isMobile && <div className="h-9 flex items-center justify-between px-2 bg-[#1e1e1e] border-b border-[#333] shrink-0"><span className="text-xs font-bold text-gray-400 uppercase">Preview</span><button onClick={() => setMobileTab('editor')}><X className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400"/></button></div>}
              <Preview files={project.files} refreshTrigger={refreshTrigger} />
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Editor;
