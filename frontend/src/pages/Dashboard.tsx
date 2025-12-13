import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isAuthenticated, setToken } from '../utils/auth';
import type { User } from '../utils/auth';
import { tailwindClasses } from '../constants/colors';

export const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      // Check for token in URL (from OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (token) {
        // Store token and clean URL
        setToken(token);
        window.history.replaceState({}, document.title, '/dashboard');
      }

      if (!isAuthenticated()) {
        navigate('/', { replace: true });
        return;
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/', { replace: true });
        return;
      }

      setUser(currentUser);
      setLoading(false);
    };

    loadUser();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  if (loading) {
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 bg-[length:200%_200%] animate-gradient">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-4xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                CodeGuardian AI
              </h1>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 active:scale-95 flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </header>

          {/* Main Content */}
          <div className="space-y-6">
            {/* User Profile Card */}
            <div className={`${tailwindClasses.glassCard} p-8 animate-slide-up`}>
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                {/* Avatar */}
                <div className="relative">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-32 h-32 rounded-2xl border-4 border-white/20 shadow-2xl"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-2xl">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {user.name || user.username}
                  </h2>
                  <p className="text-purple-200 text-lg mb-4">@{user.username}</p>
                  
                  {user.email && (
                    <div className="flex items-center justify-center md:justify-start space-x-2 text-white/80 mb-4">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span>{user.email}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center md:justify-start space-x-2">
                    <div className="px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-lg">
                      <span className="text-green-300 text-sm font-medium">✓ Authenticated</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GitHub Details Card */}
            <div className={`${tailwindClasses.glassCard} p-8 animate-slide-up animation-delay-200`}>
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>GitHub Profile</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-purple-200 text-sm font-medium">User ID</p>
                  <p className="text-white text-lg font-mono">{user.sub}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-purple-200 text-sm font-medium">Username</p>
                  <p className="text-white text-lg">{user.username}</p>
                </div>
                
                {user.name && (
                  <div className="space-y-2">
                    <p className="text-purple-200 text-sm font-medium">Display Name</p>
                    <p className="text-white text-lg">{user.name}</p>
                  </div>
                )}
                
                {user.email && (
                  <div className="space-y-2">
                    <p className="text-purple-200 text-sm font-medium">Email</p>
                    <p className="text-white text-lg">{user.email}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <a
                  href={`https://github.com/${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span>View on GitHub</span>
                </a>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className={`${tailwindClasses.glassCard} p-8 animate-slide-up animation-delay-400`}>
              <h3 className="text-2xl font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-4">
                <button
                  onClick={() => navigate('/repositories')}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 flex items-center justify-center space-x-3"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span>View My Repositories</span>
                </button>
              </div>
            </div>

            {/* Coming Soon Card */}
            <div className={`${tailwindClasses.glassCard} p-8 animate-slide-up animation-delay-400`}>
              <h3 className="text-2xl font-bold text-white mb-4">What's Next?</h3>
              <p className="text-purple-200 mb-6">
                Soon you'll be able to analyze your repositories, get AI-powered code insights, and more.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-indigo-500/20 border border-indigo-400/30 rounded-lg">
                  <span className="text-indigo-300 text-sm">Repository Analysis</span>
                </div>
                <div className="px-4 py-2 bg-purple-500/20 border border-purple-400/30 rounded-lg">
                  <span className="text-purple-300 text-sm">AI Code Review</span>
                </div>
                <div className="px-4 py-2 bg-pink-500/20 border border-pink-400/30 rounded-lg">
                  <span className="text-pink-300 text-sm">Security Scanning</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

