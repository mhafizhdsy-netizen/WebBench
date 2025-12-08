
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project, File, PublishedProject } from '../types';
import { Button } from '../components/ui/Button';
import { CreateProjectModal } from '../components/dashboard/CreateProjectModal';
import { ShareModal } from '../components/dashboard/ShareModal';
import { ActionModal, ActionModalConfig } from '../components/dashboard/ActionModal';
import { SettingsModal } from '../components/dashboard/SettingsModal';
import { ProfileModal } from '../components/dashboard/ProfileModal';
import { CommunityProjectCard } from '../components/dashboard/CommunityProjectCard';
import { WebBenchLoader } from '../components/ui/Loader';
import { SEO } from '../components/ui/SEO';
import { Plus, FolderOpen, LogOut, Search, Clock, Trash2, Upload, Settings, Box, MoreVertical, Edit, Copy, AlertCircle, X, Share2, WandSparkles, Atom, AppWindow, ServerCog, FileCode2, Square, Globe, User, Loader2, Heart, Eye } from 'lucide-react';
import JSZip from 'jszip';

// New Logo Component
const WebBenchLogo = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" className="text-accent fill-accent/20" />
    <path d="M9.5 10l-2.5 2.5 2.5 2.5" className="text-white" />
    <path d="M14.5 10l2.5 2.5-2.5 2.5" className="text-white" />
  </svg>
);

// Map project types to icons
const ProjectIconMap: Record<string, React.FC<any>> = {
    'starter': WandSparkles,
    'react-vite': Atom,
    'nextjs': AppWindow,
    'laravel': ServerCog,
    'python': FileCode2,
    'php': FileCode2,
    'cpp': FileCode2,
    'blank': Square,
    'default': Box
};


const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'projects' | 'community'>('projects');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [communityProjects, setCommunityProjects] = useState<PublishedProject[]>([]);
  
  const [search, setSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [modalConfig, setModalConfig] = useState<ActionModalConfig | null>(null);
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ top: number, right: number } | null>(null);
  const [shareModalProject, setShareModalProject] = useState<Project | null>(null);
  
  // Publishing State
  const [publishModalProject, setPublishModalProject] = useState<Project | null>(null);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err: any) {
      console.error("Failed to fetch projects", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunityProjects = async () => {
    try {
        setLoading(true);
        const data = await projectService.getCommunityProjects();
        setCommunityProjects(data);
    } catch (err: any) {
        console.error("Failed to fetch community projects", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    // Check user and redirect
    const init = async () => {
        const user = await projectService.getCurrentUser();
        setCurrentUser(user);
        
        // Handle post-OAuth redirect
        const redirectPath = localStorage.getItem('redirect_path');
        if (redirectPath) {
          localStorage.removeItem('redirect_path');
          navigate(redirectPath, { replace: true });
        }
        fetchProjects();
    };
    init();
  }, []);
  
  useEffect(() => {
      if (activeTab === 'community') {
          fetchCommunityProjects();
      } else {
          fetchProjects();
      }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setActiveContextMenu(null);
        setContextMenuPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (activeContextMenu === projectId) {
      setActiveContextMenu(null);
      setContextMenuPosition(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setActiveContextMenu(projectId);
      setContextMenuPosition({ top: rect.bottom + 5, right: window.innerWidth - rect.right });
    }
  };

  const handleCreateProject = async (name: string, template: Project['type']) => {
    try {
      setError(null);
      const newProject = await projectService.createProject(name, template);
      navigate(`/editor/${newProject.id}`);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const importedFiles: Record<string, File> = {};
      const promises: Promise<void>[] = [];

      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          promises.push(
            zipEntry.async("string").then(content => {
              const path = '/' + relativePath; 
              let type: File['type'] = 'plaintext';
              if (path.endsWith('.html')) type = 'html';
              else if (path.endsWith('.css')) type = 'css';
              else if (path.endsWith('.js')) type = 'javascript';
              else if (path.endsWith('.json')) type = 'json';
              else if (path.match(/\.(jpg|jpeg|png|gif|svg)$/i)) type = 'image';

              importedFiles[path] = {
                path,
                name: path.split('/').pop() || 'unknown',
                type,
                content,
                lastModified: Date.now()
              };
            })
          );
        }
      });

      await Promise.all(promises);

      const projectName = file.name.replace(/\.zip$/i, "") || "Imported Project";
      const newProject = await projectService.createProject(projectName, 'blank'); // Imported projects are type 'blank'
      await projectService.updateProject(newProject.id, { files: importedFiles });
      navigate(`/editor/${newProject.id}`);

    } catch (err: any) {
      console.error("Import failed", err);
      setError(err.message || "Failed to import project. Please ensure it is a valid zip file.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmAction = async (config: ActionModalConfig, value?: string) => {
    try {
      setError(null);
      switch (config.type) {
        case 'rename':
          if (value && value !== config.project.name) {
            await projectService.renameProject(config.project.id, value);
            setProjects(projects.map(p => p.id === config.project.id ? { ...p, name: value, updatedAt: Date.now() } : p));
          }
          break;
        case 'duplicate':
          if (value) {
            const newProject = await projectService.createProject(value, config.project.type);
            await projectService.updateProject(newProject.id, { files: config.project.files });
            setProjects([newProject, ...projects]);
          }
          break;
        case 'delete':
          await projectService.deleteProject(config.project.id);
          setProjects(projects.filter(p => p.id !== config.project.id));
          break;
      }
    } catch (err: any) {
        setError(err.message || `Failed to ${config.type} project.`);
        console.error(err);
    }
  };

  const handlePublishProject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!publishModalProject || !publishTitle) return;
      setIsPublishing(true);
      try {
          await projectService.publishProject(publishModalProject, publishTitle, publishDesc, [publishModalProject.type || 'web']);
          setPublishModalProject(null);
          setActiveTab('community');
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsPublishing(false);
      }
  };

  const handleLogout = async () => {
    try {
      await projectService.signOut();
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredProjects = activeTab === 'projects' 
      ? projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      : communityProjects.filter(p => 
          p.title.toLowerCase().includes(search.toLowerCase()) || 
          p.description?.toLowerCase().includes(search.toLowerCase())
      );

  const getProjectIcon = (projectType: Project['type']) => {
    const Icon = ProjectIconMap[projectType || 'default'] || ProjectIconMap['default'];
    const colorClass = projectType === 'python' ? 'text-green-400' : 'text-accent';
    return <Icon className={`${colorClass} w-6 h-6 md:w-7 md:h-7`} />;
  };

  return (
    <>
      <SEO 
        title="Dashboard"
        description="Manage all your web development projects in one place. Create new projects, import from a zip, and access your AI-powered editor."
        keywords="web projects, dashboard, AI web builder, frontend development, new project"
      />

      {activeContextMenu && contextMenuPosition && (() => {
          const project = projects.find(p => p.id === activeContextMenu);
          if (!project) return null;
          return (
            <div 
              ref={contextMenuRef} 
              style={{ top: `${contextMenuPosition.top}px`, right: `${contextMenuPosition.right}px` }}
              className="fixed z-30 w-44 bg-[#2d2d30] border border-border rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95"
            >
                <button onClick={(e) => { e.stopPropagation(); setModalConfig({ type: 'rename', project }); setActiveContextMenu(null); setContextMenuPosition(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-active hover:text-white transition-colors"><Edit className="w-3.5 h-3.5"/>Rename</button>
                <button onClick={(e) => { e.stopPropagation(); setModalConfig({ type: 'duplicate', project }); setActiveContextMenu(null); setContextMenuPosition(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-active hover:text-white transition-colors"><Copy className="w-3.5 h-3.5"/>Duplicate</button>
                <button onClick={(e) => { e.stopPropagation(); setShareModalProject(project); setActiveContextMenu(null); setContextMenuPosition(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-2 text-gray-300 hover:bg-active hover:text-white transition-colors"><Share2 className="w-3.5 h-3.5"/>Share Link</button>
                <button onClick={(e) => { e.stopPropagation(); setPublishModalProject(project); setPublishTitle(project.name); setPublishDesc(''); setActiveContextMenu(null); setContextMenuPosition(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-2 text-accent hover:bg-active hover:text-white transition-colors"><Globe className="w-3.5 h-3.5"/>Publish to Community</button>
                <div className="my-1 h-px bg-border mx-1"></div>
                <button onClick={(e) => { e.stopPropagation(); setModalConfig({ type: 'delete', project }); setActiveContextMenu(null); setContextMenuPosition(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-2 text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5"/>Delete</button>
            </div>
          )
      })()}

      <div 
        className="h-screen w-full bg-background text-gray-300 overflow-y-auto flex flex-col custom-scrollbar"
        onScroll={() => {
            if (activeContextMenu) setActiveContextMenu(null);
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileImport} 
          accept=".zip" 
          className="hidden" 
        />

        <CreateProjectModal 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateProject}
        />
        
        <ActionModal
          isOpen={!!modalConfig}
          config={modalConfig}
          onClose={() => setModalConfig(null)}
          onConfirm={handleConfirmAction}
        />

        <ShareModal
            isOpen={!!shareModalProject}
            onClose={() => setShareModalProject(null)}
            project={shareModalProject}
        />

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
        
        <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            currentUser={currentUser}
        />
        
        {/* Publish Modal */}
        {publishModalProject && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-lg bg-sidebar border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h2 className="text-lg font-semibold text-white">Publish to Web Projects</h2>
                        <button onClick={() => setPublishModalProject(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                    </div>
                    <form onSubmit={handlePublishProject} className="p-6 space-y-4">
                        <p className="text-sm text-gray-400 mb-4">
                            Publishing <strong>{publishModalProject.name}</strong> will make a snapshot of your code public in the Community hub for others to see and learn from.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Project Title</label>
                            <input 
                                type="text"
                                value={publishTitle}
                                onChange={(e) => setPublishTitle(e.target.value)}
                                className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded px-3 py-2 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                            <textarea 
                                value={publishDesc}
                                onChange={(e) => setPublishDesc(e.target.value)}
                                className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded px-3 py-2 outline-none resize-none h-24"
                                placeholder="Describe your project..."
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                             <Button type="button" variant="secondary" onClick={() => setPublishModalProject(null)} disabled={isPublishing}>Cancel</Button>
                             <Button type="submit" disabled={isPublishing || !publishTitle.trim()}>
                                 {isPublishing && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Publish
                             </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Header */}
        <header className="h-14 border-b border-border bg-sidebar flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 transition-colors duration-300 shrink-0">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/dashboard')}>
            <WebBenchLogo />
            <span className="font-bold text-white text-lg tracking-tight hidden md:block">WebBench</span>
          </div>

          <div className="flex-1 max-w-md mx-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-accent transition-colors" />
              <input 
                type="text" 
                placeholder={activeTab === 'projects' ? "Search your projects..." : "Search community..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border focus:border-accent text-white rounded-lg pl-10 pr-4 py-2 text-sm outline-none transition-all duration-300 focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="icon" onClick={() => setIsProfileOpen(true)} title="Profile & Settings">
              {currentUser?.user_metadata?.avatar_url ? (
                  <img src={currentUser.user_metadata.avatar_url} alt="Profile" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                  <User className="w-5 h-5" />
              )}
            </Button>
            <Button variant="icon" onClick={handleLogout} title="Logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Tabs & Main Content */}
        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
          {error && (
            <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto p-1 rounded-full hover:bg-white/10">
                <X className="w-4 h-4"/>
              </button>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
             {/* Tab Switcher */}
            <div className="flex p-1 bg-[#252526] rounded-lg border border-border self-start">
                 <button 
                    onClick={() => setActiveTab('projects')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'projects' ? 'bg-accent text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                 >
                     Your Projects
                 </button>
                 <button 
                    onClick={() => setActiveTab('community')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'community' ? 'bg-accent text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                 >
                     Community
                 </button>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <Button onClick={handleImportClick} variant="secondary" size="sm" className="flex-1 md:flex-none justify-center gap-2" disabled={isImporting}>
                <Upload className="w-4 h-4" />
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
              <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="flex-1 md:flex-none justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <WebBenchLoader size="md" text={activeTab === 'projects' ? "Loading Projects..." : "Loading Community..."} />
            </div>
          ) : (
            <>
                {activeTab === 'projects' && (
                    projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-xl bg-sidebar/30">
                          <div className="w-20 h-20 bg-active rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <FolderOpen className="w-10 h-10 text-gray-500" />
                          </div>
                          <h3 className="text-xl font-medium text-white mb-2">No projects yet</h3>
                          <p className="text-sm text-gray-500 mb-8 text-center max-w-xs">Create your first project to start building the web with AI superpowers.</p>
                          <Button onClick={() => setIsCreateModalOpen(true)} size="md">Create Project</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProjects.map((project) => (
                                <div 
                                    key={project.id}
                                    onClick={() => navigate(`/editor/${project.id}`)}
                                    className="bg-sidebar border border-border rounded-xl p-5 hover:border-accent hover:shadow-xl hover:shadow-black/20 cursor-pointer group transition-all duration-300 relative"
                                >
                                    <button 
                                        onClick={(e) => toggleContextMenu(e, project.id)}
                                        className="absolute top-3 right-3 p-2 bg-background/50 hover:bg-active rounded-full text-gray-400 hover:text-white transition-colors backdrop-blur-sm z-10"
                                        aria-label="Project options"
                                        >
                                        <MoreVertical className="w-4 h-4" />
                                        </button>

                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-active to-background flex items-center justify-center border border-white/5 shadow-inner group-hover:scale-105 transition-transform duration-300">
                                        {getProjectIcon(project.type as any)}
                                        </div>
                                        <div className="overflow-hidden">
                                        <h3 className="text-lg font-semibold text-white truncate group-hover:text-accent transition-colors">{project.name}</h3>
                                        <p className="text-xs text-gray-500 truncate mt-1">ID: {project.id.slice(0, 8)}...</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-border mt-2">
                                        <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                        <span className="bg-active px-2.5 py-1 rounded-full text-gray-400 border border-white/5 group-hover:border-white/10 transition-colors">
                                        {Object.keys(project.files).length} files
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {activeTab === 'community' && (
                     (filteredProjects as PublishedProject[]).length === 0 ? (
                        <div className="text-center py-20 bg-[#252526] rounded-xl border border-border">
                            <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-white">No community projects found</h2>
                            <p className="text-gray-500 mt-2">Be the first to publish a project!</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(filteredProjects as PublishedProject[]).map((project) => (
                                <CommunityProjectCard 
                                    key={project.id}
                                    project={project}
                                    onClick={() => navigate(`/community/${project.id}`)}
                                />
                            ))}
                        </div>
                     )
                )}
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default Dashboard;
