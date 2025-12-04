import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Button } from '../components/ui/Button';
import { WebBenchLoader } from '../components/ui/Loader';
import { SEO } from '../components/ui/SEO';
import { Mail, Lock, AlertCircle, ArrowRight, Github, Cpu, Sparkles, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

// --- Sub-components moved outside the main component to prevent re-rendering on state change ---

const AuthFormComponent = ({ 
  handleAuth, 
  email, setEmail, 
  password, setPassword, 
  setMode, clearState, 
  loading, mode 
}: any) => (
  <form onSubmit={handleAuth} className="space-y-4">
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
      <div className="relative group">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-500 group-focus-within:text-accent transition-colors" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#252526] border border-border focus:border-accent text-white rounded-lg px-3 py-2 text-sm md:px-4 md:py-3 md:text-base pl-9 md:pl-10 outline-none transition-all focus:ring-1 focus:ring-accent/50 placeholder:text-gray-600" placeholder="you@example.com" required />
      </div>
    </div>
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
        <button type="button" onClick={() => { setMode('forgot'); clearState(); }} className="text-xs text-accent/80 hover:text-accent hover:underline">Forgot?</button>
      </div>
      <div className="relative group">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-500 group-focus-within:text-accent transition-colors" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#252526] border border-border focus:border-accent text-white rounded-lg px-3 py-2 text-sm md:px-4 md:py-3 md:text-base pl-9 md:pl-10 outline-none transition-all focus:ring-1 focus:ring-accent/50 placeholder:text-gray-600" placeholder="••••••••" required />
      </div>
    </div>
    <Button type="submit" size="md" className="w-full !h-10 md:!h-12 !text-base" disabled={loading}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <div className="flex items-center gap-2">
          <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </Button>
  </form>
);

const ForgotPasswordFormComponent = ({ 
  handlePasswordResetRequest, 
  email, setEmail, 
  setMode, clearState, 
  loading 
}: any) => (
  <form onSubmit={handlePasswordResetRequest} className="space-y-4">
     <button type="button" onClick={() => { setMode('login'); clearState(); }} className="text-sm text-accent/80 hover:text-accent flex items-center gap-1.5 mb-2 hover:underline">
      <ArrowLeft className="w-4 h-4" />
      Back to Sign In
    </button>
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
      <div className="relative group">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-500 group-focus-within:text-accent transition-colors" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#252526] border border-border focus:border-accent text-white rounded-lg px-3 py-2 text-sm md:px-4 md:py-3 md:text-base pl-9 md:pl-10 outline-none transition-all focus:ring-1 focus:ring-accent/50 placeholder:text-gray-600" placeholder="you@example.com" required />
      </div>
    </div>
    <Button type="submit" size="md" className="w-full !h-10 md:!h-12 !text-base" disabled={loading}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
    </Button>
  </form>
);

const Login: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const clearState = () => {
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signup') {
        await projectService.signUp(email, password);
        setSuccessMessage("Account created! Please check your email to verify your account.");
        setMode('login');
        setPassword('');
      } else { // mode === 'login'
        await projectService.signInWithPassword(email, password);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await projectService.resetPasswordForEmail(email);
      setSuccessMessage("Password reset link sent! Please check your email inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleGithubLogin = async () => {
    try {
      await projectService.signInWithOAuth('github');
    } catch (err: any) {
      setError(err.message || "Failed to sign in with GitHub.");
    }
  };

  return (
    <>
      <SEO 
        title="Login"
        description="Sign in to your WebBench account to access your projects or create a new account to start building with the power of AI."
        keywords="login, sign in, webbench account, AI developer tools"
      />
      <div className="min-h-screen bg-background text-gray-300 flex items-center justify-center p-4">
        <div className="w-full max-w-sm md:max-w-md animate-fade-in">
          
          <div className="text-center mb-6">
            <WebBenchLoader size="lg" className="mx-auto" />
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-4">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'signup' && 'Create your Account'}
              {mode === 'forgot' && 'Reset Your Password'}
            </h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">
              {mode === 'login' && 'Sign in to access your projects.'}
              {mode === 'signup' && 'Start building with AI superpowers.'}
              {mode === 'forgot' && 'We\'ll send a recovery link to your email.'}
            </p>
          </div>

          <div className="bg-sidebar p-5 md:p-8 rounded-xl border border-border shadow-2xl">
            {error && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-xs md:text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
               <div className="p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-2 text-green-400 text-xs md:text-sm animate-fade-in">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {mode === 'forgot' ? (
              <ForgotPasswordFormComponent 
                handlePasswordResetRequest={handlePasswordResetRequest}
                email={email}
                setEmail={setEmail}
                setMode={setMode}
                clearState={clearState}
                loading={loading}
              />
            ) : (
              <AuthFormComponent 
                handleAuth={handleAuth}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                setMode={setMode}
                clearState={clearState}
                loading={loading}
                mode={mode}
              />
            )}

            {mode !== 'forgot' && (
              <>
                <div className="my-6 flex items-center">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="flex-shrink mx-4 text-xs text-gray-500">OR</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>
                <Button variant="secondary" size="md" className="w-full !h-10 md:!h-12 !text-base" onClick={handleGithubLogin}>
                  <Github className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="ml-2">Continue with GitHub</span>
                </Button>
                <p className="text-center text-sm text-gray-500 mt-6">
                  {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                  <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); clearState(); }} className="font-medium text-accent hover:underline ml-1">
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </>
            )}
          </div>

          <div className="mt-8 text-center text-gray-600 text-xs space-y-3">
             <div className="flex justify-center items-center gap-4">
               <div className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-accent"/> AI Powered</div>
               <div className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-accent"/> Native Feel</div>
               <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent"/> No Setup</div>
             </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Login;
