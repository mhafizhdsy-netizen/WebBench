import React, { useState } from 'react';
import { projectService } from '../../services/projectService';
import { Button } from '../ui/Button';
import { X, Loader2, Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface ResetPasswordProps {
  onDone: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await projectService.updateUserPassword(password);
      setSuccess(true);
      setTimeout(onDone, 3000); // Close modal after 3 seconds on success
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-4 animate-fade-in">
      <div className="w-full max-w-xs md:max-w-md bg-sidebar border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-border">
          <h2 className="text-lg md:text-xl font-semibold text-white">Set New Password</h2>
          <button onClick={onDone} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        
        {success ? (
          <div className="p-6 md:p-8 text-center">
            <CheckCircle className="w-14 h-14 md:w-16 md:h-16 text-green-500 mx-auto mb-3 md:mb-4" />
            <h3 className="text-xl md:text-2xl font-bold text-white">Password Updated!</h3>
            <p className="text-sm text-gray-400 mt-2">You can now log in with your new password. This window will close shortly.</p>
            {/* onDone is called after a timeout, so no explicit button here */}
          </div>
        ) : (
          <form onSubmit={handleReset} className="p-4 md:p-6">
            {error && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-xs md:text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-1.5 md:space-y-2 mb-4 md:mb-6">
              <label className="text-sm font-medium text-gray-300 ml-1">New Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-500 group-focus-within:text-accent transition-colors" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-[#252526] border border-border focus:border-accent text-white rounded-lg px-3 py-2 text-sm md:px-4 md:py-3 md:text-base pl-9 md:pl-10 outline-none transition-all focus:ring-1 focus:ring-accent/50 placeholder:text-gray-600" 
                  placeholder="••••••••" 
                  required 
                  minLength={6} 
                />
              </div>
              <p className="text-xs text-gray-500 ml-1">Must be at least 6 characters long.</p>
            </div>
            <div className="flex justify-end gap-3 pt-3 md:pt-4 border-t border-border">
              <Button type="button" variant="secondary" size="md" onClick={onDone} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" size="md" disabled={loading || !password}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Set Password
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
