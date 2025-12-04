import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { WebBenchLoader } from '../components/ui/Loader';
import { SEO } from '../components/ui/SEO';
import { Mail, Lock, AlertCircle, ArrowRight, Github, Cpu, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

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
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMessage("Account created successfully! Please check your email to verify your account.");
        setMode('login');
        setPassword('');
      } else { // mode === 'login'
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      setSuccessMessage("Password reset link sent! Please check your email inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleGithubLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/#/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to login with GitHub.");
    }
  };

  const getTitle = () => {
    if (mode === 'signup') return 'Create an account';
    if (mode === 'forgot') return 'Reset your password';
    return 'Welcome back';
  };

  const getDescription = () => {
    if (mode === 'signup') return 'Enter your details below to create your account';
    if (mode === 'forgot') return 'Enter your email to receive a password reset link';
    return 'Enter your email below to login to your account';
  };

  return (
    <>
      <SEO 
        title="Login"
        description="Sign in to your WebBench account to build, preview, and deploy modern websites with the power of AI. Your native-feel IDE in the browser."
        keywords="WebBench login, AI web development, frontend IDE, web builder, sign in"
      />
      <div className="min-h-screen bg-background flex text-gray-100 font-sans overflow-hidden">
        
        {loading && (
          <WebBenchLoader fullScreen text={mode === 'signup' ? "Creating Account..." : "Processing..."} />
        )}

        {/* Left Side Branding */}
        <aside className="hidden lg:flex w-1/2 bg-sidebar relative flex-col justify-between p-12 border-r border-border overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 bg-accent rounded-full blur-[100px]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-[120px]"></div>
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          </div>
          <div className="relative z-10 animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-sm">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" className="text-accent" />
                  <path d="M9.5 10l-2.5 2.5 2.5 2.5" />
                  <path d="M14.5 10l2.5 2.5-2.5 2.5" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">WebBench</h1>
            </div>
            <div className="space-y-6 mt-20">
              <h2 className="text-5xl font-extrabold leading-tight text-white">
                Build the web <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400">at the speed of thought.</span>
              </h2>
              <p className="text-lg text-gray-400 max-w-md leading-relaxed">
                Experience a native-feel IDE with AI-powered code generation, real-time previews, and instant deployment.
              </p>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-6 mt-auto">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-colors duration-300">
              <Cpu className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-semibold text-white">AI Powered</h3>
              <p className="text-sm text-gray-400 mt-1">Gemini 2.5 Flash integration for instant code generation.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-colors duration-300">
              <Sparkles className="w-6 h-6 text-yellow-400 mb-3" />
              <h3 className="font-semibold text-white">Live Preview</h3>
              <p className="text-sm text-gray-400 mt-1">See your changes instantly across multiple device sizes.</p>
            </div>
          </div>
        </aside>

        {/* Right Side - Auth Forms */}
        <main className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-12 relative">
          <div className="w-full max-w-md space-y-8 animate-slide-up">
            
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center mb-4 shadow-lg backdrop-blur-sm">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" className="text-accent" />
                  <path d="M9.5 10l-2.5 2.5 2.5 2.5" />
                  <path d="M14.5 10l2.5 2.5-2.5 2.5" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">WebBench</h2>
            </div>

            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-white tracking-tight">{getTitle()}</h2>
              <p className="mt-2 text-sm text-gray-400">{getDescription()}</p>
            </div>

            {successMessage && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3 text-green-400 text-sm animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400 text-sm animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            {/* Main Auth Form (Login/Signup) */}
            {(mode === 'login' || mode === 'signup') && (
              <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-accent transition-colors" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#252526] border border-border focus:border-accent text-white rounded-lg px-4 py-3 pl-10 outline-none transition-all focus:ring-1 focus:ring-accent/50 placeholder:text-gray-600" placeholder="name@example.com" required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-sm font-medium text-gray-300">Password</label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => { setMode('forgot'); clearState(); }} className="text-xs text-accent hover:text-blue-400 hover:underline">
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-accent transition-colors" />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#252526] border border-border focus:border-accent text-white rounded-lg px-4 py-3 pl-10 outline-none transition-all focus:ring-1 focus:ring-accent/50 placeholder:text-gray-600" placeholder="••••••••" required minLength={6} />
                    </div>
                    {mode === 'signup' && <p className="text-xs text-gray-500 ml-1">Must be at least 6 characters long.</p>}
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all" disabled={loading}>
                    {mode === 'signup' ? 'Sign Up' : 'Sign In'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}

            {/* Forgot Password Form */}
            {mode === 'forgot' && (
              <form onSubmit={handlePasswordResetRequest} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-accent transition-colors" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#252526] border border-border focus:border-accent text-white rounded-lg px-4 py-3 pl-10 outline-none transition-all focus:ring-1 focus:ring-accent/50 placeholder:text-gray-600" placeholder="name@example.com" required />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                  Send Reset Link
                </Button>
                <Button type="button" variant="ghost" className="w-full h-11 text-sm" onClick={() => { setMode('login'); clearState(); }}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </form>
            )}

            {mode !== 'forgot' && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-gray-500">Or continue with</span></div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button className="flex items-center justify-center gap-2 h-10 bg-[#252526] hover:bg-[#2d2d30] border border-border rounded-lg text-sm font-medium text-gray-300 transition-colors" type="button" onClick={handleGithubLogin}>
                    <Github className="w-4 h-4" /> GitHub
                  </button>
                </div>

                <p className="px-8 text-center text-sm text-gray-500">
                  {mode === 'signup' ? "Already have an account?" : "Don't have an account?"}
                  <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); clearState(); }} className="ml-2 text-accent hover:text-blue-400 hover:underline font-medium focus:outline-none">
                    {mode === 'login' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Login;