import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project, File } from '../types';
import { Button } from '../components/ui/Button';
import { CreateProjectModal } from '../components/dashboard/CreateProjectModal';
import { ActionModal, ActionModalConfig } from '../components/dashboard/ActionModal';
import { SettingsModal } from '../components/dashboard/SettingsModal';
import { WebBenchLoader } from '../components/ui/Loader';
import { SEO } from '../components/ui/SEO';
import { Plus, FolderOpen, LogOut, Search, Clock, Trash2, Upload, Code2, Settings, LayoutTemplate, Box, GitBranch, Database, Cpu, Layers, MoreVertical, Edit, Copy, AlertCircle, X } from 'lucide-react';
import JSZip from 'jszip';

// New Logo Component
const WebBenchLogo = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" className="text-accent fill-accent/20" />
    <path d="M9.5 10l-2.5 2.5 2.5 2.5" className="text-white" />
    <path d="M14.5 10l2.5 2.5-2.5 2.5" className="text-white" />
  </svg>
);

// Array of icons for projects
const ProjectIcons = [
  Code2,
  LayoutTemplate,
  Box,
  GitBranch,
  Database,
  Cpu,
  Layers
];


const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<ActionModalConfig | null>(null);
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      setError(null);
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err: any) {
      console.error("Failed to fetch projects", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setActiveContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateProject = async (name: string, template: 'blank' | 'starter') => {
    try {
      setError(null);
      const files = template === 'blank' ? {} : undefined;
      const newProject = await projectService.createProject(name, files);
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
      const newProject = await projectService.createProject(projectName, importedFiles);
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
            const newProject = await projectService.createProject(value, config.project.files);
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

  const handleLogout = async () => {
    try {
      await projectService.signOut();
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getProjectIcon = (projectId: string) => {
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
        const char = projectId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    const iconIndex = Math.abs(hash) % ProjectIcons.length;
    return React.createElement(ProjectIcons[iconIndex], { className: "text-accent w-6 h-6 md:w-7 md:h-7" });
  };

  return (
    <>
      <SEO 
        title="Dashboard"
        description="Manage all your web development projects in one place. Create new projects, import from a zip, and access your AI-powered editor."
        keywords="web projects, dashboard, AI web builder, frontend development, new project"
      />
      <div className="min-h-screen bg-background text-gray-300">
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

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Header */}
        <header className="h-12 md:h-14 border-b border-border bg-sidebar flex items-center justify-between px-3 md:px-4 lg:px-8 sticky top-0 z-20 transition-colors duration-300">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center transition-transform group-hover:scale-105">
              <WebBenchLogo />
            </div>
            <span className="font-bold text-white text-base md:text-lg tracking-tight hidden md:block">WebBench</span>
          </div>

          <div className="flex-1 max-w-xs md:max-w-md mx-2 md:mx-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 group-focus-within:text-accent transition-colors" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border focus:border-accent text-white rounded-lg pl-9 pr-3 py-1.5 text-xs md:pl-10 md:pr-4 md:py-2 md:text-sm outline-none transition-all duration-300 focus:ring-1 focus:ring-accent/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="icon" onClick={() => setIsSettingsOpen(true)} title="Settings">
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
            <Button variant="icon" onClick={handleLogout} title="Logout">
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-3 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {error && (
            <div className="p-3 md:p-4 mb-4 md:mb-6 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 md:gap-3 text-red-400 text-xs md:text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto p-1 rounded-full hover:bg-white/10">
                <X className="w-3.5 h-3.5 md:w-4 md:h-4"/>
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white">Your Projects</h2>
            <div className="flex gap-2 md:gap-3">
              <Button onClick={handleImportClick} variant="secondary" size="xs" className="gap-1.5 md:gap-2 md:h-8 md:px-3 md:text-sm" disabled={isImporting}>
                <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
              <Button onClick={() => setIsCreateModalOpen(true)} size="xs" className="gap-1.5 md:gap-2 md:h-8 md:px-3 md:text-sm shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all">
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                New Project
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <WebBenchLoader size="md" text="Loading Projects..." />
            </div>
          ) : projects.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center py-10 md:py-20 border border-dashed border-border rounded-xl bg-sidebar/30">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-active rounded-full flex items-center justify-center mb-4 md:mb-6 animate-pulse">
                <FolderOpen className="w-8 h-8 md:w-10 md:h-10 text-gray-500" />
              </div>
              <h3 className="text-lg md:text-xl font-medium text-white mb-1 md:mb-2">No projects yet</h3>
              <p className="text-xs md:text-sm text-gray-500 mb-6 md:mb-8 text-center max-w-xs">Create your first project to start building the web with AI superpowers.</p>
              <Button onClick={() => setIsCreateModalOpen(true)} size="md">Create Project</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => navigate(`/editor/${project.id}`)}
                  className="bg-sidebar border border-border rounded-xl p-4 md:p-5 hover:border-accent hover:shadow-xl hover:shadow-black/20 cursor-pointer group transition-all duration-300 relative overflow-hidden"
                >
                  <button 
                      onClick={(e) => { e.stopPropagation(); setActiveContextMenu(activeContextMenu === project.id ? null : project.id); }}
                      className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 md:p-2 bg-background/50 hover:bg-active rounded-full text-gray-400 hover:text-white transition-colors backdrop-blur-sm z-10"
                      aria-label="Project options"
                    >
                      <MoreVertical className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>

                  {activeContextMenu === project.id && (
                      <div ref={contextMenuRef} className="absolute top-10 right-2 md:top-12 md:right-3 z-20 w-36 md:w-40 bg-[#2d2d30] border border-border rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95">
                        <button onClick={(e) => { e.stopPropagation(); setModalConfig({ type: 'rename', project }); setActiveContextMenu(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-1.5 md:gap-2 text-gray-300 hover:bg-active hover:text-white transition-colors"><Edit className="w-3 h-3 md:w-3.5 md:h-3.5"/>Rename</button>
                        <button onClick={(e) => { e.stopPropagation(); setModalConfig({ type: 'duplicate', project }); setActiveContextMenu(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-1.5 md:gap-2 text-gray-300 hover:bg-active hover:text-white transition-colors"><Copy className="w-3 h-3 md:w-3.5 md:h-3.5"/>Duplicate</button>
                        <div className="my-1 h-px bg-border mx-1"></div>
                        <button onClick={(e) => { e.stopPropagation(); setModalConfig({ type: 'delete', project }); setActiveContextMenu(null); }} className="w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-1.5 md:gap-2 text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5"/>Delete</button>
                      </div>
                    )}

                  <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-active to-background flex items-center justify-center border border-white/5 shadow-inner group-hover:scale-105 transition-transform duration-300">
                      {getProjectIcon(project.id)}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-base font-semibold text-white truncate group-hover:text-accent transition-colors md:text-lg">{project.name}</h3>
                      <p className="text-xs text-gray-500 truncate mt-0.5 md:mt-1">ID: {project.id.slice(0, 8)}...</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 md:pt-4 border-t border-border mt-1 md:mt-2">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <span className="bg-active px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-gray-400 border border-white/5 group-hover:border-white/10 transition-colors">
                      {Object.keys(project.files).length} files
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Dashboard;