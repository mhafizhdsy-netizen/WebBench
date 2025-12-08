
import React, { useState, useEffect, useRef } from 'react';
import { projectService } from '../../services/projectService';
import { Button } from '../ui/Button';
import { X, Loader2, User, Lock, CheckCircle, AlertCircle, Upload, Camera } from 'lucide-react';
import { Profile } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Form States
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); // For visual circle
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadProfile();
    }
  }, [isOpen, currentUser]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await projectService.getUserProfile(currentUser.id);
      if (data) {
        setProfile(data);
        setName(data.name || '');
        setAvatarUrl(data.avatar_url || '');
      } else {
        setName(currentUser.user_metadata?.name || '');
        setAvatarUrl(currentUser.user_metadata?.avatar_url || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate progress for visual feedback (since supabase upload doesn't provide fine-grained progress easily without TUS)
      const interval = setInterval(() => {
          setUploadProgress(prev => {
              if (prev >= 90) return prev;
              return prev + 10;
          });
      }, 200);

      try {
          const publicUrl = await projectService.uploadAvatar(currentUser.id, file);
          setAvatarUrl(publicUrl);
          setUploadProgress(100);
          setMessage({ type: 'success', text: 'Avatar uploaded successfully. Click Save to persist.' });
      } catch (err: any) {
          setMessage({ type: 'error', text: err.message });
          setUploadProgress(0);
      } finally {
          clearInterval(interval);
          setIsUploading(false);
          // Reset file input
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await projectService.updateUserProfile(currentUser.id, {
        name,
        avatar_url: avatarUrl
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await projectService.updateUserPassword(newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Circular Progress Calculation
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (uploadProgress / 100) * circumference;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-sidebar border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-white">Account Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {message && (
            <div className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
              {message.text}
            </div>
          )}

          {/* Profile Section */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 border-b border-border pb-2">Profile Information</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              
              <div className="flex flex-col items-center">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                      {/* Avatar Image */}
                      <div className="w-20 h-20 rounded-full bg-[#2d2d2d] overflow-hidden border-2 border-[#3e3e42] relative z-10">
                          {avatarUrl ? (
                              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                  <User className="w-8 h-8" />
                              </div>
                          )}
                           <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="w-6 h-6 text-white" />
                          </div>
                      </div>
                      
                      {/* Circular Progress (Visible during upload) */}
                      {isUploading && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 pointer-events-none z-0">
                               <svg className="w-full h-full transform -rotate-90">
                                  <circle
                                      cx="48"
                                      cy="48"
                                      r={radius}
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      fill="transparent"
                                      className="text-gray-700"
                                  />
                                  <circle
                                      cx="48"
                                      cy="48"
                                      r={radius}
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      fill="transparent"
                                      strokeDasharray={circumference}
                                      strokeDashoffset={strokeDashoffset}
                                      className="text-accent transition-all duration-300"
                                  />
                              </svg>
                          </div>
                      )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Click to upload new picture</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded pl-9 pr-3 py-2 outline-none"
                    placeholder="Your Name"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={loading || isUploading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Save Profile'}
                </Button>
              </div>
            </form>
          </section>

          {/* Password Section */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-border pb-2">Change Password</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded pl-9 pr-3 py-2 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#3c3c3c] border border-transparent focus:border-accent text-white rounded pl-9 pr-3 py-2 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="secondary" disabled={loading || !newPassword}>
                   {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Update Password'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
