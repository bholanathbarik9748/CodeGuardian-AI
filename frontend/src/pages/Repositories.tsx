import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl, getAuthHeader, logout } from '../utils/auth';
import { tailwindClasses } from '../constants/colors';

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  default_branch: string;
}

export const Repositories = () => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${getApiUrl()}/repos`, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await logout();
          navigate('/', { replace: true });
          return;
        }
        throw new Error('Failed to fetch repositories');
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setRepos([]);
      } else {
        setRepos(data.repos || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  // Filter and search repositories
  const filteredRepos = repos.filter((repo) => {
    const matchesSearch =
      searchQuery === '' ||
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLanguage =
      filterLanguage === 'all' || repo.language === filterLanguage;

    return matchesSearch && matchesLanguage;
  });

  // Get unique languages
  const languages = Array.from(
    new Set(repos.map((repo) => repo.language).filter(Boolean)),
  ).sort() as string[];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 bg-[length:200%_200%] animate-gradient">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200 mb-2">
                  My Repositories
                </h1>
                <p className="text-purple-200">
                  {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transform transition-all duration-300 hover:scale-105"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className={`${tailwindClasses.glassCard} p-6 animate-slide-up`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">
                    Search Repositories
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or description..."
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Language Filter */}
                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">
                    Filter by Language
                  </label>
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Languages</option>
                    {languages.map((lang) => (
                      <option key={lang} value={lang} className="bg-gray-800">
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </header>

          {/* Error Message */}
          {error && (
            <div className={`${tailwindClasses.glassCard} p-6 mb-6 border-red-400/30 bg-red-500/10 animate-fade-in`}>
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Repositories Grid */}
          {filteredRepos.length === 0 && !loading ? (
            <div className={`${tailwindClasses.glassCard} p-12 text-center animate-fade-in`}>
              <p className="text-purple-200 text-lg">
                {searchQuery || filterLanguage !== 'all'
                  ? 'No repositories match your filters'
                  : 'No repositories found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRepos.map((repo, index) => (
                <div
                  key={repo.id}
                  className={`${tailwindClasses.glassCard} p-6 hover:scale-105 transform transition-all duration-300 cursor-pointer animate-slide-up`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => window.open(repo.html_url, '_blank')}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
                        <span>{repo.name}</span>
                        {repo.private && (
                          <span className="text-xs px-2 py-1 bg-yellow-500/20 border border-yellow-400/30 rounded text-yellow-300">
                            Private
                          </span>
                        )}
                      </h3>
                      <p className="text-purple-200 text-sm">{repo.full_name}</p>
                    </div>
                  </div>

                  {repo.description && (
                    <p className="text-white/80 text-sm mb-4 line-clamp-2">
                      {repo.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-white/70">
                      {repo.language && (
                        <span className="flex items-center space-x-1">
                          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                          <span>{repo.language}</span>
                        </span>
                      )}
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span>{repo.stargazers_count}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        <span>{repo.forks_count}</span>
                      </span>
                    </div>
                    <span className="text-white/50 text-xs">
                      Updated {formatDate(repo.updated_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

