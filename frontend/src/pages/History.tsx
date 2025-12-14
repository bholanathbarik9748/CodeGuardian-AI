import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl, getAuthHeader, logout } from '../utils/auth';
import { tailwindClasses } from '../constants/colors';
import type { AnalysisJob } from './Analysis';

export const History = () => {
  const [analyses, setAnalyses] = useState<AnalysisJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/analyze/history/list`, {
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
        throw new Error('Failed to fetch analysis history');
      }

      const data = await response.json();
      setAnalyses(data.analyses || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
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
              Analysis History
            </h1>
            <p className="text-purple-200">
              {analyses.length} {analyses.length === 1 ? 'analysis' : 'analyses'} completed
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/repositories')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transform transition-all duration-300 hover:scale-105"
            >
              Repositories
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transform transition-all duration-300 hover:scale-105"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`${tailwindClasses.glassCard} p-6 mb-6 border-red-400/30 bg-red-500/10 animate-fade-in`}>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* History List */}
        {analyses.length === 0 ? (
          <div className={`${tailwindClasses.glassCard} p-12 text-center animate-fade-in`}>
            <p className="text-purple-200 text-lg mb-4">No analysis history yet</p>
            <button
              onClick={() => navigate('/repositories')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105"
            >
              Analyze a Repository
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis, index) => (
              <div
                key={analysis.id}
                className={`${tailwindClasses.glassCard} p-6 hover:scale-[1.02] transform transition-all duration-300 cursor-pointer animate-slide-up`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/analysis?jobId=${analysis.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {analysis.repository.fullName}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-300">
                      <span>Completed: {formatDate(analysis.completedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getStatusColor(analysis.status)}`}
                    >
                      {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                    </span>
                  </div>
                </div>

                {analysis.result && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-gray-400 text-xs mb-1">Files</div>
                      <div className="text-lg font-bold text-white">
                        {analysis.result.summary.totalFiles}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-gray-400 text-xs mb-1">Lines</div>
                      <div className="text-lg font-bold text-white">
                        {analysis.result.summary.totalLines.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-gray-400 text-xs mb-1">Quality Score</div>
                      <div className="text-lg font-bold text-white">
                        {analysis.result.metrics.codeQuality.score}/100
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-gray-400 text-xs mb-1">Issues</div>
                      <div className="text-lg font-bold text-white">
                        {analysis.result.findings.security.length + analysis.result.findings.bestPractices.length}
                      </div>
                    </div>
                  </div>
                )}

                {analysis.result && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {analysis.result.summary.techStack.frameworks.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="bg-purple-500/20 border border-purple-400/30 rounded-lg px-2 py-1 text-xs text-purple-200"
                      >
                        {tech}
                      </span>
                    ))}
                    {analysis.result.summary.techStack.frameworks.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{analysis.result.summary.techStack.frameworks.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

