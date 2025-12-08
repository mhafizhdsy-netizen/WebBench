
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { PublishedProject } from '../types';
import { SEO } from '../components/ui/SEO';
import { WebBenchLoader } from '../components/ui/Loader';
import { Search, Globe, Eye, Heart, ArrowLeft, User } from 'lucide-react';
import { Button } from '../components/ui/Button';

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
                        <div 
                           key={project.id} 
                           onClick={() => navigate(`/community/${project.id}`)}
                           className="bg-sidebar border border-border rounded-xl overflow-hidden hover:border-accent/50 hover:shadow-2xl transition-all cursor-pointer group flex flex-col h-full"
                        >
                            {/* Project Thumbnail / Preview (Abstract) */}
                            <div className="h-40 bg-[#1e1e1e] relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                    <Globe className="w-20 h-20 text-gray-700" />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-sidebar to-transparent">
                                    <div className="flex gap-2">
                                        {project.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/30 backdrop-blur-sm">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="text-lg font-bold text-white mb-1 truncate group-hover:text-accent transition-colors">{project.title}</h3>
                                <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-1">{project.description || "No description provided."}</p>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                                    <div className="flex items-center gap-2">
                                        {project.author.avatar_url ? (
                                            <img src={project.author.avatar_url} alt={project.author.name} className="w-6 h-6 rounded-full bg-gray-700 object-cover" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center"><User className="w-3 h-3 text-gray-400" /></div>
                                        )}
                                        <span className="text-xs text-gray-300 font-medium truncate max-w-[100px]">{project.author.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <div className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {project.views_count}</div>
                                        <div className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {project.likes_count}</div>
                                    </div>
                                </div>
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

export default Community;
