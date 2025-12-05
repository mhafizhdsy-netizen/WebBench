import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project, File } from '../types';
import { Button } from '../components/ui/Button';
import { WebBenchLoader } from '../components/ui/Loader';
import { SEO } from '../components/ui/SEO';
import { Download, Edit, ArrowLeft, Layers, Clock, FileText, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import { supabase } from '../services/supabaseClient';

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

                // We need to be logged in to fetch project details.
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
    
    // If not logged in, show an invitation page
    if (!isLoggedIn) {
        return (
             <>
                <SEO title="View Project" description="View this project in WebBench. Log in to start editing."/>
                <div className="min-h-screen bg-background text-gray-300 p-4 flex flex-col items-center justify-center text-center">
                     <div className="w-24 h-24 mb-6"><ProjectIcon className="w-full h-full"/></div>
                     <h1 className="text-3xl font-bold text-white mb-2">You've been invited to a project</h1>
                     <p className="text-gray-400 max-w-md mb-8">Log in or create an account with WebBench to view, edit, and collaborate on this project using the power of AI.</p>
                     <div className="flex gap-4">
                         <Button onClick={() => navigate(`/login`, { state: { from: { pathname: `/editor/${projectId}` } } })} size="lg" className="gap-2">
                             <Edit className="w-5 h-5"/> Open in WebBench
                         </Button>
                          <Button onClick={() => navigate('/dashboard')} size="lg" variant="secondary" className="gap-2">
                             Go to Dashboard
                         </Button>
                     </div>
                 </div>
            </>
        )
    }
    
    // If logged in but project not found (e.g., no permissions)
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

    return (
        <>
            <SEO title={project.name} description={`View and download the project "${project.name}" on WebBench.`}/>
            <div className="min-h-screen bg-gradient-to-b from-sidebar to-background text-gray-300">
                <div className="max-w-4xl mx-auto p-4 md:p-8">
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4"/> Back to Dashboard
                    </Link>

                    <div className="bg-active rounded-xl shadow-2xl border border-border overflow-hidden">
                        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                           <div className="w-24 h-24 md:w-32 md:h-32 shrink-0"><ProjectIcon className="w-full h-full"/></div>
                           <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl md:text-4xl font-bold text-white">{project.name}</h1>
                                <p className="text-gray-400 mt-2">Ready to view, edit or download</p>
                                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                                    <Button onClick={handleDownload} size="lg" className="gap-2">
                                        <Download className="w-5 h-5"/> Download Project
                                    </Button>
                                    <Button onClick={() => navigate(`/editor/${project.id}`)} size="lg" variant="secondary" className="gap-2">
                                        <Edit className="w-5 h-5"/> Open in Editor
                                    </Button>
                                </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border">
                            <div className="p-5 border-b md:border-b-0 md:border-r border-border">
                               <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Project Details</h2>
                               <div className="space-y-3 text-sm">
                                   <div className="flex justify-between">
                                       <span className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4"/> Last updated</span>
                                       <span className="text-white font-medium">{new Date(project.updatedAt).toLocaleDateString()}</span>
                                   </div>
                                    <div className="flex justify-between">
                                       <span className="text-gray-500 flex items-center gap-2"><Layers className="w-4 h-4"/> File count</span>
                                       <span className="text-white font-medium">{projectFiles.length}</span>
                                   </div>
                               </div>
                            </div>
                            <div className="p-5">
                                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Files Included</h2>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2 -mr-2">
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
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SharePage;