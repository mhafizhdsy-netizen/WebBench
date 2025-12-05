import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import { File } from '../../types';
import { useSettings, THEMES } from '../../context/ThemeContext';
import type { Theme } from '../../context/ThemeContext';
import { 
  X, ChevronRight, FileCode, FileJson, FileType, MoreVertical, 
  Undo2, Redo2, Search, Replace, AlignLeft, CheckSquare,
  MessageSquare, Trash2, Copy, List, FoldVertical, UnfoldVertical,
  Scissors, XCircle, AlertTriangle, BrainCircuit, Terminal, Database
} from 'lucide-react';

interface CodeEditorProps {
  files: Record<string, File>;
  activeFile: string | null;
  openFiles: string[];
  onChange: (value: string | undefined) => void;
  onCloseFile: (path: string) => void;
  onSelectFile: (path: string) => void;
  isMobile: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  files, activeFile, openFiles, onChange, onCloseFile, onSelectFile, isMobile 
}) => {
  const { editorSettings, currentTheme } = useSettings();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [markerStats, setMarkerStats] = useState({ errors: 0, warnings: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleEditorWillMount: BeforeMount = (monaco) => {
    const generateMonacoTheme = (theme: Theme) => {
      monaco.editor.defineTheme(theme.id, {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6a9955' },
          { token: 'string', foreground: 'ce9178' },
          { token: 'keyword', foreground: '569cd6' },
          { token: 'number', foreground: 'b5cea8' },
          { token: 'type', foreground: '4ec9b0' },
          { token: 'identifier', foreground: '9cdcfe' },
          { token: 'delimiter', foreground: 'd4d4d4' },
          { token: 'tag', foreground: '569cd6' },
          { token: 'attribute.name', foreground: '9cdcfe' },
          { token: 'attribute.value', foreground: 'ce9178' },
        ],
        colors: {
          'editor.background': theme.colors.background,
          'editor.foreground': '#cccccc',
          'editorGutter.background': theme.colors.sidebar,
          'editorCursor.foreground': theme.colors.accent,
          'editor.lineHighlightBackground': `${theme.colors.active}50`,
          'editorLineNumber.foreground': '#858585',
          'editor.selectionBackground': `${theme.colors.accent}40`,
        },
      });
    };
    THEMES.forEach(generateMonacoTheme);

    // Configure HTML validation
    monaco.languages.html.htmlDefaults.setOptions({
      validate: {
        enabled: true,
      },
    });
  };
  
  const updateMarkers = useCallback((uri: any) => {
    if (!monacoRef.current) return;
    const markers = monacoRef.current.editor.getModelMarkers({ resource: uri });
    const errors = markers.filter((m: any) => m.severity === monacoRef.current.MarkerSeverity.Error).length;
    const warnings = markers.filter((m: any) => m.severity === monacoRef.current.MarkerSeverity.Warning).length;
    setMarkerStats({ errors, warnings });
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.focus();

    monaco.editor.onDidChangeMarkers(([uri]) => {
        const currentModel = editorRef.current?.getModel();
        if (currentModel && currentModel.uri.toString() === uri.toString()) {
            updateMarkers(currentModel.uri);
        }
    });

    editor.onDidChangeModel(() => {
        const model = editor.getModel();
        if (model) {
            updateMarkers(model.uri);
        } else {
            setMarkerStats({ errors: 0, warnings: 0 });
        }
    });

    const initialModel = editor.getModel();
    if (initialModel) {
        updateMarkers(initialModel.uri);
    }
  };

  const file = activeFile ? files[activeFile] : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerAction = (action: string) => {
    if (!editorRef.current) return;
    
    switch (action) {
      case 'undo': editorRef.current.trigger('keyboard', 'undo', null); break;
      case 'redo': editorRef.current.trigger('keyboard', 'redo', null); break;
      case 'find': editorRef.current.trigger('keyboard', 'actions.find', null); break;
      case 'replace': editorRef.current.trigger('keyboard', 'editor.action.startFindReplaceAction', null); break;
      case 'gotoLine': editorRef.current.trigger('keyboard', 'editor.action.gotoLine', null); break;
      case 'format': editorRef.current.trigger('keyboard', 'editor.action.formatDocument', null); break;
      case 'selectAll': editorRef.current.trigger('keyboard', 'editor.action.selectAll', null); break;
      case 'comment': editorRef.current.trigger('keyboard', 'editor.action.commentLine', null); break;
      case 'deleteLine': editorRef.current.trigger('keyboard', 'editor.action.deleteLines', null); break;
      case 'duplicateLine': editorRef.current.trigger('keyboard', 'editor.action.copyLinesDownAction', null); break;
      case 'foldAll': editorRef.current.trigger('keyboard', 'editor.foldAll', null); break;
      case 'unfoldAll': editorRef.current.trigger('keyboard', 'editor.unfoldAll', null); break;
    }
    setShowMenu(false);
    editorRef.current.focus();
  };

  const getLanguage = (type: File['type']) => {
    switch (type) {
      case 'html': return 'html';
      case 'css': return 'css';
      case 'javascript': return 'javascript';
      case 'typescript': return 'typescript';
      case 'tsx': return 'typescript';
      case 'python': return 'python';
      case 'php': return 'php';
      case 'cpp': return 'cpp';
      case 'blade': return 'php';
      case 'json': return 'json';
      default: return 'plaintext';
    }
  };

  const getFileIcon = (type: File['type']) => {
    const className = "w-2.5 h-2.5 md:w-3 md:h-3";
    switch (type) {
      case 'html': return <FileCode className={`${className} text-orange-500`} />;
      case 'css': return <FileCode className={`${className} text-blue-400`} />;
      case 'javascript': return <FileCode className={`${className} text-yellow-400`} />;
      case 'typescript':
      case 'tsx': return <BrainCircuit className={`${className} text-blue-400`} />;
      case 'python': return <FileCode className={`${className} text-green-400`} />;
      case 'php':
      case 'blade': return <Database className={`${className} text-indigo-400`} />;
      case 'cpp': return <Terminal className={`${className} text-cyan-400`} />;
      default: return <FileType className={`${className} text-gray-400`} />;
    }
  };

  const renderBreadcrumbs = () => {
    if (!activeFile) return null;
    const parts = activeFile.split('/').filter(Boolean);
    return (
      <div className="flex items-center gap-1 px-3 md:px-4 h-5 md:h-6 bg-background border-b border-border text-xs text-gray-500 overflow-hidden whitespace-nowrap shrink-0">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-2.5 h-2.5 md:w-3 md:h-3 text-gray-600" />}
            <span className={index === parts.length - 1 ? 'text-gray-300' : ''}>
              {part}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-background flex flex-col overflow-hidden">
      
      {/* Tab Bar Container */}
      <div className="flex items-center justify-between bg-[#252526] border-b border-border shrink-0 h-8 md:h-9">
        <div className="flex-1 flex items-center overflow-x-auto no-scrollbar">
          {openFiles.length === 0 && (
             <div className="px-3 md:px-4 py-1.5 md:py-2 text-xs text-gray-500 italic">No files open</div>
          )}
          {openFiles.map(path => {
            const isActive = path === activeFile;
            const fileData = files[path];
            const fileName = path.split('/').pop() || 'file';
            return (
              <div 
                key={path}
                onClick={() => onSelectFile(path)}
                className={`
                  group flex items-center gap-2 px-3 py-1.5 md:py-2.5 min-w-[100px] max-w-[160px] md:min-w-[120px] md:max-w-[200px] text-xs cursor-pointer border-r border-border select-none h-full transition-colors duration-150
                  ${isActive ? 'bg-background text-white border-t-2 border-t-accent' : 'bg-[#252526] text-gray-400 hover:bg-[#2d2d2d]'}
                `}
              >
                {fileData && getFileIcon(fileData.type)}
                <span className={`truncate flex-1 ${isActive ? 'font-semibold' : ''}`}>{fileName}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onCloseFile(path); }}
                  className={`p-0.5 rounded-sm hover:bg-gray-700 ${isActive ? 'text-gray-400 hover:text-white' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* More Actions Menu */}
        <div className="relative border-l border-border h-full flex items-center" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`h-full px-2 text-gray-400 hover:text-white hover:bg-[#3a3d41] transition-colors ${showMenu ? 'bg-[#3a3d41] text-white' : ''}`}
            title="Editor Actions"
          >
            <MoreVertical className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>

          {showMenu && (
            <div className="absolute top-full right-0 mt-1 w-60 md:w-64 bg-[#252526] border border-[#454545] rounded-lg shadow-2xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="px-3 py-1.5 text-[9px] md:text-[10px] uppercase font-bold text-gray-500 border-b border-[#333] mb-1">Edit</div>
              <button onClick={() => triggerAction('undo')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <Undo2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> Undo <span className="ml-auto opacity-50 text-[9px] md:text-[10px]">Ctrl+Z</span>
              </button>
              <button onClick={() => triggerAction('redo')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <Redo2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> Redo <span className="ml-auto opacity-50 text-[9px] md:text-[10px]">Ctrl+Y</span>
              </button>
              <div className="h-px bg-[#454545] my-1 mx-2"></div>
              <button onClick={() => triggerAction('duplicateLine')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" /> Duplicate Line <span className="ml-auto opacity-50 text-[9px] md:text-[10px]">Alt+Shift+↓</span>
              </button>
              <button onClick={() => triggerAction('deleteLine')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <Scissors className="w-3 h-3 md:w-3.5 md:h-3.5" /> Delete Line <span className="ml-auto opacity-50 text-[9px] md:text-[10px]">Ctrl+Shift+K</span>
              </button>
              <button onClick={() => triggerAction('comment')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <MessageSquare className="w-3 h-3 md:w-3.5 md:h-3.5" /> Toggle Comment <span className="ml-auto opacity-50 text-[9px] md:text-[10px]">Ctrl+/</span>
              </button>
              <div className="h-px bg-[#454545] my-1 mx-2"></div>
              <div className="px-3 py-1.5 text-[9px] md:text-[10px] uppercase font-bold text-gray-500 border-b border-[#333] mb-1">Navigation</div>
              <button onClick={() => triggerAction('find')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <Search className="w-3 h-3 md:w-3.5 md:h-3.5" /> Find <span className="ml-auto opacity-50 text-[9px] md:text-[10px]">Ctrl+F</span>
              </button>
              <button onClick={() => triggerAction('replace')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <Replace className="w-3 h-3 md:w-3.5 md:h-3.5" /> Replace <span className="ml-auto opacity-50 text-[9px] md:text-[10px]">Ctrl+H</span>
              </button>
              <button onClick={() => triggerAction('gotoLine')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <List className="w-3 h-3 md:w-3.5 md:h-3.5" /> Go to Line <span className="ml-auto opacity-50 text-[9px] md:text-[10px]">Ctrl+G</span>
              </button>
              <div className="h-px bg-[#454545] my-1 mx-2"></div>
              <div className="px-3 py-1.5 text-[9px] md:text-[10px] uppercase font-bold text-gray-500 border-b border-[#333] mb-1">View & Format</div>
              <button onClick={() => triggerAction('format')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <AlignLeft className="w-3 h-3 md:w-3.5 md:h-3.5" /> Format Document <span className="ml-auto opacity-50 text-[9px] md:text-[10px]">Alt+Shift+F</span>
              </button>
              <button onClick={() => triggerAction('foldAll')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <FoldVertical className="w-3 h-3 md:w-3.5 md:h-3.5" /> Fold All
              </button>
               <button onClick={() => triggerAction('unfoldAll')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <UnfoldVertical className="w-3 h-3 md:w-3.5 md:h-3.5" /> Unfold All
              </button>
              <div className="h-px bg-[#454545] my-1 mx-2"></div>
              <button onClick={() => triggerAction('selectAll')} className="w-full text-left px-3 py-1.5 md:py-2 text-xs text-gray-300 hover:bg-[#094771] hover:text-white flex items-center gap-2">
                <CheckSquare className="w-3 h-3 md:w-3.5 md:h-3.5" /> Select All <span className="ml-auto opacity-50 text-[9px] md:text-[10px]">Ctrl+A</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {renderBreadcrumbs()}

      <div className="flex-1 relative">
        {file ? (
          <Editor
            height="100%"
            path={file.path} 
            language={getLanguage(file.type)}
            value={file.content}
            onChange={onChange}
            theme={currentTheme}
            beforeMount={handleEditorWillMount}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: editorSettings.minimap },
              fontSize: editorSettings.fontSize,
              wordWrap: editorSettings.wordWrap,
              lineNumbers: editorSettings.lineNumbers,
              formatOnType: editorSettings.formatOnType,
              formatOnPaste: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 10, bottom: 10 },
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              suggestOnTriggerCharacters: true
            }}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-background text-gray-500 gap-3 md:gap-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/5 flex items-center justify-center">
              <Code2 className="w-8 h-8 md:w-10 md:h-10 opacity-50" />
            </div>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-medium text-gray-400">No File Open</h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Select a file from the explorer to start editing</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-5 md:h-6 bg-[#252526] border-t border-border flex items-center justify-end px-3 md:px-4 gap-3 md:gap-4 text-xs shrink-0 select-none text-gray-400">
         <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 p-0.5 rounded" title={`${markerStats.errors} Errors`}>
            <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-error" />
            <span>{markerStats.errors}</span>
        </div>
         <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 p-0.5 rounded" title={`${markerStats.warnings} Warnings`}>
            <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-warning" />
            <span>{markerStats.warnings}</span>
        </div>
      </div>
    </div>
  );
};

const Code2 = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);