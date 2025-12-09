

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project, File, PublishedProject } from '../types';
import { Button } from '../components/ui/Button';
import { WebBenchLoader } from '../components/ui/Loader';
import { SEO } from '../components/ui/SEO';
import { 
  Download, Edit, ArrowLeft, Clock, FileCode2, 
  AlertTriangle, Twitter, Linkedin, Copy, Check, 
  Layers, Code2, Globe, Terminal, Share2, FileText,
  Hash, Database, Calendar, Eye, User, Heart, MessageSquare
} from 'lucide-react';
import JSZip from 'jszip';
import { supabase } from '../services/supabaseClient';

// --- Helper Components for UI ---

const WebBenchLogo = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" className="text-accent fill-accent/20" />
      <path d="M9.5 10l-2.5 2.5 2.5 2.5" className="text-white" />
      <path d="M14.5 10l2.5 2.5-2.5 2.5" className="text-white" />
    </svg>
);

const AtomIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" />
        <path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" />
    </svg>
);

const TechBadge: React.FC<{ type: string }> = ({ type }) => {
    let icon = <FileText className="w-3 h-3" />;
    let label = type.toUpperCase();
    let colorClass = "bg-[#2d2d30] text-gray-400 border-gray-700"; 

    if (type === 'react-vite' || type === 'tsx' || type === 'jsx') {
        icon = <AtomIcon className="w-3 h-3" />;
        label = "REACT";
        colorClass = "bg-[#2d2d30] text-[#61dafb] border-[#61dafb]/30";
    } else if (type === 'typescript' || type === 'ts') {
        icon = <Code2 className="w-3 h-3" />;
        label = "TYPESCRIPT";
        colorClass = "bg-[#2d2d30] text-[#3178c6] border-[#3178c6]/30";
    } else if (type === 'javascript' || type === 'js') {
        icon = <Code2 className="w-3 h-3" />;
        label = "JAVASCRIPT";
        colorClass = "bg-[#2d2d30] text-[#f7df1e] border-[#f7df1e]/30";
    } else if (type === 'html') {
        icon = <Globe className="w-3 h-3" />;
        label = "HTML5";
        colorClass = "bg-[#2d2d30] text-[#e34c26] border-[#e34c26]/30";
    } else if (type === 'css') {
        icon = <Layers className="w-3 h-3" />;
        label = "CSS3";
        colorClass = "bg-[#2d2d30] text-[#264de4] border-[#264de4]/30";
    } else if (type === 'python' || type === 'py') {
        icon = <Terminal className="w-3 h-3" />;
        label = "PYTHON";
        colorClass = "bg-[#2d2d30] text-[#3572a5] border-[#3572a5]/30";
    }

    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-semibold tracking-wide ${colorClass}`}>
            {icon}
            {label}
        </div>
    );
};

interface SharePageProps {
    isPublished?: boolean;
}

const SharePage: React.FC<SharePageProps> = ({ isPublished = false }) => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    
    // Union type for the project data we render
    const [project, setProject] = useState<Project | PublishedProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [copyStatus, setCopyStatus] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>('about:blank');

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            if (!projectId) {
                setError("No project ID provided.");
                setLoading(false);
                return;
            }

            try {
                const { data: { session } } = await supabase.auth.getSession();
                setIsLoggedIn(!!session);

                if (isPublished) {
                    // Fetch from public table
                    const data = await projectService.getPublishedProject(projectId);
                    if (!data) throw new Error("Published project not found.");
                    setProject(data);
                } else {
                    // Fetch from private table (requires auth + permission)
                    if (session) {
                        const data = await projectService.getProject(projectId);
                        setProject(data);
                    }
                }
            } catch (err: any) {
                if (isPublished) {
                     setError(err.message || "Failed to load community project.");
                } else if (await supabase.auth.getUser().then(r => r.data.user)) {
                     setError(err.message || "Failed to load project details.");
                }
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndFetch();
    }, [projectId, isPublished]);

    useEffect(() => {
        if (!project) return;
        
        const buildPreview = () => {
            const htmlFile = (Object.values(project.files) as File[]).find(f => f.name.endsWith('.html'));
            
            if (!htmlFile) {
                setPreviewUrl('about:blank');
                return () => {};
            }

            let content = htmlFile.content;
            const blobUrls: string[] = [];

            const resolvePath = (base: string, relative: string) => {
                if (relative.startsWith('/')) return relative;
                const stack = base.split('/').slice(0, -1);
                const parts = relative.split('/');
                for (const part of parts) {
                    if (part === '.') continue;
                    if (part === '..') stack.pop();
                    else stack.push(part);
                }
                return stack.join('/') || '/';
            }

            content = content.replace(/<link[^>]+href=["']([^"']+)["'][^>]*>/g, (match, href) => {
                if (href.startsWith('http') || href.startsWith('//')) return match;
                const absPath = resolvePath(htmlFile.path, href);
                const file = project.files[absPath];
                if (file) {
                    const blob = new Blob([file.content], { type: 'text/css' });
                    const url = URL.createObjectURL(blob);
                    blobUrls.push(url);
                    return match.replace(href, url);
                }
                return match;
            });

            content = content.replace(/<script[^>]+src=["']([^"']+)["'][^>]*>/g, (match, src) => {
                if (src.startsWith('http') || src.startsWith('//')) return match;
                const absPath = src.startsWith('/') ? src : resolvePath(htmlFile.path, src);
                const file = project.files[absPath];
                if (file) {
                    const blob = new Blob([file.content], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    blobUrls.push(url);
                    return match.replace(src, url);
                }
                return match;
            });
            
             content = content.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/g, (match, src) => {
                if (src.startsWith('http') || src.startsWith('//') || src.startsWith('data:')) return match;
                 const absPath = src.startsWith('/') ? src : resolvePath(htmlFile.path, src);
                 const file = project.files[absPath];
                 if (file && file.type === 'image') {
                     const dataUri = file.content.startsWith('data:') ? file.content : `data:image/png;base64,${file.content}`; 
                     return match.replace(src, dataUri);
                 }
                 return match;
            });
            
             const interceptorScript = `
                <script>
                    document.addEventListener('click', (e) => {
                        let target = e.target;
                        while (target && target.tagName !== 'A') { target = target.parentElement; }
                        if (target && target.tagName === 'A') {
                            const href = target.getAttribute('href');
                            if (href && !href.startsWith('#')) {
                                e.preventDefault();
                                console.log("Navigation prevented in preview");
                            }
                        }
                    });
                </script>
            `;
            
            if (content.includes('</body>')) {
                content = content.replace('</body>', `${interceptorScript}</body>`);
            } else {
                content += interceptorScript;
            }

            const finalBlob = new Blob([content], { type: 'text/html' });
            const finalUrl = URL.createObjectURL(finalBlob);
            
            setPreviewUrl(finalUrl);

            return () => {
                blobUrls.forEach(url => URL.revokeObjectURL(url));
                URL.revokeObjectURL(finalUrl);
            };
        };

        const cleanup = buildPreview();
        return cleanup;

    }, [project]);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    const handleDownload = async () => {
        if (!project) return;
        const zip = new JSZip();
        Object.values(project.files).forEach((file: File) => {
            const path = file.path.startsWith('/') ? file.path.substring(1) : file.path;
            if(file.name !== '.keep') zip.file(path, file.content);
        });
        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        const projectName = 'title' in project ? project.title : project.name;
        a.download = `${projectName}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleFork = async () => {
        if (!project) return;
        try {
            const projectName = 'title' in project ? project.title : project.name;
            const type = project.type || 'starter';
            const newProject = await projectService.createProject(`${projectName} (Fork)`, type);
            await projectService.updateProject(newProject.id, { files: project.files });
            navigate(`/editor/${newProject.id}`);
        } catch (e: any) {
            alert("Failed to fork project: " + e.message);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center">
                <WebBenchLoader size="md" text="Loading Project..." />
            </div>
        );
    }

    if (!isLoggedIn && !isPublished) {
        return (
            <>
                <SEO title="Project Access" description="Login to view this WebBench project."/>
                <div className="min-h-screen w-full bg-[#1e1e1e] flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-[#252526] border border-[#3e3e42] rounded-lg shadow-2xl p-6 text-center">
                        <div className="w-12 h-12 bg-[#2d2d30] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#3e3e42]">
                            <WebBenchLogo className="w-6 h-6 text-accent" />
                        </div>
                        <h1 className="text-lg font-semibold text-white mb-2">Private Project</h1>
                        <p className="text-sm text-gray-400 mb-6">
                            This project is hosted on WebBench. You need to be logged in to view the source code and details.
                        </p>
                        <Button 
                            onClick={() => navigate(`/login`, { state: { from: { pathname: `/share/${projectId}` } } })} 
                            size="md" 
                            className="w-full justify-center"
                        >
                            Log In to View
                        </Button>
                    </div>
                </div>
            </>
        )
    }

    if (error || !project) {
        return (
           <div className="min-h-screen w-full bg-[#1e1e1e] flex flex-col items-center justify-center p-4 text-center">
               <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                 <AlertTriangle className="w-6 h-6 text-red-400"/>
               </div>
               <h1 className="text-xl font-bold text-white mb-2">Project Not Found</h1>
               <p className="text-gray-400 max-w-xs mb-6 text-sm">{error || "The project you are looking for might have been deleted or you don't have permission to view it."}</p>
               <Button onClick={() => navigate('/dashboard')} variant="secondary" size="md">
                    Back to Dashboard
               </Button>
           </div>
       );
   }

    const projectFiles = (Object.values(project.files) as File[]).filter((f) => f.name !== '.keep');
    
    const techStack = new Set<string>();
    if (project.type) techStack.add(project.type);
    projectFiles.forEach(f => {
        const ext = f.name.split('.').pop();
        if (ext) techStack.add(ext);
    });
    const techStackArray = Array.from(techStack).slice(0, 5);

    const shareUrl = window.location.href;
    const displayName = 'title' in project ? project.title : project.name;
    const description = 'description' in project ? project.description : '';
    // Author Logic - Updated to use profile data
    const authorName = 'author' in project ? project.author.name : 'Private User';
    const authorAvatar = 'author' in project ? project.author.avatar_url : '';
    const creationDate = 'created_at' in project ? project.created_at : project.createdAt;
    
    const shareText = `Check out "${displayName}" on WebBench!`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    const linkedinUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(displayName)}`;

    return (
        <>
            <SEO title={`${displayName} | ${isPublished ? 'Community' : 'Project'}`} description={`View details for ${displayName}.`} />
            
            <div className="h-[100dvh] w-full bg-[#1e1e1e] text-[#cccccc] font-sans overflow-y-auto no-scrollbar selection:bg-accent/30 selection:text-white">
                
                <header className="sticky top-0 z-50 w-full bg-[#1e1e1e]/80 backdrop-blur-md border-b border-[#3e3e42]">
                    <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                        <Link to="/dashboard" className="flex items-center gap-2 group">
                            <WebBenchLogo className="w-6 h-6 text-accent group-hover:scale-105 transition-transform" />
                            <span className="font-bold text-white tracking-tight">WebBench</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            {!isPublished && (
                                <Button onClick={() => navigate(`/editor/${project.id}`)} size="sm">
                                    <Edit className="w-3.5 h-3.5 mr-2" /> Open Editor
                                </Button>
                            )}
                             {isPublished && (
                                <Button onClick={handleFork} size="sm">
                                    <Copy className="w-3.5 h-3.5 mr-2" /> Fork Project
                                </Button>
                            )}
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 pb-20">
                    <div className="mb-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isPublished ? 'bg-accent/20 text-accent border-accent/40' : 'bg-[#2d2d30] text-gray-400 border-[#3e3e42]'}`}>
                                    {isPublished ? 'Published' : 'Private Project'}
                                </span>
                                <span className="text-gray-500 text-xs flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {isPublished ? 'Published' : 'Updated'} {new Date(creationDate).toLocaleDateString()}
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{displayName}</h1>
                            {description && <p className="text-gray-400 max-w-2xl text-sm leading-relaxed mb-3">{description}</p>}
                            
                            {isPublished && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span>By</span>
                                    <div className="flex items-center gap-1.5 text-white bg-[#252526] px-2 py-0.5 rounded-full border border-[#3e3e42]">
                                        {authorAvatar ? (
                                            <img src={authorAvatar} alt={authorName} className="w-5 h-5 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center"><User className="w-3 h-3 text-gray-400" /></div>
                                        )}
                                        <span className="font-medium text-xs">{authorName}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button onClick={handleDownload} variant="secondary" size="sm" className="h-9">
                                <Download className="w-4 h-4 mr-2" /> Download Zip
                            </Button>
                            <Button onClick={handleCopy} variant="secondary" size="sm" className="h-9 w-9 px-0">
                                {copyStatus ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                        <div className="space-y-6">
                            <div className="bg-[#252526] border border-[#3e3e42] rounded-lg p-5 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Database className="w-3.5 h-3.5" /> Project DNA
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-[#3e3e42]">
                                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                                            <Hash className="w-4 h-4" /> ID
                                        </div>
                                        <code className="bg-[#1e1e1e] px-2 py-1 rounded text-xs font-mono text-accent">
                                            {project.id.slice(0,8)}...
                                        </code>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-[#3e3e42]">
                                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                                            <FileCode2 className="w-4 h-4" /> Files
                                        </div>
                                        <span className="text-white text-sm font-medium">{projectFiles.length} files</span>
                                    </div>
                                     <div className="flex justify-between items-center py-2 border-b border-[#3e3e42]">
                                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                                            <Calendar className="w-4 h-4" /> Date
                                        </div>
                                        <span className="text-white text-sm font-medium">{new Date(creationDate).toLocaleDateString()}</span>
                                    </div>
                                    {isPublished && 'views_count' in project && (
                                        <div className="flex justify-between items-center py-2 border-b border-[#3e3e42]">
                                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                                <Eye className="w-4 h-4" /> Views
                                            </div>
                                            <span className="text-white text-sm font-medium">{project.views_count}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-5">
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Tech Stack</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {techStackArray.map(type => <TechBadge key={type} type={type} />)}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#252526] border border-[#3e3e42] rounded-lg p-5 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Share2 className="w-3.5 h-3.5" /> Share
                                </h3>
                                <div className="flex gap-3">
                                    <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded hover:bg-[#007acc] hover:border-[#007acc] hover:text-white text-gray-400 transition-colors">
                                        <Twitter className="w-4 h-4" />
                                    </a>
                                    <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded hover:bg-[#007acc] hover:border-[#007acc] hover:text-white text-gray-400 transition-colors">
                                        <Linkedin className="w-4 h-4" />
                                    </a>
                                    <button onClick={handleCopy} className="flex-1 flex items-center justify-center py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded hover:bg-green-600 hover:border-green-600 hover:text-white text-gray-400 transition-colors">
                                        {copyStatus ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-lg shadow-2xl overflow-hidden flex flex-col h-[500px]">
                                <div className="bg-[#252526] px-4 py-2 flex items-center gap-4 border-b border-[#3e3e42] select-none">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1e1e1e] rounded text-xs text-gray-400 font-mono border border-[#3e3e42]">
                                            <Globe className="w-3 h-3" />
                                            Live Preview
                                        </div>
                                    </div>
                                    <div className="w-10"></div>
                                </div>

                                <div className="flex-1 flex overflow-hidden">
                                    <div className="w-48 bg-[#252526] border-r border-[#3e3e42] hidden sm:flex flex-col">
                                        <div className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Explorer</div>
                                        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
                                            {projectFiles.slice(0, 15).map(file => (
                                                <div key={file.path} className="flex items-center gap-2 text-xs text-gray-400 px-2 py-1.5 rounded hover:bg-[#37373d] hover:text-white cursor-default truncate">
                                                    <FileCode2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                    {file.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-white relative">
                                        {previewUrl !== 'about:blank' ? (
                                            <iframe
                                                src={previewUrl}
                                                className="w-full h-full border-none bg-white"
                                                sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
                                                title="Preview"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-500 bg-[#1e1e1e]">
                                                <div className="text-center">
                                                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    <p>Preview not available for this file type.</p>
                                                </div>
                                            </div>
                                        )}
                                        
                                         <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
                                             <Button onClick={() => isPublished ? handleFork() : navigate(`/editor/${project.id}`)} size="lg" className="shadow-2xl pointer-events-auto transform translate-y-4 hover:translate-y-0 transition-transform">
                                                {isPublished ? 'Fork to Edit' : 'Open Editor'}
                                             </Button>
                                         </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </>
    );
};

export default SharePage;