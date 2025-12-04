import React, { useState } from 'react';
import { X, Check, Monitor, Type, Code, Layout } from 'lucide-react';
import { THEMES, useSettings } from '../../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'theme' | 'editor';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentTheme, setTheme, editorSettings, updateEditorSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('theme');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-4">
      <div className="w-full max-w-md md:max-w-xl bg-sidebar border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-5 border-b border-border">
          <h2 className="text-lg md:text-xl font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-3 md:px-5">
          <button 
            onClick={() => setActiveTab('theme')}
            className={`px-3 py-2.5 md:px-4 md:py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 md:gap-2 ${activeTab === 'theme' ? 'border-accent text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <Monitor className="w-3.5 h-3.5 md:w-4 md:h-4" /> Appearance
          </button>
          <button 
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-2.5 md:px-4 md:py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 md:gap-2 ${activeTab === 'editor' ? 'border-accent text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <Code className="w-3.5 h-3.5 md:w-4 md:h-4" /> Editor
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          
          {activeTab === 'theme' && (
            <div className="animate-fade-in">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Color Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    className={`relative group flex items-center p-3 rounded-lg border-2 transition-all duration-200 ${
                      currentTheme === theme.id 
                        ? 'border-accent bg-active' 
                        : 'border-transparent hover:border-gray-600 hover:bg-white/5'
                    }`}
                  >
                    {/* Theme Preview Swatches */}
                    <div className="flex flex-col gap-0.5 md:gap-1 mr-3 md:mr-4 shadow-lg">
                      <div className="w-14 h-10 md:w-16 md:h-12 rounded-t flex overflow-hidden">
                        <div className="w-1/3 h-full" style={{ backgroundColor: theme.colors.sidebar }}></div>
                        <div className="w-2/3 h-full" style={{ backgroundColor: theme.colors.background }}></div>
                      </div>
                      <div className="w-14 h-1.5 md:w-16 md:h-2 rounded-b" style={{ backgroundColor: theme.colors.accent }}></div>
                    </div>

                    <div className="text-left flex-1">
                      <span className={`block font-medium text-sm ${currentTheme === theme.id ? 'text-white' : 'text-gray-300'}`}>
                        {theme.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {theme.id === 'vscode' ? 'Default' : 'Custom'}
                      </span>
                    </div>

                    {currentTheme === theme.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-accent rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="space-y-4 md:space-y-6 animate-fade-in">
              {/* Font Size */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 md:mb-4">Typography</h3>
                <div className="flex items-center justify-between p-3 md:p-4 bg-white/5 rounded-lg border border-border">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Type className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                    <div>
                      <span className="block text-white font-medium text-sm">Font Size</span>
                      <span className="text-xs text-gray-500">Control the size of the text in the editor</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-300 w-8 text-center">{editorSettings.fontSize}px</span>
                    <input 
                      type="range" 
                      min="10" 
                      max="24" 
                      value={editorSettings.fontSize}
                      onChange={(e) => updateEditorSettings({ fontSize: parseInt(e.target.value) })}
                      className="w-28 md:w-32 accent-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Behavior */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 md:mb-4">Behavior</h3>
                <div className="space-y-3">
                  {/* Word Wrap */}
                  <div className="flex items-center justify-between p-3 md:p-4 bg-white/5 rounded-lg border border-border">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Layout className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      <div>
                        <span className="block text-white font-medium text-sm">Word Wrap</span>
                        <span className="text-xs text-gray-500">Wrap long lines to the viewport width</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editorSettings.wordWrap === 'on'}
                        onChange={(e) => updateEditorSettings({ wordWrap: e.target.checked ? 'on' : 'off' })}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-5 md:w-11 md:h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 md:after:h-5 after:w-4 md:after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>

                  {/* Minimap */}
                  <div className="flex items-center justify-between p-3 md:p-4 bg-white/5 rounded-lg border border-border">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Monitor className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      <div>
                        <span className="block text-white font-medium text-sm">Minimap</span>
                        <span className="text-xs text-gray-500">Show a miniature overview of the code</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editorSettings.minimap}
                        onChange={(e) => updateEditorSettings({ minimap: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-5 md:w-11 md:h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 md:after:h-5 after:w-4 md:after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>

                  {/* Line Numbers */}
                  <div className="flex items-center justify-between p-3 md:p-4 bg-white/5 rounded-lg border border-border">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Code className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      <div>
                        <span className="block text-white font-medium text-sm">Line Numbers</span>
                        <span className="text-xs text-gray-500">Show line numbers in the gutter</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editorSettings.lineNumbers === 'on'}
                        onChange={(e) => updateEditorSettings({ lineNumbers: e.target.checked ? 'on' : 'off' })}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-5 md:w-11 md:h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 md:after:h-5 after:w-4 md:after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 md:p-5 border-t border-border flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm md:px-6 md:py-2 bg-accent hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};