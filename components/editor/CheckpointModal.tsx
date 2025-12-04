import React, { useState, useEffect } from 'react';
import { Checkpoint, File as ProjectFile } from '../../types';
import { Button } from '../ui/Button';
import { X, History, FileCode, FileType, Trash2, Plus } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useSettings } from '../../context/ThemeContext';

interface CheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoints: Checkpoint[];
  onRestore: (checkpoint: Checkpoint) => void;
  onDelete: (checkpointId: string) => void;
  onCreate: () => void;
}

export const CheckpointModal: React.FC<CheckpointModalProps> = ({ isOpen, onClose, checkpoints, onRestore, onDelete, onCreate }) => {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const { editorSettings, currentTheme } = useSettings();

  useEffect(() => {
    if (isOpen && checkpoints.length > 0) {
      setSelectedCheckpoint(checkpoints[0]);
    } else {
      setSelectedCheckpoint(null);
    }
  }, [isOpen, checkpoints]);

  useEffect(() => {
    if (selectedCheckpoint) {
      const firstFilePath = Object.keys(selectedCheckpoint.files).sort((a,b) => a.localeCompare(b))[0];
      if (firstFilePath) {
        setSelectedFile(selectedCheckpoint.files[firstFilePath]);
      } else {
        setSelectedFile(null);
      }
    } else {
      setSelectedFile(null);
    }
  }, [selectedCheckpoint]);

  if (!isOpen) return null;

  const files = selectedCheckpoint ? (Object.values(selectedCheckpoint.files) as ProjectFile[]).sort((a, b) => a.path.localeCompare(b.path)) : [];

  const handleRestore = () => {
    if (selectedCheckpoint) {
      onRestore(selectedCheckpoint);
      onClose();
    }
  };

  const handleDelete = () => {
    if (selectedCheckpoint) {
      onDelete(selectedCheckpoint.id);
    }
  }
  
  const getLanguage = (type: string) => {
    switch (type) {
      case 'html': return 'html';
      case 'css': return 'css';
      case 'javascript': return 'javascript';
      case 'json': return 'json';
      default: return 'plaintext';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'html': return <FileCode className="w-4 h-4 text-orange-400" />;
      case 'css': return <FileCode className="w-4 h-4 text-sky-400" />;
      case 'javascript': return <FileCode className="w-4 h-4 text-yellow-400" />;
      default: return <FileType className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl bg-sidebar border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Project Checkpoints</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 flex min-h-0">
          <div className="w-1/4 max-w-sm bg-background border-r border-border overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-2 sticky top-0 bg-background z-10 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Saved Checkpoints</span>
                <Button onClick={onCreate} size="sm" variant="secondary" className="h-7 px-2 text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> New
                </Button>
            </div>
            {checkpoints.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 flex flex-col items-center justify-center h-full">
                <History className="w-12 h-12 text-gray-700 mb-4" />
                <h3 className="font-semibold text-gray-300">No Checkpoints Yet</h3>
                <p className="text-xs mt-1">Create a checkpoint to save the current state of your project.</p>
              </div>
            ) : (
              checkpoints.map(cp => (
                <button 
                  key={cp.id}
                  onClick={() => setSelectedCheckpoint(cp)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors group relative ${selectedCheckpoint?.id === cp.id ? 'bg-active' : 'hover:bg-active/50'}`}
                >
                  <p className={`font-medium text-sm ${selectedCheckpoint?.id === cp.id ? 'text-white' : 'text-gray-300'}`}>{cp.name}</p>
                  <p className="text-xs text-gray-500">{new Date(cp.createdAt).toLocaleString()}</p>
                   <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="absolute top-1/2 right-3 -translate-y-1/2 p-1.5 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4"/>
                   </button>
                </button>
              ))
            )}
          </div>
          
          <div className="w-1/4 max-w-xs bg-sidebar border-r border-border overflow-y-auto custom-scrollbar">
             <div className="p-2 sticky top-0 bg-sidebar z-10 border-b border-border">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Files in Checkpoint</span>
            </div>
             {files.map((file) => (
              file.name !== '.keep' &&
              <button 
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors ${selectedFile?.path === file.path ? 'bg-active text-white' : 'text-gray-400 hover:bg-active/50'}`}
              >
                {getFileIcon(file.type)}
                <span className="truncate">{file.name}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col bg-background">
            {selectedFile ? (
              <Editor
                height="100%"
                path={selectedFile.path}
                language={getLanguage(selectedFile.type)}
                value={selectedFile.content}
                theme={currentTheme}
                options={{
                  ...editorSettings,
                  readOnly: true,
                  domReadOnly: true,
                  scrollBeyondLastLine: false,
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                {selectedCheckpoint ? 'Select a file to view its content.' : 'Select a checkpoint to begin.'}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center p-4 bg-active/50 border-t border-border shrink-0">
            <p className="text-xs text-gray-400">Restoring will revert all current file changes in your editor.</p>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>Close</Button>
                <Button onClick={handleRestore} disabled={!selectedCheckpoint} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed">
                    <History className="w-4 h-4 mr-2"/>
                    Restore
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};