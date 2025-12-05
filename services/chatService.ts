import { ChatMessage } from '../types';

const CHAT_HISTORY_PREFIX = 'webbench_chat_history_';

const getInitialMessage = (): ChatMessage => ({
  clientId: 'initial-client-id-0',
  session_id: 'initial-session-id-0',
  role: 'assistant',
  content: 'Hello! I\'m your WebBench AI assistant. Ask me to create features, fix bugs, or style your page.',
  timestamp: Date.now()
});

export const chatService = {
  getChatHistory(projectId: string): ChatMessage[] {
    const key = `${CHAT_HISTORY_PREFIX}${projectId}`;
    const storedHistory = localStorage.getItem(key);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse chat history from localStorage", e);
        // Fall through to return initial message
      }
    }
    // Return initial message if no history is found or it's empty/invalid
    return [getInitialMessage()];
  },

  saveChatHistory(projectId: string, messages: ChatMessage[]) {
    if (!projectId) return;
    try {
      const key = `${CHAT_HISTORY_PREFIX}${projectId}`;
      // Prevent saving just the initial welcome message by itself
      if (messages.length === 1 && messages[0].clientId === 'initial-client-id-0') {
        localStorage.removeItem(key);
        return;
      }
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history to localStorage", e);
    }
  },

  clearChatHistory(projectId: string) {
    const key = `${CHAT_HISTORY_PREFIX}${projectId}`;
    localStorage.removeItem(key);
  }
};