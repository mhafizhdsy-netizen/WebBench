import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project, File } from '../types';
import { Button } from '../components/ui/Button';
import { WebBenchLoader } from '../components/ui/Loader';
import { SEO } from '../components/ui/SEO';
import { Download, Edit, ArrowLeft, Layers, Clock, FileText, AlertTriangle, Twitter, Linkedin, Copy, Check } from 'lucide-react';
import JSZip from 'jszip';
import { supabase } from '../services/supabaseClient';

const WebBenchLogo = ({ className = "w-8 h-8" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" className="text-accent fill-accent/20" />
      <path d="M9.5 10l-2.5 2.5 2.5 2.5" className="text-white" />
      <path d="M14.5 10l2.5 2.5-2.5 2.5" className="text-white" />
    </svg>
);

const ProjectIcon = ({ className = "text-accent w-16 h-16" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" className="fill-accent/20" />
        <path d="M9.5 10l-2.5 2.5 2.5 2.5" className="stroke-white" />
        <path d="M14.5 10l2.5 2.5-2.5 2.5" className="stroke-white" />
    </svg>
);


const SharePage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [copyStatus, setCopyStatus] = useState(false);

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

                if (session) {
                    const data = await projectService.getProject(projectId);
                    setProject(data);
                }
            } catch (err: any) {
                setError(err.message || "Failed to load project details.");
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndFetch();
    }, [projectId]);
    
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
        a.download = `${project.name}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="h-screen bg-background flex items-center justify-center"><WebBenchLoader size="lg" text="Loading Project..." /></div>;
    }

    if (error) {
         return (
            <div className="min-h-screen bg-background text-red-400 p-4 flex flex-col items-center justify-center text-center">
                <AlertTriangle className="w-12 h-12 mb-4"/>
                <h1 className="text-2xl font-bold text-white mb-2">Error Loading Project</h1>
                <p className="text-gray-400">{error}</p>
                <Button onClick={() => navigate('/dashboard')} className="mt-6" variant="secondary">Go to Dashboard</Button>
            </div>
        );
    }
    
    if (!isLoggedIn) {
        return (
             <>
                <SEO title="View Project" description="View this project in WebBench. Log in to start editing."/>
                 <div className="min-h-screen bg-background text-gray-300 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-10 z-0"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background z-0"></div>
                    
                    <div className="relative z-10 bg-sidebar/50 backdrop-blur-lg border border-border p-8 md:p-12 rounded-2xl shadow-2xl max-w-2xl">
                        <div className="w-20 h-20 mx-auto mb-6"><WebBenchLogo className="w-full h-full" /></div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">You're invited to a project</h1>
                        <p className="text-gray-400 max-w-md mx-auto mb-8">Log in or create a free WebBench account to view, edit, and collaborate on this project with a powerful AI assistant.</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button onClick={() => navigate(`/login`, { state: { from: { pathname: `/editor/${projectId}` } } })} size="lg" className="gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all">
                                <Edit className="w-5 h-5" /> Open in WebBench
                            </Button>
                        </div>
                    </div>
                </div>
            </>
        )
    }
    
    if (!project) {
         return (
            <div className="min-h-screen bg-background text-yellow-400 p-4 flex flex-col items-center justify-center text-center">
                <AlertTriangle className="w-12 h-12 mb-4"/>
                <h1 className="text-2xl font-bold text-white mb-2">Project Not Found</h1>
                <p className="text-gray-400">This project could not be found. It might have been deleted, or you may not have access.</p>
                <Button onClick={() => navigate('/dashboard')} className="mt-6" variant="secondary">Go to Dashboard</Button>
            </div>
        );
    }


    const projectFiles = Object.values(project.files).filter((f: File) => f.name !== '.keep');
    const shareText = `Check out my project "${project.name}" on WebBench, the AI-powered web builder! ${window.location.href}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    const linkedinUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(project.name)}`;

    return (
        <>
            <SEO title={project.name} description={`View and download the project "${project.name}" on WebBench.`}/>
             <div className="min-h-screen bg-background text-gray-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-5 z-0"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-background via-background/50 to-sidebar/20 z-0"></div>
                
                <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8">
                    <div className="flex justify-between items-center mb-8">
                        <Link to="/dashboard" className="flex items-center gap-2">
                           <WebBenchLogo className="w-8 h-8" />
                           <span className="font-bold text-white text-lg tracking-tight hidden md:block">WebBench</span>
                        </Link>
                        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </Link>
                    </div>

                    <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                            <ProjectIcon className="text-accent w-20 h-20 md:w-24 md:h-24 mb-6"/>
                            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">{project.name}</h1>
                            <p className="text-lg text-gray-400 mt-4 max-w-lg">This project is ready to be explored. Open it in the WebBench editor for an AI-powered development experience or download the files as a ZIP archive.</p>

                            <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full justify-center lg:justify-start">
                                <Button onClick={() => navigate(`/editor/${project.id}`)} size="lg" className="gap-2 w-full sm:w-auto shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all">
                                    <Edit className="w-5 h-5" /> Open in Editor
                                </Button>
                                <Button onClick={handleDownload} size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                                    <Download className="w-5 h-5" /> Download .ZIP
                                </Button>
                            </div>

                            <div className="mt-10 w-full">
                                <p className="text-sm text-gray-500 mb-3">Share this project</p>
                                <div className="flex gap-3 justify-center lg:justify-start">
                                    <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-active rounded-full text-gray-300 hover:bg-[#1DA1F2] hover:text-white transition-colors" title="Share on Twitter"><Twitter className="w-5 h-5" /></a>
                                    <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-active rounded-full text-gray-300 hover:bg-[#0A66C2] hover:text-white transition-colors" title="Share on LinkedIn"><Linkedin className="w-5 h-5" /></a>
                                    <button onClick={handleCopy} className="p-3 bg-active rounded-full text-gray-300 hover:bg-accent hover:text-white transition-colors" title="Copy Link">
                                        {copyStatus ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-sidebar/50 backdrop-blur-lg border border-border rounded-2xl shadow-xl p-6 h-full">
                             <h2 className="text-lg font-semibold text-white mb-6">Project Overview</h2>
                             <div className="space-y-4 text-sm mb-6">
                                <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg">
                                    <span className="text-gray-400 flex items-center gap-2"><Layers className="w-4 h-4"/> File Count</span>
                                    <span className="text-white font-medium">{projectFiles.length}</span>
                                </div>
                                <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg">
                                    <span className="text-gray-400 flex items-center gap-2"><Clock className="w-4 h-4"/> Last Updated</span>
                                    <span className="text-white font-medium">{new Date(project.updatedAt).toLocaleString()}</span>
                                </div>
                             </div>
                             
                             <h3 className="text-md font-semibold text-white mb-3">File Structure</h3>
                             <div className="max-h-64 overflow-y-auto no-scrollbar bg-background/50 p-3 rounded-lg border border-border/50">
                                <ul className="space-y-2 text-sm">
                                    {projectFiles.map((file: File) => (
                                        <li key={file.path} className="flex items-center gap-2 text-gray-300">
                                            <FileText className="w-4 h-4 text-gray-500 shrink-0"/>
                                            <span className="font-mono truncate">{file.path}</span>
                                        </li>
                                    ))}
                                </ul>
                             </div>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default SharePage;