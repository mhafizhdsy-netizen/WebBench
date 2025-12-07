import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeId = 'vscode' | 'dracula' | 'midnight' | 'forest' | 'cyberpunk' | 'coffee';

interface ThemeColors {
  background: string;
  sidebar: string;
  active: string;
  activeTab: string;
  accent: string;
  border: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  colors: ThemeColors;
}

export const THEMES: Theme[] = [
  {
    id: 'vscode',
    name: 'VS Code Dark',
    colors: {
      background: '#1e1e1e',
      sidebar: '#252526',
      active: '#2d2d30',
      activeTab: '#1e1e1e',
      accent: '#007acc',
      border: '#3e3e42'
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: {
      background: '#282a36',
      sidebar: '#21222c',
      active: '#44475a',
      activeTab: '#282a36',
      accent: '#ff79c6',
      border: '#6272a4'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    colors: {
      background: '#0f172a',
      sidebar: '#1e293b',
      active: '#334155',
      activeTab: '#0f172a',
      accent: '#38bdf8',
      border: '#1e293b'
    }
  },
  {
    id: 'forest',
    name: 'Enchanted Forest',
    colors: {
      background: '#1a2f23',
      sidebar: '#14251b',
      active: '#243e30',
      activeTab: '#1a2f23',
      accent: '#4ade80',
      border: '#2d4a3e'
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    colors: {
      background: '#09090b',
      sidebar: '#18181b',
      active: '#27272a',
      activeTab: '#09090b',
      accent: '#f472b6',
      border: '#3f3f46'
    }
  },
  {
    id: 'coffee',
    name: 'Warm Coffee',
    colors: {
      background: '#2b211e',
      sidebar: '#231b18',
      active: '#3d2e2b',
      activeTab: '#2b211e',
      accent: '#d97706',
      border: '#453531'
    }
  }
];

interface EditorSettings {
  fontSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  lineNumbers: 'on' | 'off';
  formatOnType: boolean;
  autoSave: boolean;
}

interface SettingsContextType {
  currentTheme: ThemeId;
  setTheme: (id: ThemeId) => void;
  editorSettings: EditorSettings;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme State
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    return (localStorage.getItem('webbench_theme') as ThemeId) || 'vscode';
  });

  // Editor Settings State
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    const saved = localStorage.getItem('webbench_editor_settings');
    return saved ? JSON.parse(saved) : {
      fontSize: 14,
      wordWrap: 'on',
      minimap: true,
      lineNumbers: 'on',
      formatOnType: true,
      autoSave: true
    };
  });

  // Apply Theme CSS Variables
  useEffect(() => {
    const theme = THEMES.find(t => t.id === currentTheme) || THEMES[0];
    const root = document.documentElement;

    root.style.setProperty('--bg-background', theme.colors.background);
    root.style.setProperty('--bg-sidebar', theme.colors.sidebar);
    root.style.setProperty('--bg-active', theme.colors.active);
    root.style.setProperty('--col-accent', theme.colors.accent);
    root.style.setProperty('--col-border', theme.colors.border);

    localStorage.setItem('webbench_theme', currentTheme);
  }, [currentTheme]);

  // Persist Editor Settings
  useEffect(() => {
    localStorage.setItem('webbench_editor_settings', JSON.stringify(editorSettings));
  }, [editorSettings]);

  const updateEditorSettings = (settings: Partial<EditorSettings>) => {
    setEditorSettings(prev => ({ ...prev, ...settings }));
  };

  return (
    <SettingsContext.Provider value={{ currentTheme, setTheme: setCurrentTheme, editorSettings, updateEditorSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook alias
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a ThemeProvider');
  }
  return context;
};

// Maintain backward compatibility with existing code
export const useTheme = useSettings;