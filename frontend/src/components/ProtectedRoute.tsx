import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, setToken } from '../utils/auth';
import type { User } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route component that checks authentication
 * Redirects to login if not authenticated
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Check for token in URL (from OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (token) {
        // Store the token
        setToken(token);
        // Clean up URL
        window.history.replaceState({}, document.title, '/dashboard');
      }

      // Check if user is authenticated
      if (isAuthenticated()) {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuth(true);
        } else {
          setIsAuth(false);
        }
      } else {
        setIsAuth(false);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 bg-[length:200%_200%] animate-gradient flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

