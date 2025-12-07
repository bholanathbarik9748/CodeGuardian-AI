import { useState, useEffect } from "react";
import {
  getApiUrl,
  isAuthenticated,
  getCurrentUser,
  setToken,
} from "../utils/auth";
import type { User } from "../utils/auth";

export const LoginButton = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      if (isAuthenticated()) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Handle OAuth callback - check URL for token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      // Store token and redirect to dashboard
      setToken(token);
      window.location.href = `/dashboard?token=${token}`;
    }
  }, []);

  const handleLogin = () => {
    // Redirect to backend GitHub OAuth endpoint
    window.location.href = `${getApiUrl()}/auth/github/login`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in, redirect to dashboard (handled by App.tsx)
  if (user) {
    return null;
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleLogin}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-4 px-6 rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 overflow-hidden"
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Shine effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="relative flex items-center justify-center space-x-3 cursor-pointer">
          {/* GitHub icon */}
          <svg
            className={`w-6 h-6 transition-transform duration-300 ${isHovered ? 'rotate-12 scale-110' : ''}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          
          <span className="text-lg">Sign in with GitHub</span>
          
          {/* Arrow icon */}
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </div>
      </button>

      {/* Additional info */}
      <p className="text-center text-white/60 text-sm mt-4">
        Secure authentication via GitHub OAuth
      </p>
    </div>
  );
};
