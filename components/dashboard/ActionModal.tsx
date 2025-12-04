import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../../types';
import { Button } from '../ui/Button';
import { X, Loader2 } from 'lucide-react';

export interface ActionModalConfig {
  type: 'rename' | 'duplicate' | 'delete' | 'createCheckpoint';
  project: Project;
}

interface ActionModalProps {
  isOpen: boolean;
  config: ActionModalConfig | null;
  onClose: () => void;
  onConfirm: (config: ActionModalConfig, value?: string) => Promise<void>;
}

export const ActionModal: React.FC<ActionModalProps> = ({ isOpen, config, onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      if (config.type === 'duplicate') {
        setInputValue(`${config.project.name} Copy`);
      } else if (config.type === 'rename') {
        setInputValue(config.project.name);
      } else {
        setInputValue('');
      }
      if (config.type !== 'delete') {
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 100);
      }
    }
  }, [config]);

  if (!isOpen || !config) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.type !== 'delete' && !inputValue.trim()) return;
    
    setLoading(true);
    await onConfirm(config, inputValue.trim());
    setLoading(false);
    onClose();
  };
  
  const titles = {
    rename: 'Rename Project',
    duplicate: 'Duplicate Project',
    delete: 'Confirm Deletion',
    createCheckpoint: 'Create New Checkpoint'
  };

  const confirmText = {
    rename: 'Rename',
    duplicate: 'Duplicate',
    delete: 'Delete',
    createCheckpoint: 'Create'
  };
  
  const getInputLabel = () => {
    switch (config.type) {
        case 'rename': return 'Project Name';
        case 'duplicate': return 'New Project Name';
        case 'createCheckpoint': return 'Checkpoint Name';
        default: return '';
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-sidebar border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-white">{titles[config.type]}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {(config.type === 'rename' || config.type === 'duplicate' || config.type === 'createCheckpoint') && (
              <>
                <label className="block text-sm font-medium text-gray-400 mb-2">{getInputLabel()}</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded px-3 py-2 outline-none"
                  placeholder={config.type === 'createCheckpoint' ? 'e.g., Initial commit' : 'Project name'}
                />
              </>
            )}
            {config.type === 'delete' && (
              <p className="text-gray-300">
                Are you sure you want to delete the project <br />
                <span className="font-mono text-sm bg-active px-1.5 py-1 rounded my-2 inline-block">{config.project.name}</span>?<br />
                This action cannot be undone.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2 p-4 bg-active/50 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" variant={config.type === 'delete' ? 'danger' : 'primary'} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {confirmText[config.type]}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};