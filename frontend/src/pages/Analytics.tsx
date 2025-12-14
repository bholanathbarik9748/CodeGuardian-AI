import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl, getAuthHeader, logout } from '../utils/auth';
import { tailwindClasses } from '../constants/colors';

interface AnalyticsData {
  totalAnalyses: number;
  averageQualityScore: number;
  totalIssues: number;
  repositoriesAnalyzed: number;
  recentAnalyses: number;
  trends: Array<{
    date: string;
    analyses: number;
    averageQuality: number;
  }>;
  languageDistribution: Array<{
    language: string;
    totalLines: number;
  }>;
  topSecurityIssues: Array<{
    message: string;
    count: number;
  }>;
  topBestPractices: Array<{
    message: string;
    count: number;
  }>;
}

export const Analytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/analyze/analytics`, {
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
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 bg-[length:200%_200%] animate-gradient flex items-center justify-center p-4">
        <div className={`${tailwindClasses.glassCard} p-8 max-w-md w-full text-center`}>
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/repositories')}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105"
          >
            Back to Repositories
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
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

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200 mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-purple-200">Insights from your code analysis history</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/repositories')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transform transition-all duration-300 hover:scale-105"
            >
              Repositories
            </button>
            <button
              onClick={() => navigate('/history')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transform transition-all duration-300 hover:scale-105"
            >
              History
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`${tailwindClasses.glassCard} p-6`}>
            <div className="text-gray-400 text-sm mb-2">Total Analyses</div>
            <div className="text-3xl font-bold text-white">{analytics.totalAnalyses}</div>
          </div>
          <div className={`${tailwindClasses.glassCard} p-6`}>
            <div className="text-gray-400 text-sm mb-2">Average Quality Score</div>
            <div className="text-3xl font-bold text-white">{analytics.averageQualityScore.toFixed(1)}</div>
          </div>
          <div className={`${tailwindClasses.glassCard} p-6`}>
            <div className="text-gray-400 text-sm mb-2">Total Issues Found</div>
            <div className="text-3xl font-bold text-white">{analytics.totalIssues.toLocaleString()}</div>
          </div>
          <div className={`${tailwindClasses.glassCard} p-6`}>
            <div className="text-gray-400 text-sm mb-2">Repositories Analyzed</div>
            <div className="text-3xl font-bold text-white">{analytics.repositoriesAnalyzed}</div>
          </div>
        </div>

        {/* Trends Chart */}
        {analytics.trends.length > 0 && (
          <div className={`${tailwindClasses.glassCard} p-6 mb-8`}>
            <h2 className="text-2xl font-bold text-white mb-4">7-Day Analysis Trends</h2>
            <div className="space-y-3">
              {analytics.trends.map((trend, idx) => {
                const maxAnalyses = Math.max(...analytics.trends.map(t => t.analyses), 1);
                const percentage = Math.min((trend.analyses / maxAnalyses) * 100, 100);
                return (
                  <div key={idx} className="flex items-center space-x-4">
                    <div className="w-24 text-sm text-gray-300">{trend.date}</div>
                    <div className="flex-1 bg-gray-700/50 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-xs text-white font-semibold">{trend.analyses}</span>
                      </div>
                    </div>
                    <div className="w-16 text-sm text-gray-300 text-right">
                      Quality: {trend.averageQuality.toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Language Distribution */}
          {analytics.languageDistribution.length > 0 && (
            <div className={`${tailwindClasses.glassCard} p-6`}>
              <h2 className="text-2xl font-bold text-white mb-4">Top Languages</h2>
              <div className="space-y-3">
                {analytics.languageDistribution.map((lang, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-white font-medium">{lang.language}</span>
                    <span className="text-purple-300">{lang.totalLines.toLocaleString()} lines</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Security Issues */}
          {analytics.topSecurityIssues.length > 0 && (
            <div className={`${tailwindClasses.glassCard} p-6`}>
              <h2 className="text-2xl font-bold text-white mb-4">Top Security Issues</h2>
              <div className="space-y-3">
                {analytics.topSecurityIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-start justify-between">
                    <span className="text-white text-sm flex-1">{issue.message}</span>
                    <span className="text-red-400 font-semibold ml-2">{issue.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Best Practices */}
          {analytics.topBestPractices.length > 0 && (
            <div className={`${tailwindClasses.glassCard} p-6`}>
              <h2 className="text-2xl font-bold text-white mb-4">Top Best Practice Issues</h2>
              <div className="space-y-3">
                {analytics.topBestPractices.map((issue, idx) => (
                  <div key={idx} className="flex items-start justify-between">
                    <span className="text-white text-sm flex-1">{issue.message}</span>
                    <span className="text-yellow-400 font-semibold ml-2">{issue.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

