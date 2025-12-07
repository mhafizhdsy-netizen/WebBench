import React, { useState, useEffect, useMemo } from 'react';
import { Project, File as ProjectFile, Checkpoint } from '../../types';
import { Button } from '../ui/Button';
import { GitBranch, Github, RefreshCw, UploadCloud, Check, Loader2, Play, Box, Download, FilePlus, FileDiff, FileMinus, User, X } from 'lucide-react';
import JSZip from 'jszip';
import { DiffEditor } from '@monaco-editor/react';
import { useSettings } from '../../context/ThemeContext';

interface GitPanelProps {
  project: Project;
  checkpoints: Checkpoint[];
  onCreateCheckpoint: (message: string, files?: Record<string, ProjectFile>) => Promise<void>;
  onRefresh: () => void;
}

interface DiffTarget {
    path: string;
    originalContent: string;
    modifiedContent: string;
    language: string;
}

export const GitPanel: React.FC<GitPanelProps> = ({ project, checkpoints, onCreateCheckpoint, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'source' | 'github'>('source');
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pullLoading, setPullLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [diffTarget, setDiffTarget] = useState<DiffTarget | null>(null);
  const { currentTheme } = useSettings();
  
  // GitHub State
  const [githubToken, setGithubToken] = useState('');
  const [repoName, setRepoName] = useState(project.name.toLowerCase().replace(/\s+/g, '-'));
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [isRepoInit, setIsRepoInit] = useState(checkpoints.length > 0);
  
  // Staging State
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());

  // Calculate changes (Diff)
  const changes = useMemo(() => {
    const headFiles = checkpoints[0]?.files || {};
    const currentFiles = project.files;
    const allPaths = Array.from(new Set([...Object.keys(headFiles), ...Object.keys(currentFiles)]));
    
    const detectedChanges: { path: string; status: 'A' | 'M' | 'D' }[] = [];

    allPaths.forEach(path => {
        // Skip .keep files if preferred, but usually they are needed for folders
        const inHead = !!headFiles[path];
        const inCurrent = !!currentFiles[path];

        if (inCurrent && !inHead) {
            detectedChanges.push({ path, status: 'A' });
        } else if (!inCurrent && inHead) {
            detectedChanges.push({ path, status: 'D' });
        } else if (inCurrent && inHead && currentFiles[path].content !== headFiles[path].content) {
            detectedChanges.push({ path, status: 'M' });
        }
    });
    
    return detectedChanges.sort((a, b) => a.path.localeCompare(b.path));
  }, [project.files, checkpoints]);

  useEffect(() => {
     if (stagedFiles.size === 0 && changes.length > 0) {
         setStagedFiles(new Set(changes.map(c => c.path)));
     } else {
         const currentChangePaths = new Set(changes.map(c => c.path));
         const cleanedStaged = new Set(Array.from(stagedFiles).filter(p => currentChangePaths.has(p)));
         if (cleanedStaged.size !== stagedFiles.size) {
             setStagedFiles(cleanedStaged);
         }
     }
     
     if (checkpoints.length > 0) {
         setIsRepoInit(true);
     }
  }, [changes, checkpoints.length]);

  const toggleFileStage = (path: string) => {
      const newStaged = new Set(stagedFiles);
      if (newStaged.has(path)) {
          newStaged.delete(path);
      } else {
          newStaged.add(path);
      }
      setStagedFiles(newStaged);
  };

  const getLanguage = (path: string) => {
      const ext = path.split('.').pop() || '';
      switch (ext) {
          case 'html': return 'html';
          case 'css': return 'css';
          case 'js': return 'javascript';
          case 'ts': return 'typescript';
          case 'tsx': return 'typescript';
          case 'json': return 'json';
          case 'py': return 'python';
          case 'php': return 'php';
          default: return 'plaintext';
      }
  };

  const openDiff = (path: string) => {
      const headFiles = checkpoints[0]?.files || {};
      const originalContent = headFiles[path]?.content || '';
      const modifiedContent = project.files[path]?.content || '';
      
      setDiffTarget({
          path,
          originalContent,
          modifiedContent,
          language: getLanguage(path)
      });
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const headFiles = checkpoints[0]?.files || {};
      const newCommitFiles: Record<string, ProjectFile> = { ...headFiles };
      
      stagedFiles.forEach(path => {
          const change = changes.find(c => c.path === path);
          if (!change) return;

          if (change.status === 'A' || change.status === 'M') {
             if (project.files[path]) {
                 newCommitFiles[path] = project.files[path];
             }
          } else if (change.status === 'D') {
             delete newCommitFiles[path];
          }
      });

      await onCreateCheckpoint(commitMessage, newCommitFiles);
      setCommitMessage('');
      setStagedFiles(new Set());
      setSuccess('Changes committed to local history.');
      setTimeout(() => setSuccess(null), 3000);
      setIsRepoInit(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!githubToken.trim()) {
        setError("Please provide a GitHub Personal Access Token.");
        return;
    }
    setPushLoading(true);
    setError(null);
    setSuccess(null);

    try {
        if (!githubToken.startsWith('ghp_') && !githubToken.startsWith('github_pat_')) {
             throw new Error("Invalid GitHub Personal Access Token format. Must start with 'ghp_' or 'github_pat_'.");
        }

        const createRepoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                name: repoName,
                description: `Created with WebBench AI`,
                private: false,
                auto_init: true
            })
        });

        if (!createRepoResponse.ok) {
            const errData = await createRepoResponse.json();
            if (createRepoResponse.status !== 422) {
                throw new Error(`GitHub Error: ${errData.message}`);
            }
        }
        
        const userData = await fetch('https://api.github.com/user', {
             headers: { 'Authorization': `token ${githubToken}` }
        }).then(r => r.json());
        
        const owner = userData.login;
        const currentRemote = `https://github.com/${owner}/${repoName}`;

        const latestCheckpoint = checkpoints[0];
        if (!latestCheckpoint && isRepoInit) {
            throw new Error("No commits to push. Please commit your changes first.");
        }
        
        const filesToUpload = (latestCheckpoint 
            ? Object.values(latestCheckpoint.files) 
            : Object.values(project.files)) as ProjectFile[];
            
        let uploadedCount = 0;
        
        for (const file of filesToUpload) {
            if (file.name === '.keep') continue;
            
            const path = file.path.startsWith('/') ? file.path.substring(1) : file.path;
            const content = file.type === 'image' ? file.content : btoa(unescape(encodeURIComponent(file.content)));
            
            let sha = undefined;
            try {
                const existing = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${path}`, {
                     headers: { 'Authorization': `token ${githubToken}` }
                });
                if (existing.ok) {
                    const data = await existing.json();
                    sha = data.sha;
                }
            } catch (e) {}

            await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: commitMessage || `Update ${path} from WebBench`,
                    content: content,
                    sha: sha
                })
            });
            uploadedCount++;
        }

        setRemoteUrl(currentRemote);
        setSuccess(`Successfully pushed ${uploadedCount} files to ${repoName}!`);
    } catch (err: any) {
        setError(err.message || "Failed to push to GitHub.");
    } finally {
        setPushLoading(false);
    }
  };

  const handlePullFromGithub = async () => {
    if (!githubToken.trim()) {
        setError("Please provide a GitHub Personal Access Token.");
        return;
    }
    
    // Attempt to infer owner from userData
    setPullLoading(true);
    setError(null);
    try {
         const userData = await fetch('https://api.github.com/user', {
             headers: { 'Authorization': `token ${githubToken}` }
        }).then(r => r.json());
        const owner = userData.login;
        
        // Fetch archive link (zip)
        const zipResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/zipball/main`, {
             headers: { 'Authorization': `token ${githubToken}` }
        });

        if (!zipResponse.ok) {
             throw new Error("Failed to fetch repository archive. Ensure the repo exists and you have access.");
        }

        const blob = await zipResponse.blob();
        const zip = await JSZip.loadAsync(blob);
        
        const newFiles: Record<string, ProjectFile> = {};
        const promises: Promise<void>[] = [];
        
        // Unzip and flatten (GitHub adds a root folder hash we need to strip)
        zip.forEach((relativePath, zipEntry) => {
             if (!zipEntry.dir) {
                 promises.push(zipEntry.async('string').then(content => {
                     // Strip first folder
                     const parts = relativePath.split('/');
                     if (parts.length > 1) {
                         const cleanPath = '/' + parts.slice(1).join('/');
                         let type: ProjectFile['type'] = 'plaintext';
                         if (cleanPath.endsWith('.html')) type = 'html';
                         else if (cleanPath.endsWith('.css')) type = 'css';
                         else if (cleanPath.endsWith('.js')) type = 'javascript';
                         else if (cleanPath.endsWith('.ts')) type = 'typescript';
                         else if (cleanPath.endsWith('.json')) type = 'json';
                         
                         newFiles[cleanPath] = {
                             path: cleanPath,
                             name: cleanPath.split('/').pop() || 'unknown',
                             type,
                             content,
                             lastModified: Date.now()
                         };
                     }
                 }));
             }
        });
        
        await Promise.all(promises);
        
        // Create a merge commit checkpoint
        await onCreateCheckpoint(`Merge branch 'main' of ${repoName}`, newFiles);
        setSuccess("Repository pulled and merged successfully.");
        onRefresh();

    } catch (err: any) {
        setError(err.message || "Failed to pull from GitHub.");
    } finally {
        setPullLoading(false);
    }
  };

  const getStatusIcon = (status: 'A' | 'M' | 'D') => {
      switch(status) {
          case 'A': return <FilePlus className="w-3.5 h-3.5 text-green-400" />;
          case 'M': return <FileDiff className="w-3.5 h-3.5 text-blue-400" />;
          case 'D': return <FileMinus className="w-3.5 h-3.5 text-red-400" />;
      }
  };

  const getStatusLabel = (status: 'A' | 'M' | 'D') => {
      switch(status) {
          case 'A': return 'New File';
          case 'M': return 'Modified';
          case 'D': return 'Deleted';
      }
  };

  return (
    <div className="h-full flex flex-col bg-sidebar text-gray-300 relative">
        {/* Diff Modal */}
        {diffTarget && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-full max-w-6xl h-[85vh] bg-[#1e1e1e] border border-[#3e3e42] rounded-lg shadow-2xl flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b border-[#3e3e42] bg-[#252526] shrink-0">
                         <div className="flex items-center gap-3">
                            <GitBranch className="w-5 h-5 text-accent" />
                            <span className="font-mono text-sm text-gray-300 truncate max-w-md" title={diffTarget.path}>{diffTarget.path}</span>
                            <span className="text-xs text-gray-500">(Working Tree vs Last Commit)</span>
                        </div>
                        <button onClick={() => setDiffTarget(null)} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 min-h-0">
                        <DiffEditor
                            original={diffTarget.originalContent}
                            modified={diffTarget.modifiedContent}
                            language={diffTarget.language}
                            theme={currentTheme}
                            options={{
                                readOnly: true,
                                fontSize: 13,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                renderSideBySide: true,
                                originalEditable: false
                            }}
                        />
                    </div>
                    <div className="p-2 border-t border-[#3e3e42] bg-[#252526] flex justify-end">
                        <Button onClick={() => setDiffTarget(null)} variant="secondary" size="sm">Close Diff</Button>
                    </div>
                </div>
            </div>
        )}

        {/* Header Tabs */}
        <div className="flex items-center border-b border-border shrink-0">
            <button 
                onClick={() => setActiveTab('source')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'source' ? 'border-accent text-white bg-active/50' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                <GitBranch className="w-3.5 h-3.5" /> Source
            </button>
            <button 
                onClick={() => setActiveTab('github')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'github' ? 'border-accent text-white bg-active/50' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                <Github className="w-3.5 h-3.5" /> Remote
            </button>
            <button onClick={onRefresh} className="p-2 text-gray-400 hover:text-white border-l border-border" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
            </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            
            {activeTab === 'source' && (
                <>
                    {!isRepoInit ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center space-y-3">
                            <Box className="w-10 h-10 text-gray-600" />
                            <p className="text-sm text-gray-400">No Git repository found.</p>
                            <Button onClick={() => setIsRepoInit(true)} size="sm">Initialize Repository</Button>
                        </div>
                    ) : (
                        <>
                            {/* Message Input */}
                            <div className="mb-4">
                                <textarea 
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    placeholder="Commit message (e.g. 'feat: add login page')"
                                    className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded p-2 text-xs outline-none resize-none h-16 mb-2"
                                />
                                <Button 
                                    onClick={handleCommit} 
                                    disabled={!commitMessage.trim() || loading || stagedFiles.size === 0} 
                                    size="sm" 
                                    className="w-full justify-center"
                                >
                                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2"/> : <Check className="w-3.5 h-3.5 mr-2" />}
                                    Commit
                                </Button>
                            </div>

                            {/* Staged Changes */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">
                                    <span className="flex items-center gap-1"><Play className="w-3 h-3 rotate-90"/> Staged Changes</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setStagedFiles(new Set())} className="text-[10px] text-accent hover:underline">Unstage All</button>
                                        <span className="bg-accent text-white px-1.5 rounded-full">{stagedFiles.size}</span>
                                    </div>
                                </div>
                                {changes.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic pl-2">No changes detected.</p>
                                ) : (
                                    <div className="space-y-1">
                                        {changes.map(({ path, status }) => (
                                            <div 
                                                key={path} 
                                                className="flex items-center gap-2 hover:bg-active/50 p-1.5 rounded group cursor-pointer border border-transparent hover:border-border transition-colors" 
                                                onClick={() => openDiff(path)}
                                                title="Click to view diff"
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={stagedFiles.has(path)} 
                                                    onChange={() => toggleFileStage(path)}
                                                    className="accent-accent cursor-pointer"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span className={`text-xs truncate flex-1 font-mono ${stagedFiles.has(path) ? 'text-gray-200' : 'text-gray-500'}`}>{path}</span>
                                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                    status === 'A' ? 'text-green-400 bg-green-500/10' : 
                                                    status === 'M' ? 'text-blue-400 bg-blue-500/10' : 
                                                    'text-red-400 bg-red-500/10'
                                                }`}>
                                                    {getStatusIcon(status)}
                                                    <span>{getStatusLabel(status)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* History */}
                            <div>
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold border-t border-border pt-4">
                                    <span>History</span>
                                </div>
                                <div className="space-y-3 relative">
                                    <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-700"></div>
                                    {checkpoints.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic pl-4">No commits yet.</p>
                                    ) : (
                                        checkpoints.map(cp => (
                                            <div key={cp.id} className="relative pl-6 group">
                                                <div className="absolute left-1 top-2 w-3 h-3 rounded-full bg-sidebar border-2 border-gray-500 group-hover:border-accent group-hover:bg-accent z-10 transition-colors"></div>
                                                <div className="bg-[#2d2d30] p-2.5 rounded border border-border flex flex-col gap-1.5 hover:border-gray-500 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-sm text-white font-medium truncate leading-tight">{cp.name}</span>
                                                        <span className="text-[10px] font-mono text-gray-500 bg-black/20 px-1 rounded">#{cp.id.slice(0,6)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs text-gray-400">
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3 h-3" />
                                                            <span>You</span>
                                                        </div>
                                                        <span>{new Date(cp.createdAt).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {activeTab === 'github' && (
                <div className="space-y-4">
                    <div className="bg-active/30 p-3 rounded-lg border border-border">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Github className="w-4 h-4"/> GitHub Sync</h3>
                        <p className="text-xs text-gray-400 mb-3">Push/Pull project files with a GitHub repository.</p>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-400 mb-1 block">Repository Name</label>
                                <input 
                                    type="text"
                                    value={repoName}
                                    onChange={(e) => setRepoName(e.target.value)}
                                    className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded px-2 py-1.5 text-xs outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-400 mb-1 block">
                                    Personal Access Token <a href="https://github.com/settings/tokens" target="_blank" className="text-accent hover:underline">(Get Token)</a>
                                </label>
                                <input 
                                    type="password"
                                    value={githubToken}
                                    onChange={(e) => setGithubToken(e.target.value)}
                                    placeholder="ghp_..."
                                    className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded px-2 py-1.5 text-xs outline-none"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Token must have 'repo' scope.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handlePullFromGithub} disabled={pullLoading || pushLoading} size="sm" variant="secondary" className="flex-1 justify-center">
                                    {pullLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2"/> : <Download className="w-3.5 h-3.5 mr-2" />}
                                    Pull
                                </Button>
                                <Button onClick={handlePushToGithub} disabled={pushLoading || pullLoading} size="sm" className="flex-1 justify-center">
                                    {pushLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2"/> : <UploadCloud className="w-3.5 h-3.5 mr-2" />}
                                    Push
                                </Button>
                            </div>
                        </div>
                    </div>

                    {remoteUrl && (
                        <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg animate-fade-in">
                            <p className="text-xs text-green-400 font-bold mb-1">Repository Connected!</p>
                            <a href={remoteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline break-all flex items-center gap-1">
                                {remoteUrl} <Github className="w-3 h-3"/>
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Global Messages */}
        {(error || success) && (
            <div className="p-3 border-t border-border bg-[#1e1e1e]">
                {error && (
                    <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
                        <Box className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="flex items-start gap-2 text-green-400 text-xs bg-green-500/10 p-2 rounded border border-green-500/20">
                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{success}</span>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};