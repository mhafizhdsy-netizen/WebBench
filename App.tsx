import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import { Loader2 } from 'lucide-react';
import { ResetPassword } from './components/auth/ResetPassword';

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
        <Loader2 className="animate-spin w-7 h-7 md:w-8 md:h-8" />
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