

import { supabase } from './supabaseClient';
import { Project, File, ChatSession, ChatMessage, Checkpoint, Profile, PublishedProject } from '../types';

// --- TEMPLATES ---
const STARTER_TEMPLATE_FILES: Record<string, File> = {
  '/index.html': {
    path: '/index.html', name: 'index.html', type: 'html', content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebBench Starter</title>
    <style>body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #111; color: white; }</style>
</head>
<body>
    <h1>Welcome to WebBench</h1>
</body>
</html>`, lastModified: Date.now()
  }
};


export const projectService = {
  // --- Auth & Profile ---
  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      throw new Error("Could not verify user session. Please try logging in again.");
    }
  },

  async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) return null;
      return data;
    } catch (e) {
      console.error("Error fetching profile", e);
      return null;
    }
  },

  async uploadAvatar(userId: string, file: globalThis.File): Promise<string> {
    try {
      // 1. Get current profile to check for existing avatar
      const currentProfile = await this.getUserProfile(userId);
      const oldAvatarUrl = currentProfile?.avatar_url;

      // 2. Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 4. Delete old avatar if it exists and is in the same bucket
      if (oldAvatarUrl && oldAvatarUrl.includes('/storage/v1/object/public/avatars/')) {
        try {
            const oldPath = oldAvatarUrl.split('/avatars/').pop();
            if (oldPath) {
              await supabase.storage.from('avatars').remove([oldPath]);
            }
        } catch(e) {
            console.warn("Failed to delete old avatar", e);
        }
      }

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      throw new Error("Failed to upload image.");
    }
  },

  async updateUserProfile(userId: string, updates: Partial<Profile>) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() });
      
      if (error) throw error;
      
      // Also update auth metadata for faster access
      if (updates.name || updates.avatar_url) {
        await supabase.auth.updateUser({
          data: {
             name: updates.name,
             avatar_url: updates.avatar_url
          }
        });
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      throw new Error(error.message || "Failed to update profile.");
    }
  },

  async signInWithPassword(email, password) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      console.error("Sign in error:", error);
      if (error.message === 'Invalid login credentials') {
        throw new Error("Invalid login credentials. Please double-check your email and password.");
      }
      throw new Error(error.message || "Failed to sign in.");
    }
  },

  async signUp(email, password, name, avatarUrl = '') {
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            name: name,
            avatar_url: avatarUrl
          }
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Sign up error:", error);
      throw new Error(error.message || "Failed to create account.");
    }
  },

  async signInWithOAuth(provider: 'github') {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
    } catch (error: any) {
      console.error("OAuth sign in error:", error);
      throw new Error(error.message || `Failed to sign in with ${provider}.`);
    }
  },

  async resetPasswordForEmail(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Password reset error:", error);
      throw new Error(error.message || "Failed to send password reset email.");
    }
  },

  async updateUserPassword(password: string) {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (error: any) {
      console.error("Password update error:", error);
      throw new Error(error.message || "Failed to update password.");
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error("Sign out error:", error);
      throw new Error("Failed to sign out.");
    }
  },

  // --- Community / Web Projects ---
  async publishProject(project: Project, title: string, description: string, tags: string[] = []): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const payload = {
        user_id: user.id,
        original_project_id: project.id,
        title: title,
        description: description,
        files: project.files,
        type: project.type,
        tags: tags
      };

      const { data, error } = await supabase
        .from('published_projects')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      console.error("Error publishing project:", error);
      throw new Error(error.message || "Failed to publish project.");
    }
  },

  async getCommunityProjects(): Promise<PublishedProject[]> {
    try {
      // Fetch projects with profile data using the foreign key relationship
      const { data, error } = await supabase
        .from('published_projects')
        .select('*, profiles(name, avatar_url)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        user_id: p.user_id,
        author: {
          name: p.profiles?.name || 'Anonymous',
          avatar_url: p.profiles?.avatar_url || ''
        },
        files: p.files,
        type: p.type,
        tags: p.tags || [],
        views_count: p.views_count || 0,
        likes_count: p.likes_count || 0,
        created_at: p.created_at
      }));
    } catch (error: any) {
      console.error("Error fetching community projects:", error);
      return [];
    }
  },

  async getPublishedProject(id: string): Promise<PublishedProject | null> {
    try {
      const { data, error } = await supabase
        .from('published_projects')
        .select('*, profiles(name, avatar_url)')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Increment view count safely
      try {
        await supabase.rpc('increment_view_count', { project_id: id });
      } catch (e) {
        console.warn("Failed to increment view count", e);
      }

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        user_id: data.user_id,
        author: {
          name: data.profiles?.name || 'Anonymous',
          avatar_url: data.profiles?.avatar_url || ''
        },
        files: data.files,
        type: data.type,
        tags: data.tags || [],
        views_count: data.views_count,
        likes_count: data.likes_count,
        created_at: data.created_at
      };
    } catch (error: any) {
      console.error("Error fetching published project:", error);
      return null;
    }
  },

  // --- Project CRUD ---
  async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data.map((p: any) => ({
        ...p,
        createdAt: new Date(p.created_at).getTime(),
        updatedAt: new Date(p.updated_at).getTime(),
        files: p.files || {},
        type: p.type || 'starter'
      }));
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      throw new Error(`Could not load projects: ${error.message}`);
    }
  },

  async getProject(id: string): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;

      return {
        ...data,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
        files: data.files || {},
        type: data.type || 'starter'
      };
    } catch (error: any) {
      // Check if it matches a published project ID format (optional fallback logic handled in UI)
      if (error.code === 'PGRST116' || error.message.includes("not found")) {
        throw new Error("Project not found.");
      }
      throw new Error(`Could not load the project: ${error.message}`);
    }
  },

  async createProject(name: string, type: Project['type'] = 'starter'): Promise<Project> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const files = STARTER_TEMPLATE_FILES; 

      const { data, error } = await supabase
        .from('projects')
        .insert({ user_id: user.id, name, files, type })
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
        files: data.files,
        type: data.type
      };
    } catch (error: any) {
      console.error("Error creating project:", error);
      throw new Error(error.message || "Failed to create the project.");
    }
  },

  async renameProject(projectId: string, newName: string) {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', projectId);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error renaming project:", error);
      throw new Error(error.message || "Failed to rename project.");
    }
  },

  async updateProject(projectId: string, updates: Partial<Project>) {
    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.name) payload.name = updates.name;
      if (updates.files) payload.files = updates.files;

      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', projectId);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating project:", error);
      throw new Error(error.message || "Failed to save project changes.");
    }
  },

  async deleteProject(projectId: string) {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error deleting project:", error);
      throw new Error(error.message || "Failed to delete project.");
    }
  },

  // --- Chat Sessions & Messages ---
  async getChatSessions(projectId: string): Promise<ChatSession[]> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*, chat_messages(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((s: any) => ({
        id: s.id,
        name: s.name,
        createdAt: new Date(s.created_at).getTime(),
        messages: (s.chat_messages || [])
          .map((m: any) => ({ 
            id: m.id,
            clientId: m.client_id,
            session_id: m.session_id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at).getTime(),
            model: m.model,
            attachments: m.attachments,
            sources: m.sources,
            completedFiles: m.completed_files,
            isError: m.is_error || false,
          }))
          .sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp),
      }));
    } catch (error: any) {
      console.error('Error fetching chat sessions:', error);
      throw new Error(`Could not load chat sessions: ${error.message}`);
    }
  },

  async createChatSession(projectId: string, name: string): Promise<ChatSession> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ project_id: projectId, user_id: user.id, name })
        .select()
        .single();
      
      if (error) throw error;

      return {
        ...data,
        createdAt: new Date(data.created_at).getTime(),
        messages: []
      };
    } catch (error: any) {
      const message = (error as Error).message || 'Failed to create chat session.';
      console.error('Error creating chat session:', error);
      throw new Error(message);
    }
  },

  async saveChatMessage(message: ChatMessage): Promise<ChatMessage> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated to save message.');

      const payload: any = {
        user_id: user.id,
        client_id: message.clientId,
        session_id: message.session_id,
        role: message.role,
        content: message.content,
      };
      
      if (message.model !== undefined) payload.model = message.model;
      if (message.attachments !== undefined) payload.attachments = message.attachments;
      if (message.sources !== undefined) payload.sources = message.sources;
      if (message.completedFiles !== undefined) payload.completed_files = message.completedFiles;
      if (message.isError !== undefined) payload.is_error = message.isError;
      
      const { data, error } = await supabase
        .from('chat_messages')
        .upsert(payload, { onConflict: 'session_id,client_id' })
        .select()
        .single();

      if (error) throw error;
      
      return {
          ...message,
          id: data.id,
          timestamp: new Date(data.created_at).getTime(),
      };
    } catch (error: any) {
      const message = (error as Error).message || 'Failed to save chat message.';
      console.error('Error saving chat message:', error);
      throw new Error(message);
    }
  },
  
  async deleteChatMessage(message: string) {
    try {
      const { error } = await supabase.from('chat_messages').delete().eq('id', message);
      if (error) throw error;
    } catch (error: any) {
      throw new Error((error as Error).message || 'Failed to delete message.');
    }
  },

  async deleteChatSession(sessionId: string) {
    try {
      const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId);
      if (error) throw error;
    } catch (error: any) {
      throw new Error((error as Error).message || 'Failed to delete chat session.');
    }
  },

  // --- Checkpoints ---
  async getCheckpointsForProject(projectId: string): Promise<Checkpoint[]> {
    try {
      const { data, error } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((c: any) => ({
        ...c,
        createdAt: new Date(c.created_at).getTime(),
      }));
    } catch (error: any) {
      console.error('Error fetching checkpoints:', error);
      return [];
    }
  },

  async createCheckpoint(projectId: string, name: string, files: Record<string, File>): Promise<Checkpoint> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('checkpoints')
        .insert({ project_id: projectId, user_id: user.id, name, files })
        .select()
        .single();
      
      if (error) throw error;

      return {
        ...data,
        createdAt: new Date(data.created_at).getTime(),
        files: data.files,
      };
    } catch (error: any) {
       const message = (error as Error).message || 'Failed to create checkpoint.';
      console.error('Error creating checkpoint:', error);
      throw new Error(message);
    }
  },

  async deleteCheckpoint(checkpointId: string) {
    try {
      const { error } = await supabase
        .from('checkpoints')
        .delete()
        .eq('id', checkpointId);
      if (error) throw error;
    } catch (error: any) {
      throw new Error((error as Error).message || 'Failed to delete checkpoint.');
    }
  },
};