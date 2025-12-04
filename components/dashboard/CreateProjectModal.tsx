import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { X, Loader2, File, LayoutTemplate, Check } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, template: 'blank' | 'starter') => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'blank' | 'starter' | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedTemplate) return;

    setLoading(true);
    try {
      await onCreate(name, selectedTemplate);
      setName('');
      setSelectedTemplate(null);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    setName('');
    setSelectedTemplate(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4">
      <div className="w-full max-w-md md:max-w-lg bg-sidebar border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-border">
          <h2 className="text-lg md:text-xl font-semibold text-white">Create New Project</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Portfolio"
              className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded-md px-3 py-2.5 text-base outline-none"
              autoFocus
            />
          </div>

          <div className="mb-4 md:mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2 md:mb-3">Choose a starting point</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {/* Blank Project Card */}
              <button
                type="button"
                onClick={() => setSelectedTemplate('blank')}
                className={`relative group text-left flex items-start p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedTemplate === 'blank'
                    ? 'border-accent bg-active' 
                    : 'border-border hover:border-gray-600 bg-background'
                }`}
              >
                <File className="w-5 h-5 md:w-6 md:h-6 text-gray-400 mr-3 md:mr-4 mt-1 shrink-0" />
                <div>
                  <h3 className="font-semibold text-white text-base md:text-lg">Blank Canvas</h3>
                  <p className="text-xs text-gray-500 mt-0.5 md:mt-1">Start with an empty project. No files, no code.</p>
                </div>
                {selectedTemplate === 'blank' && (
                  <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-accent rounded-full flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                )}
              </button>
              
              {/* Starter Template Card */}
              <button
                type="button"
                onClick={() => setSelectedTemplate('starter')}
                className={`relative group text-left flex items-start p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedTemplate === 'starter'
                    ? 'border-accent bg-active' 
                    : 'border-border hover:border-gray-600 bg-background'
                }`}
              >
                <LayoutTemplate className="w-5 h-5 md:w-6 md:h-6 text-accent mr-3 md:mr-4 mt-1 shrink-0" />
                <div>
                  <h3 className="font-semibold text-white text-base md:text-lg">WebBench Starter</h3>
                  <p className="text-xs text-gray-500 mt-0.5 md:mt-1">A pre-built responsive template to get you started.</p>
                </div>
                {selectedTemplate === 'starter' && (
                  <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-accent rounded-full flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-3 md:pt-4 border-t border-border">
            <Button type="button" variant="secondary" size="md" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="md" disabled={!name.trim() || !selectedTemplate || loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};