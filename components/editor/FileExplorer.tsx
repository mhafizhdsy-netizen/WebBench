import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, File as ProjectFile } from '../../types';
import { Button } from '../ui/Button';
import { 
  Folder, FolderOpen, FileCode, FileJson, FileType, ChevronRight, ChevronDown, 
  FilePlus, FolderPlus, Trash2, Edit2, Copy, X, Loader2, Search,
  FileImage, FileText, MoreVertical
} from 'lucide-react';

// --- Helper Components ---

const FileIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'html': return <FileCode className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-400" />;
    case 'css': return <FileCode className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-400" />;
    case 'javascript': return <FileCode className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400" />;
    case 'json': return <FileJson className="w-3.5 h-3.5 md:w-4 md:h-4 text-lime-400" />;
    case 'markdown': return <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400" />;
    case 'image': return <FileImage className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-400" />;
    default: return <FileType className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500" />;
  }
};

const ContextMenu = ({ x, y, options, onClose }: { x: number, y: number, options: any[], onClose: () => void }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div 
            ref={menuRef}
            className="fixed z-50 w-40 md:w-48 bg-[#252526] border border-[#454545] rounded-md shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: y, left: x }}
        >
            {options.map((opt, i) => (
                <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      opt.action();
                    }}
                    className={`w-full text-left px-3 py-1.5 md:py-2 text-xs flex items-center gap-2 ${opt.isDestructive ? 'text-red-400 hover:bg-red-500/20' : 'text-gray-300 hover:bg-[#094771] hover:text-white'}`}
                >
                    {opt.icon} {opt.label}
                </button>
            ))}
        </div>
    );
};

// --- Action Modal for Create/Rename/Delete ---
interface ModalConfig {
  type: 'createFile' | 'createFolder' | 'rename' | 'delete';
  path: string;
  currentName?: string;
  onConfirm: (value?: string) => void;
}

const ActionModal = ({ config, onClose }: { config: ModalConfig, onClose: () => void }) => {
  const [inputValue, setInputValue] = useState(config.currentName || '');
  const [loading] = useState(false); // Placeholder for future async ops
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus input when modal opens for create/rename
    if (config.type === 'createFile' || config.type === 'createFolder' || config.type === 'rename') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [config.type]);

  const titles = {
    createFile: 'Create New File',
    createFolder: 'Create New Folder',
    rename: 'Rename Item',
    delete: 'Confirm Deletion'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.type !== 'delete' && !inputValue.trim()) return;
    config.onConfirm(inputValue.trim());
    onClose();
  };
  
  const targetName = config.type === 'rename' ? config.currentName : config.path;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4">
      <div className="w-full max-w-xs md:max-w-sm bg-sidebar border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-border">
          <h2 className="text-base md:text-lg font-semibold text-white">{titles[config.type]}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-4 md:p-6">
            {(config.type === 'createFile' || config.type === 'createFolder' || config.type === 'rename') && (
              <>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {config.type === 'rename' ? 'New name for ' : 'Name'}
                  {config.type === 'rename' && <span className="font-mono text-xs bg-active px-1 py-0.5 rounded">{config.currentName}</span>}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded px-3 py-2 text-sm outline-none"
                  placeholder={config.type.includes('Folder') ? 'folder-name' : 'file-name.js'}
                />
              </>
            )}
            {config.type === 'delete' && (
              <p className="text-xs md:text-sm text-gray-300">
                Are you sure you want to delete <br />
                <span className="font-mono text-sm bg-active px-1.5 py-1 rounded my-2 inline-block">{targetName}</span>?<br />
                This action cannot be undone.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2 p-3 md:p-4 bg-active/50 border-t border-border">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" size="sm" variant={config.type === 'delete' ? 'danger' : 'primary'} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {config.type === 'delete' ? 'Delete' : 'Confirm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- Main File Explorer Component ---

interface FileExplorerProps {
  files: Record<string, ProjectFile>;
  activeFile: string | null;
  highlightedFiles: Set<string>;
  onFileSelect: (path: string) => void;
  onCreate: (path: string, isFolder: boolean) => void;
  onRename: (oldPath: string, newPath: string) => void;
  onDelete: (path: string) => void;
  onDuplicate: (oldPath: string, newPath: string) => void;
  isMobile: boolean; // Add isMobile prop
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFile, highlightedFiles, onFileSelect, onCreate, onRename, onDelete, onDuplicate, isMobile }) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '/': true });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string, isFolder: boolean } | null>(null);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedPath, setDraggedPath] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  
  const dragStateRef = useRef({
      isDragging: false,
      draggedPath: null as string | null,
      dragOverPath: null as string | null,
      startX: 0,
      startY: 0
  });
  
  useEffect(() => {
    if (activeFile && !searchQuery) {
        const parts = activeFile.split('/').filter(Boolean);
        let currentPath = '';
        const newExpanded: Record<string, boolean> = { ...expandedFolders, '/': true };
        for (let i = 0; i < parts.length - 1; i++) {
            currentPath += '/' + parts[i];
            newExpanded[currentPath] = true;
        }
        setExpandedFolders(newExpanded);
    }
  }, [activeFile, searchQuery]);
  
  // Handlers to open the modal
  const handleCreate = (basePath: string, isFolder: boolean) => {
    setModalConfig({
      type: isFolder ? 'createFolder' : 'createFile',
      path: basePath,
      onConfirm: (name) => {
        if (name) {
          const newPath = (basePath === '/' ? '' : basePath) + '/' + name;
          onCreate(newPath, isFolder);
          if (isFolder) {
            setExpandedFolders(prev => ({ ...prev, [newPath]: true, [basePath]: true }));
          } else {
            setExpandedFolders(prev => ({ ...prev, [basePath]: true }));
          }
        }
      }
    });
  };

  const handleRename = (path: string) => {
    const oldName = path.split('/').pop() || '';
    setModalConfig({
      type: 'rename',
      path: path,
      currentName: oldName,
      onConfirm: (newName) => {
        if (newName && newName !== oldName) {
          const newPath = path.substring(0, path.lastIndexOf('/')) + '/' + newName;
          onRename(path, newPath);
        }
      }
    });
  };

  const handleDelete = (path: string) => {
    setModalConfig({
      type: 'delete',
      path: path,
      currentName: path.split('/').pop() || path,
      onConfirm: () => {
        onDelete(path);
      }
    });
  };
  
  const handleDuplicate = (path: string) => {
    const isFile = !!files[path];
    if (!isFile) return;

    const dir = path.substring(0, path.lastIndexOf('/'));
    const name = path.substring(path.lastIndexOf('/') + 1);
    const extIndex = name.lastIndexOf('.');
    const baseName = extIndex !== -1 ? name.substring(0, extIndex) : name;
    const extension = extIndex !== -1 ? name.substring(extIndex) : '';

    let newPath = '';
    let copyNum = 1;
    
    while (true) {
        const copySuffix = copyNum === 1 ? '-copy' : `-copy-${copyNum}`;
        const tempName = `${baseName}${copySuffix}${extension}`;
        const tempPath = (dir === '' ? '' : dir) + '/' + tempName;
        if (!files[tempPath]) {
            newPath = tempPath;
            break;
        }
        copyNum++;
    }
    onDuplicate(path, newPath);
  };
  
  const openContextMenu = (e: React.MouseEvent, path: string, isFolder: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({ x: rect.left, y: rect.bottom + 4, path, isFolder });
  };
  
  const fileTree = useMemo(() => {
    const root: Record<string, any> = { name: 'root', path: '/', isFolder: true, children: {} };
    const allPaths = new Set(Object.keys(files).map(p => p.substring(0, p.lastIndexOf('/')) || '/'));
    
    allPaths.forEach(folderPath => {
      const parts = folderPath.split('/').filter(Boolean);
      let current = root.children;
      let pathAccumulator = '';
      parts.forEach(part => {
        pathAccumulator += '/' + part;
        if (!current[part]) {
          current[part] = { name: part, path: pathAccumulator, isFolder: true, children: {} };
        }
        current = current[part].children;
      });
    });

    Object.values(files).forEach((file: ProjectFile) => {
      if (file.name === '.keep') return;
      const parts = file.path.split('/').filter(Boolean);
      const fileName = parts.pop();
      if (!fileName) return;

      let current = root.children;
      parts.forEach(part => {
        if (current[part]) current = current[part].children;
      });
      current[fileName] = { ...file, isFile: true };
    });
    return root;
  }, [files]);
  
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return fileTree;
    const query = searchQuery.toLowerCase();

    const filterNode = (node: any): any | null => {
      if (node.isFile) {
        return node.name.toLowerCase().includes(query) ? node : null;
      }
      
      if (node.isFolder) {
        // If folder name matches, return the whole sub-tree
        if (node.name.toLowerCase().includes(query)) return node;

        const filteredChildren: Record<string, any> = {};
        let hasVisibleChildren = false;

        Object.values(node.children).forEach((child: any) => {
            const filteredChild = filterNode(child);
            if (filteredChild) {
                filteredChildren[child.name] = filteredChild;
                hasVisibleChildren = true;
            }
        });

        if (hasVisibleChildren) {
            return { ...node, children: filteredChildren };
        }
      }
      return null;
    };
    
    const newRoot = { ...fileTree, children: {} };
    Object.values(fileTree.children).forEach((child: any) => {
      const filteredChild = filterNode(child);
      if (filteredChild) {
        newRoot.children[child.name] = filteredChild;
      }
    });
    return newRoot;
  }, [fileTree, searchQuery]);

  // Auto-expand folders when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const expandAll = (node: any, expanded: Record<string, boolean>) => {
        if (node.isFolder) {
          expanded[node.path] = true;
          Object.values(node.children).forEach((child: any) => expandAll(child, expanded));
        }
      };
      const newExpanded = { '/': true };
      expandAll(filteredTree, newExpanded);
      setExpandedFolders(newExpanded);
    }
  }, [searchQuery, filteredTree]);

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, path: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ path }));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => setDraggedPath(path), 0);
  };

  const handleDragEnd = () => {
    setDraggedPath(null);
    setDragOverPath(null);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, path: string) => {
    e.preventDefault();
    if (draggedPath && draggedPath !== path && !path.startsWith(draggedPath + '/')) {
      setDragOverPath(path);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverPath(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetFolderPath: string) => {
    e.preventDefault();
    if (!draggedPath) return;

    const sourceName = draggedPath.split('/').pop();
    if (!sourceName) return;
    
    const newPath = targetFolderPath === '/' ? `/${sourceName}` : `${targetFolderPath}/${sourceName}`;
    
    if (newPath !== draggedPath && !newPath.startsWith(draggedPath + '/')) {
      onRename(draggedPath, newPath);
    }
    handleDragEnd();
  };
  
    // --- Touch Drag and Drop Handlers ---
    const handleTouchMove = (e: TouchEvent) => {
        if (!dragStateRef.current.draggedPath) return;

        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - dragStateRef.current.startX);
        const dy = Math.abs(touch.clientY - dragStateRef.current.startY);

        if (!dragStateRef.current.isDragging && (dx > 10 || dy > 10)) {
            dragStateRef.current.isDragging = true;
            setDraggedPath(dragStateRef.current.draggedPath);
        }

        if (dragStateRef.current.isDragging) {
            e.preventDefault();
            const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
            let droppableElement = targetElement;
            while(droppableElement && !droppableElement.getAttribute('data-droppable')) {
                droppableElement = droppableElement.parentElement;
            }
            
            let newDragOverPath: string | null = null;
            if (droppableElement) {
                const path = droppableElement.getAttribute('data-path');
                const draggedP = dragStateRef.current.draggedPath;
                if (path && draggedP && path !== draggedP && !path.startsWith(draggedP + '/')) {
                    newDragOverPath = path;
                }
            }
            
            if (dragStateRef.current.dragOverPath !== newDragOverPath) {
                dragStateRef.current.dragOverPath = newDragOverPath;
                setDragOverPath(newDragOverPath);
            }
        }
    };

    const handleTouchEnd = () => {
        const { isDragging, draggedPath: currentDraggedPath, dragOverPath: currentDragOverPath } = dragStateRef.current;
        
        if (isDragging && currentDraggedPath && currentDragOverPath) {
            const sourceName = currentDraggedPath.split('/').pop();
            if (sourceName) {
                const newPath = currentDragOverPath === '/' ? `/${sourceName}` : `${currentDragOverPath}/${sourceName}`;
                if (newPath !== currentDraggedPath && !newPath.startsWith(currentDraggedPath + '/')) {
                    onRename(currentDraggedPath, newPath);
                }
            }
        }
        
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        
        setDraggedPath(null);
        setDragOverPath(null);
        
        // This brief delay ensures click handlers can check the isDragging flag before it's reset
        setTimeout(() => {
            dragStateRef.current.isDragging = false;
            dragStateRef.current.draggedPath = null;
            dragStateRef.current.dragOverPath = null;
        }, 50);
    };
    
    const handleTouchStart = (e: React.TouchEvent, path: string) => {
        dragStateRef.current = {
            isDragging: false,
            draggedPath: path,
            dragOverPath: null,
            startX: e.touches[0].clientX,
            startY: e.touches[0].clientY
        };
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { once: true });
    };

  const renderTree = (node: any, depth = 0) => {
    const entries = Object.values(node.children).sort((a: any, b: any) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    const indent = (depth * 10 + 8) + (isMobile ? 0 : depth * 6 + 4); 

    return entries.map((item: any) => {
      const isHighlighted = highlightedFiles.has(item.path);
      const isDragged = draggedPath === item.path;

      if (item.isFile) {
        return (
          <div 
            key={item.path}
            draggable="true"
            onDragStart={(e) => handleDragStart(e, item.path)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, item.path)}
            className={`group flex items-center gap-2 py-1 cursor-pointer text-xs md:text-sm border-l-2 transition-all duration-100 ${activeFile === item.path ? 'bg-[#37373d] text-white border-accent' : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-gray-200 border-transparent'} ${isHighlighted ? 'highlight-ai-change' : ''} ${isDragged ? 'opacity-40' : ''}`}
            style={{ paddingLeft: `${indent}px`, paddingRight: '8px' }}
            onClick={() => {
              if (dragStateRef.current.isDragging) return;
              onFileSelect(item.path);
            }}
          >
            <FileIcon type={item.type} />
            <span className="flex-1 truncate select-none">{item.name}</span>
            <button
                onClick={(e) => openContextMenu(e, item.path, false)}
                className="p-1 rounded hover:bg-active text-gray-500 hover:text-gray-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
                <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      } 
      const isExpanded = !!expandedFolders[item.path];
      const isDragOver = dragOverPath === item.path;
      return (
        <div key={item.path}>
          <div 
            draggable="true"
            onDragStart={(e) => handleDragStart(e, item.path)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, item.path)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, item.path)}
            onTouchStart={(e) => handleTouchStart(e, item.path)}
            data-droppable="true"
            data-path={item.path}
            className={`group flex items-center gap-1.5 py-1 cursor-pointer text-xs md:text-sm font-medium text-gray-300 hover:bg-[#2a2d2e] transition-colors duration-100 rounded-sm ${isHighlighted ? 'highlight-ai-change' : ''} ${isDragged ? 'opacity-40' : ''} ${isDragOver ? 'bg-accent/20 ring-1 ring-accent' : ''}`}
            style={{ paddingLeft: `${indent - 4}px`, paddingRight: '8px' }} // Adjust for chevron icon
            onClick={() => {
              if (dragStateRef.current.isDragging) return;
              setExpandedFolders(p => ({...p, [item.path]: !p[item.path]}));
            }}
          >
            <span className="opacity-70 shrink-0">{isExpanded ? <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />}</span>
            <span className="shrink-0">{isExpanded ? <FolderOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" /> : <Folder className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />}</span>
            <span className="flex-1 truncate select-none">{item.name}</span>
            <button
                onClick={(e) => openContextMenu(e, item.path, true)}
                className="p-1 rounded hover:bg-active text-gray-500 hover:text-gray-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
                <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
          {isExpanded && renderTree(item, depth + 1)}
        </div>
      );
    });
  };

  const getContextMenuOptions = () => {
    if (!contextMenu) return [];
    const { path, isFolder } = contextMenu;
    const parentPath = isFolder ? path : path.substring(0, path.lastIndexOf('/')) || '/';
    
    const options: any[] = [
        { label: 'New File', action: () => handleCreate(parentPath, false), icon: <FilePlus className="w-3 h-3 md:w-3.5 md:h-3.5" /> },
        { label: 'New Folder', action: () => handleCreate(parentPath, true), icon: <FolderPlus className="w-3 h-3 md:w-3.5 md:h-3.5" /> },
    ];
    
    if (!isFolder) {
      options.push({ label: 'Duplicate', action: () => handleDuplicate(path), icon: <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" /> });
    }

    options.push(
      { label: 'Rename', action: () => handleRename(path), icon: <Edit2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> },
      { label: 'Delete', action: () => handleDelete(path), icon: <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />, isDestructive: true }
    );
    
    return options;
  };

  return (
    <div className="h-full flex flex-col bg-sidebar select-none relative">
      {modalConfig && <ActionModal config={modalConfig} onClose={() => setModalConfig(null)} />}

      <div className="h-8 md:h-9 px-3 md:px-4 flex items-center justify-between group shrink-0">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Explorer</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => handleCreate('/', false)} className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white" title="New File at Root"><FilePlus className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
          <button onClick={() => handleCreate('/', true)} className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white" title="New Folder at Root"><FolderPlus className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
        </div>
      </div>
      
      <div className="px-2 pb-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 md:w-3.5 md:h-3.5 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-transparent focus:border-accent text-white rounded-md pl-8 pr-8 py-1.5 text-xs outline-none transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto custom-scrollbar"
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, '/')}
        onDrop={(e) => handleDrop(e, '/')}
        data-droppable="true"
        data-path="/"
      >
        {searchQuery && Object.keys(filteredTree.children).length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">No files found.</div>
        ) : (
          renderTree(searchQuery ? filteredTree : fileTree)
        )}
      </div>
      
      {contextMenu && (
        <ContextMenu 
            x={contextMenu.x}
            y={contextMenu.y}
            options={getContextMenuOptions()}
            onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};