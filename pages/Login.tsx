
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Button } from '../components/ui/Button';
import { WebBenchLoader } from '../components/ui/Loader';
import { SEO } from '../components/ui/SEO';
import { WebBenchLogo } from '../components/ui/WebBenchLogo';
import { Mail, Lock, AlertCircle, ArrowRight, Github, Cpu, Sparkles, CheckCircle2, ArrowLeft, Loader2, User } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

// Helper functions for validation
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email address.';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
};

const AuthFormComponent = ({ 
  handleAuth, 
  email, setEmail, emailError, setEmailError,
  password, setPassword, passwordError, setPasswordError,
  name, setName,
  setMode, clearState, 
  loading, mode 
}: any) => (
  <form onSubmit={handleAuth} className="space-y-4">
    {mode === 'signup' && (
      <div className="space-y-1.5 animate-fade-in">
        <label htmlFor="fullName" className="text-sm font-medium text-gray-300 ml-1">Full Name</label>
        <div className="relative group">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-accent transition-colors" />
          <input 
            type="text" 
            id="fullName"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full bg-white/5 border border-gray-700/50 focus:border-accent/80 text-white rounded-lg px-3 py-2 text-sm md:px-4 md:py-3 md:text-base pl-9 outline-none transition-all focus:ring-1 focus:ring-accent/50 placeholder:text-gray-600" 
            placeholder="John Doe" 
            required={mode === 'signup'} 
          />
        </div>
      </div>
    )}
    <div className="space-y-1.5">
      <label htmlFor="email" className="text-sm font-medium text-gray-300 ml-1">Email</label>
      <div className="relative group">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-accent transition-colors" />
        <input 
          type="email" 
          id="email"
          value={email} 
          onChange={(e) => { setEmail(e.target.value); setEmailError(validateEmail(e.target.value)); }} 
          onBlur={(e) => setEmailError(validateEmail(e.target.value))}
          className={`w-full bg-white/5 border ${emailError ? 'border-red-500/80 focus:border-red-500' : 'border-gray-700/50 focus:border-accent/80'} text-white rounded-lg px-3 py-2 text-sm md:px-4 md:py-3 md:text-base pl-9 outline-none transition-all focus:ring-1 ${emailError ? 'focus:ring-red-500/50' : 'focus:ring-accent/50'} placeholder:text-gray-600`} 
          placeholder="you@example.com" 
          required 
        />
      </div>
      {emailError && <p className="text-xs text-red-400 mt-1 ml-1 animate-fade-in">{emailError}</p>}
    </div>
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label htmlFor="password" className="text-sm font-medium text-gray-300 ml-1">Password</label>
        {mode === 'login' && <button type="button" onClick={() => { setMode('forgot'); clearState(); }} className="text-xs text-accent hover:text-blue-400 hover:underline transition-colors">Forgot?</button>}
      </div>
      <div className="relative group">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-accent transition-colors" />
        <input 
          type="password" 
          id="password"
          value={password} 
          onChange={(e) => { setPassword(e.target.value); setPasswordError(validatePassword(e.target.value)); }} 
          onBlur={(e) => setPasswordError(validatePassword(e.target.value))}
          className={`w-full bg-white/5 border ${passwordError ? 'border-red-500/80 focus:border-red-500' : 'border-gray-700/50 focus:border-accent/80'} text-white rounded-lg px-3 py-2 text-sm md:px-4 md:py-3 md:text-base pl-9 outline-none transition-all focus:ring-1 ${passwordError ? 'focus:ring-red-500/50' : 'focus:ring-accent/50'} placeholder:text-gray-600`} 
          placeholder="••••••••" 
          required 
        />
      </div>
      {passwordError && <p className="text-xs text-red-400 mt-1 ml-1 animate-fade-in">{passwordError}</p>}
    </div>
    <Button type="submit" size="md" className="w-full !h-10 md:!h-12 !text-base !bg-gradient-to-r from-accent to-blue-500 hover:from-blue-600 hover:to-accent text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all duration-300 transform hover:-translate-y-0.5" disabled={loading || emailError || passwordError || (mode === 'signup' && !name.trim())}>
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
  email, setEmail, emailError, setEmailError,
  setMode, clearState, 
  loading 
}: any) => (
  <form onSubmit={handlePasswordResetRequest} className="space-y-4">
     <button type="button" onClick={() => { setMode('login'); clearState(); }} className="text-sm text-accent hover:text-blue-400 flex items-center gap-1.5 mb-2 hover:underline transition-colors">
      <ArrowLeft className="w-4 h-4" />
      Back to Sign In
    </button>
    <div className="space-y-1.5">
      <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-300 ml-1">Email</label>
      <div className="relative group">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-accent transition-colors" />
        <input 
          type="email" 
          id="resetEmail"
          value={email} 
          onChange={(e) => { setEmail(e.target.value); setEmailError(validateEmail(e.target.value)); }} 
          onBlur={(e) => setEmailError(validateEmail(e.target.value))}
          className={`w-full bg-white/5 border ${emailError ? 'border-red-500/80 focus:border-red-500' : 'border-gray-700/50 focus:border-accent/80'} text-white rounded-lg px-3 py-2 text-sm md:px-4 md:py-3 md:text-base pl-9 outline-none transition-all focus:ring-1 ${emailError ? 'focus:ring-red-500/50' : 'focus:ring-accent/50'} placeholder:text-gray-600`} 
          placeholder="you@example.com" 
          required 
        />
      </div>
      {emailError && <p className="text-xs text-red-400 mt-1 ml-1 animate-fade-in">{emailError}</p>}
    </div>
    <Button type="submit" size="md" className="w-full !h-10 md:!h-12 !text-base !bg-gradient-to-r from-accent to-blue-500 hover:from-blue-600 hover:to-accent text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all duration-300 transform hover:-translate-y-0.5" disabled={loading || emailError}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
    </Button>
  </form>
);

const Login: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const clearState = () => {
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setName('');
    setEmailError(null);
    setPasswordError(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    setEmailError(validateEmail(email));
    setPasswordError(validatePassword(password));

    if (emailError || passwordError || (!name.trim() && mode === 'signup')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signup') {
        await projectService.signUp(email, password, name);
        setSuccessMessage("Account created! Please check your email to verify your account.");
        setMode('login');
        setPassword('');
      } else { // mode === 'login'
        await projectService.signInWithPassword(email, password);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    setEmailError(validateEmail(email));
    if (emailError) {
      return;
    }

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
  
  const handleSocialLogin = async (provider: 'github') => {
    try {
      // Store the intended redirect path before initiating OAuth
      localStorage.setItem('redirect_path', from);
      await projectService.signInWithOAuth(provider);
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}.`);
    }
  };

  return (
    <>
      <SEO 
        title="Login"
        description="Sign in to your WebBench account to access your projects or create a new account to start building with the power of AI."
        keywords="login, sign in, webbench account, AI developer tools"
      />
      <div className="h-[100dvh] bg-background text-gray-300 flex items-center justify-center p-4 bg-gradient-radial bg-grid-pattern">
        <div className="w-full max-w-sm md:max-w-md animate-fade-in">
          
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
                <WebBenchLogo className="w-10 h-10 md:w-12 md:h-12" />
                <span className="font-extrabold text-white text-3xl md:text-4xl tracking-tight">WebBench</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'signup' && 'Create your Account'}
              {mode === 'forgot' && 'Reset Your Password'}
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-1">
              {mode === 'login' && 'Sign in to access your projects.'}
              {mode === 'signup' && 'Start building with AI superpowers.'}
              {mode === 'forgot' && 'We\'ll send a recovery link to your email.'}
            </p>
          </div>

          <div className="bg-[#1e1e1e]/60 backdrop-blur-lg p-5 md:p-8 rounded-xl border border-gray-700/50 shadow-2xl">
            {error && (
              <div className="p-3 md:p-4 mb-4 bg-red-500/15 border border-red-500/30 rounded-lg flex items-start gap-2 md:gap-3 text-red-300 text-xs md:text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
               <div className="p-3 md:p-4 mb-4 bg-green-500/15 border border-green-500/30 rounded-lg flex items-start gap-2 md:gap-3 text-green-300 text-xs md:text-sm animate-fade-in">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5 text-green-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {mode === 'forgot' ? (
              <ForgotPasswordFormComponent 
                handlePasswordResetRequest={handlePasswordResetRequest}
                email={email}
                setEmail={setEmail}
                emailError={emailError}
                setEmailError={setEmailError}
                setMode={setMode}
                clearState={clearState}
                loading={loading}
              />
            ) : (
              <AuthFormComponent 
                handleAuth={handleAuth}
                email={email}
                setEmail={setEmail}
                emailError={emailError}
                setEmailError={setEmailError}
                password={password}
                setPassword={setPassword}
                passwordError={passwordError}
                setPasswordError={setPasswordError}
                name={name}
                setName={setName}
                setMode={setMode}
                clearState={clearState}
                loading={loading}
                mode={mode}
              />
            )}

            {mode !== 'forgot' && (
              <>
                <div className="my-6 flex items-center">
                  <div className="flex-grow border-t border-gray-700/50"></div>
                  <span className="flex-shrink mx-4 text-xs text-gray-500">OR</span>
                  <div className="flex-grow border-t border-gray-700/50"></div>
                </div>
                <div className="space-y-3">
                    <Button onClick={() => handleSocialLogin('github')} variant="secondary" size="md" className="w-full !h-10 md:!h-12 !text-base bg-[#2d2d30] hover:bg-[#3a3d41] border-gray-700/50 text-gray-200">
                      <Github className="w-4 h-4 md:w-5 md:h-5 text-[#f0f6fc]" />
                      <span className="ml-2">Continue with GitHub</span>
                    </Button>
                </div>
                <p className="text-center text-sm text-gray-500 mt-6">
                  {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                  <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); clearState(); }} className="font-medium text-accent hover:underline ml-1 hover:text-blue-400 transition-colors">
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </>
            )}
          </div>

          <div className="mt-8 text-center text-gray-500 text-xs space-y-4">
             <div className="flex justify-center items-center gap-6">
               <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent animate-pulse-slow"/> <span className="font-medium text-gray-300 text-sm">AI Powered</span></div>
               <div className="flex items-center gap-2"><Cpu className="w-4 h-4 text-accent animate-pulse-slow delay-100"/> <span className="font-medium text-gray-300 text-sm">Native Feel</span></div>
               <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent animate-pulse-slow delay-200"/> <span className="font-medium text-gray-300 text-sm">No Setup</span></div>
             </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Login;