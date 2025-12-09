
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SharePage from './pages/SharePage';
// Fix: Changed default import to named import for Editor component
import { Editor } from './pages/Editor';
import Community from './pages/Community';
import { Loader2 } from 'lucide-react';
import { ResetPassword } from './components/auth/ResetPassword';
import { WebBenchLogo } from './components/ui/WebBenchLogo'; // Import WebBenchLogo
// Fix: Imported WebBenchLoader
import { WebBenchLoader } from './components/ui/Loader'; 

// Private Route Wrapper
interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center text-accent">
        <WebBenchLoader size="md" /> {/* Use WebBenchLoader for consistency */}
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ThemeProvider>
      {showResetPassword && <ResetPassword onDone={() => setShowResetPassword(false)} />}
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Public Shares (direct link to private project via ID, requires permission or auth) */}
          <Route path="/share/:projectId" element={<SharePage />} />
          
          {/* Community Published Projects (Publicly viewable) */}
          <Route path="/community/:projectId" element={<SharePage isPublished={true} />} />
          
          <Route 
            path="/community" 
            element={
              <PrivateRoute>
                <Community />
              </PrivateRoute>
            }
          />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route 
            path="/editor/:projectId" 
            element={
              <PrivateRoute>
                <Editor />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;