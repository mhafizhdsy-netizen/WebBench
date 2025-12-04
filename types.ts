export interface File {
  path: string;
  name: string;
  content: string;
  type: 'html' | 'css' | 'javascript' | 'json' | 'markdown' | 'image' | 'folder' | 'plaintext';
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

export interface ChatSession {
  id: string; // DB UUID
  name: string;
  createdAt: number;
  messages: ChatMessage[];
}

export interface Checkpoint {
  id: string; // DB UUID
  name: string;
  createdAt: number;
  files: Record<string, File>;
}

export interface FileAction {
  action: 'create' | 'update' | 'delete';
  path: string;
}

export interface ChatMessage {
  clientId: string; // Client-side unique ID for optimistic updates
  id?: string; // DB UUID, available after save
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isLoading?: boolean;
  isError?: boolean;
  analysisText?: string;
  attachments?: { name: string; type: string; dataUrl: string }[];
  model?: string;
  completedFiles?: FileAction[];
  streamingCompletedFiles?: FileAction[];
  isApplyingChanges?: boolean;
  liveStream?: {
    currentFile: string;
    currentCode: string;
    language: string;
  };
  sources?: { uri: string; title: string }[];
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