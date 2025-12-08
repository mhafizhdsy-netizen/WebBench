
export interface File {
  path: string;
  name: string;
  content: string;
  type: 'html' | 'css' | 'javascript' | 'json' | 'markdown' | 'image' | 'folder' | 'plaintext' | 'typescript' | 'tsx' | 'python' | 'php' | 'cpp' | 'blade' | 'vite' | 'next';
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
  type?: 'blank' | 'starter' | 'react-vite' | 'nextjs' | 'laravel' | 'python' | 'php' | 'cpp';
  user_id?: string;
}

export interface Profile {
  id: string;
  email: string; // Optional, usually derived from Auth
  name: string;
  avatar_url?: string;
}

export interface PublishedProject {
  id: string;
  title: string;
  description: string;
  user_id: string;
  author: {
    name: string;
    avatar_url: string;
  };
  files: Record<string, File>;
  type: Project['type'];
  tags: string[];
  views_count: number;
  likes_count: number;
  created_at: string; // ISO String
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

export interface GitState {
  branch: string;
  unstagedFiles: string[];
  stagedFiles: string[];
  commits: Commit[];
  remoteUrl: string | null;
}

export interface Commit {
  id: string;
  message: string;
  author: string;
  timestamp: number;
  files: Record<string, File>;
}

export type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: any[];
  timestamp: number;
  count?: number;
}