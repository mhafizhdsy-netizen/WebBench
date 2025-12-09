
import React, { useState, useEffect } from 'react';
import { PublishedProject, File } from '../../types';
import { Globe, User, Eye, Heart } from 'lucide-react';

interface CommunityProjectCardProps {
  project: PublishedProject;
  onClick: () => void;
}

export const CommunityProjectCard: React.FC<CommunityProjectCardProps> = ({ project, onClick }) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    const htmlFile = (Object.values(project.files) as File[]).find(f => f.name.endsWith('.html'));
    
    if (!htmlFile) return;

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

    // Replace CSS
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
    
    // Replace Images
    content = content.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/g, (match, src) => {
        if (src.startsWith('http') || src.startsWith('//') || src.startsWith('data:')) return match;
        const absPath = resolvePath(htmlFile.path, src);
        const file = project.files[absPath];
        if (file && file.type === 'image') {
            const dataUri = file.content.startsWith('data:') ? file.content : `data:image/png;base64,${file.content}`;
            return match.replace(src, dataUri);
        }
        return match;
    });

    // Replace Scripts (optional, but good for visual completeness)
     content = content.replace(/<script[^>]+src=["']([^"']+)["'][^>]*>/g, (match, src) => {
        if (src.startsWith('http') || src.startsWith('//')) return match;
        const absPath = resolvePath(htmlFile.path, src);
        const file = project.files[absPath];
        if (file) {
            const blob = new Blob([file.content], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            blobUrls.push(url);
            return match.replace(src, url);
        }
        return match;
    });

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);

    return () => {
        URL.revokeObjectURL(url);
        blobUrls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [project]);

  return (
    <div 
       onClick={onClick}
       className="bg-sidebar border border-border rounded-xl overflow-hidden hover:border-accent/50 hover:shadow-2xl transition-all cursor-pointer group flex flex-col h-full relative"
    >
        <div className="h-40 bg-[#1e1e1e] relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
            {previewUrl ? (
                 <iframe
                    src={previewUrl}
                    className="w-[200%] h-[200%] border-0 pointer-events-none select-none transform scale-50 origin-top-left z-0"
                    tabIndex={-1}
                    title="Project Preview"
                 />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <Globe className="w-20 h-20 text-gray-700" />
                </div>
            )}
            {/* Overlay to ensure clicks are captured by the card, not the iframe */}
            <div className="absolute inset-0 bg-transparent z-10" />
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-sidebar to-transparent pointer-events-none z-20">
                <div className="flex gap-2">
                    {project.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/30 backdrop-blur-sm">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="p-5 flex flex-col flex-1 z-20 relative bg-sidebar">
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
  );
};
