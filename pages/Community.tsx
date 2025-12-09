

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { PublishedProject } from '../types';
import { SEO } from '../components/ui/SEO';
import { WebBenchLoader } from '../components/ui/Loader';
import { Search, Globe, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CommunityProjectCard } from '../components/dashboard/CommunityProjectCard';

// Reusing logo for consistency
const WebBenchLogo = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" className="text-accent fill-accent/20" />
    <path d="M9.5 10l-2.5 2.5 2.5 2.5" className="text-white" />
    <path d="M14.5 10l2.5 2.5-2.5 2.5" className="text-white" />
  </svg>
);

const Community: React.FC = () => {
  const [projects, setProjects] = useState<PublishedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      const data = await projectService.getCommunityProjects();
      setProjects(data);
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.description?.toLowerCase().includes(search.toLowerCase()) ||
    p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <SEO title="Web Projects Community" description="Explore web projects created by the WebBench community." />
      
      <div className="h-screen w-full bg-background text-gray-300 overflow-y-auto flex flex-col custom-scrollbar">
        <header className="sticky top-0 z-20 bg-sidebar/80 backdrop-blur-md border-b border-border shrink-0">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <WebBenchLogo />
                <span className="font-bold text-white text-lg">WebBench <span className="text-accent font-normal">Community</span></span>
            </div>
            
            <div className="flex-1 max-w-md mx-4 hidden md:block">
               <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-accent transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search community projects..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-border focus:border-accent text-white rounded-lg pl-10 pr-4 py-2 text-sm outline-none transition-all"
                  />
                </div>
            </div>

            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
               <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
            <div className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">Explore Web Projects</h1>
                <p className="text-gray-400">Discover what others are building with WebBench. Fork, learn, and share.</p>
                
                {/* Mobile Search */}
                <div className="mt-4 md:hidden relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-accent transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search projects..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#252526] border border-border focus:border-accent text-white rounded-lg pl-10 pr-4 py-2 text-sm outline-none"
                  />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <WebBenchLoader size="lg" text="Loading Community Projects..." />
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="text-center py-20 bg-[#252526] rounded-xl border border-border">
                    <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white">No projects found</h2>
                    <p className="text-gray-500 mt-2">Be the first to publish a project to the community!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <CommunityProjectCard
                           key={project.id} 
                           project={project}
                           onClick={() => navigate(`/community/${project.id}`)}
                        />
                    ))}
                </div>
            )}
        </main>
      </div>
    </>
  );
};

export default Community;