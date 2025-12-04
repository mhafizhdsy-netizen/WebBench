import React, { useEffect, useState, useRef } from 'react';
import { File } from '../../types';
import { RefreshCw, Monitor, Smartphone, Tablet } from 'lucide-react';
import { WebBenchLoader } from '../ui/Loader';

interface PreviewProps {
  files: Record<string, File>;
  refreshTrigger: number;
}

export const Preview: React.FC<PreviewProps> = ({ files, refreshTrigger }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);

  // Bundle files into a single HTML blob
  const bundleProject = () => {
    const htmlFile = files['/index.html'];
    if (!htmlFile) return '<h1>No index.html found</h1>';

    let content = htmlFile.content;

    // Inject CSS
    const cssMatches = content.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/g);
    if (cssMatches) {
      cssMatches.forEach(match => {
        const hrefMatch = match.match(/href=["']([^"']+)["']/);
        if (hrefMatch) {
          const path = hrefMatch[1].startsWith('/') ? hrefMatch[1] : '/' + hrefMatch[1];
          // Try to match path, handling relative paths roughly (assuming root based for this simple implementation)
          const cssFileKey = Object.keys(files).find(k => k.endsWith(path.replace(/^\.\//, ''))); 
          const cssFile = cssFileKey ? files[cssFileKey] : null;

          if (cssFile) {
            content = content.replace(match, `<style>${cssFile.content}</style>`);
          }
        }
      });
    }

    // Inject JS
    const jsMatches = content.match(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/g);
    if (jsMatches) {
      jsMatches.forEach(match => {
        const srcMatch = match.match(/src=["']([^"']+)["']/);
        if (srcMatch) {
           const path = srcMatch[1].startsWith('/') ? srcMatch[1] : '/' + srcMatch[1];
           const jsFileKey = Object.keys(files).find(k => k.endsWith(path.replace(/^\.\//, '')));
           const jsFile = jsFileKey ? files[jsFileKey] : null;

          if (jsFile) {
            content = content.replace(match, `<script>${jsFile.content}</script>`);
          }
        }
      });
    }

    return content;
  };

  useEffect(() => {
    if (!iframeRef.current) return;
    setLoading(true);
    iframeRef.current.srcdoc = bundleProject();
    // A short timeout to allow the iframe to start loading and prevent UI flickering
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 150);
    return () => clearTimeout(timeout);
  }, [files, refreshTrigger]);

  const getDeviceClasses = () => {
    switch (size) {
      case 'mobile': return 'w-[390px] h-[844px] bg-black rounded-[54px] p-3.5 shadow-2xl ring-2 ring-gray-800';
      case 'tablet': return 'w-[768px] h-[1024px] bg-black rounded-[32px] p-4 shadow-2xl ring-2 ring-gray-800';
      default: return 'w-full h-full bg-sidebar';
    }
  };

  const getIframeClasses = () => {
    switch(size) {
      case 'mobile': return 'rounded-[40px]';
      case 'tablet': return 'rounded-[20px]';
      default: return '';
    }
  }

  return (
    <div className="h-full flex flex-col bg-sidebar border-l border-border">
      <div className="h-9 px-4 flex items-center justify-between border-b border-border">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preview</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSize('mobile')} 
            className={`p-1 rounded ${size === 'mobile' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`}
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setSize('tablet')} 
            className={`p-1 rounded ${size === 'tablet' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`}
            title="Tablet View"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setSize('desktop')} 
            className={`p-1 rounded ${size === 'desktop' ? 'bg-active text-white' : 'text-gray-400 hover:text-white'}`}
            title="Desktop View"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-600 mx-1"></div>
          <button 
            onClick={() => { setLoading(true); if (iframeRef.current) iframeRef.current.srcdoc = bundleProject(); setTimeout(()=>setLoading(false), 500); }} 
            className="p-1 text-gray-400 hover:text-white"
            title="Refresh Preview"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-background flex items-center justify-center overflow-auto p-4 custom-scrollbar">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 bg-sidebar/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
            <WebBenchLoader size="md" />
            <span className="mt-4 text-sm font-medium text-white tracking-wide animate-pulse">Building Preview...</span>
          </div>
        )}

        <div 
          className={`transition-all duration-300 overflow-hidden relative z-10 shrink-0 ${getDeviceClasses()}`}
        >
          {size === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-40 bg-black rounded-b-2xl z-20 flex justify-center items-center">
              <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
            </div>
          )}
          <iframe 
            ref={iframeRef}
            title="preview"
            className={`w-full h-full border-none bg-white ${getIframeClasses()}`}
            sandbox="allow-scripts allow-modals"
          />
        </div>
      </div>
    </div>
  );
};