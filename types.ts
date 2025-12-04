export interface File {
  path: string;
  name: string;
  content: string;
  type: 'html' | 'css' | 'javascript' | 'json' | 'markdown' | 'image' | 'folder';
  lastModified: number;
}

export interface FolderStructure {
  path: string;
  name: string;
  type: 'folder';
  children: (FolderStructure | File)[];
  isOpen?: boolean;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  files: Record<string, File>;
  lastOpenedFile?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isLoading?: boolean;
  attachments?: { name: string; type: string; dataUrl: string }[];
  isDeepThink?: boolean;
  completedFiles?: string[];
  isApplyingChanges?: boolean;
  liveStream?: {
    currentFile: string;
    currentCode: string;
    language: string;
  }
}

export interface EditorConfig {
  fontSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  theme: string;
}

export type PanelType = 'files' | 'editor' | 'preview' | 'ai';

export interface User {
  id: string;
  email: string;
  name: string;
}