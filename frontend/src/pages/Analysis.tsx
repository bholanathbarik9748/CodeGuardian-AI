import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getApiUrl, getAuthHeader, logout } from '../utils/auth';
import { tailwindClasses } from '../constants/colors';

export interface AnalysisJob {
  id: string;
  repository: {
    owner: string;
    repo: string;
    fullName: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: AnalysisResult;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AnalysisResult {
  summary: {
    totalFiles: number;
    totalLines: number;
    languages: Record<string, number>;
    techStack: {
      frameworks: string[];
      libraries: string[];
      buildTools: string[];
      databases: string[];
      other: string[];
    };
  };
  metrics: {
    complexity: {
      average: number;
      max: number;
    };
    codeQuality: {
      score: number;
      issues: number;
    };
  };
  findings: {
    security: Array<{
      file: string;
      line: number;
      severity: 'low' | 'medium' | 'high';
      message: string;
      recommendation?: string;
      codeSnippet?: string;
    }>;
    bestPractices: Array<{
      file: string;
      line: number;
      message: string;
      recommendation?: string;
      codeSnippet?: string;
    }>;
  };
}

export const Analysis = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const navigate = useNavigate();
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setError('No job ID provided');
      setLoading(false);
      return;
    }

    fetchAnalysisStatus();
    // Poll every 2 seconds if job is not completed
    const interval = setInterval(() => {
      if (job && job.status !== 'completed' && job.status !== 'failed') {
        fetchAnalysisStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  const fetchAnalysisStatus = async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`${getApiUrl()}/analyze/${jobId}`, {
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
        throw new Error('Failed to fetch analysis status');
      }

      const data = await response.json();
      setJob(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'processing':
        return 'text-yellow-400';
      default:
        return 'text-blue-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    if (!jobId || !job || job.status !== 'completed') {
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/analyze/${jobId}/export/${format}`, {
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await logout();
          navigate('/', { replace: true });
          return;
        }
        throw new Error('Failed to export analysis');
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${job.repository.fullName.replace('/', '-')}-analysis-${jobId}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export analysis');
    }
  };

  if (loading && !job) {
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

  if (error && !job) {
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

  if (!job) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 bg-[length:200%_200%] animate-gradient">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow animation-delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/repositories')}
            className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Repositories</span>
          </button>
        </div>

        {/* Repository Info */}
        <div className={`${tailwindClasses.glassCard} p-6 mb-6`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                {job.repository.fullName}
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`text-lg font-semibold ${getStatusColor(job.status)}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
                {job.status === 'processing' && (
                  <div className="flex-1 bg-gray-700/50 rounded-full h-2 overflow-hidden max-w-md">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
            {/* Export Buttons */}
            {job.status === 'completed' && job.result && (
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleExport('json')}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105"
                  title="Export as JSON"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">JSON</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105"
                  title="Export as CSV"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105"
                  title="Export as PDF"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {job.status === 'failed' && job.error && (
          <div className={`${tailwindClasses.glassCard} p-6 mb-6 border-2 border-red-500/50`}>
            <h2 className="text-xl font-bold text-red-400 mb-2">Analysis Failed</h2>
            <p className="text-gray-300">{job.error}</p>
          </div>
        )}

        {/* Results */}
        {job.status === 'completed' && job.result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className={`${tailwindClasses.glassCard} p-6`}>
              <h2 className="text-2xl font-bold text-white mb-4">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Total Files</div>
                  <div className="text-3xl font-bold text-white">{job.result.summary.totalFiles}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Total Lines</div>
                  <div className="text-3xl font-bold text-white">{job.result.summary.totalLines.toLocaleString()}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Quality Score</div>
                  <div className="text-3xl font-bold text-white">{job.result.metrics.codeQuality.score}/100</div>
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            {(job.result.summary.techStack.frameworks.length > 0 ||
              job.result.summary.techStack.libraries.length > 0 ||
              job.result.summary.techStack.buildTools.length > 0 ||
              job.result.summary.techStack.databases.length > 0 ||
              job.result.summary.techStack.other.length > 0) && (
              <div className={`${tailwindClasses.glassCard} p-6`}>
                <h2 className="text-2xl font-bold text-white mb-4">Tech Stack</h2>
                <div className="space-y-4">
                  {job.result.summary.techStack.frameworks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-purple-300 mb-2">Frameworks</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.result.summary.techStack.frameworks.map((tech) => (
                          <span
                            key={tech}
                            className="bg-purple-500/20 border border-purple-400/30 rounded-lg px-3 py-1 text-purple-200 font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {job.result.summary.techStack.libraries.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-blue-300 mb-2">Libraries</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.result.summary.techStack.libraries.map((tech) => (
                          <span
                            key={tech}
                            className="bg-blue-500/20 border border-blue-400/30 rounded-lg px-3 py-1 text-blue-200 font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {job.result.summary.techStack.buildTools.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-green-300 mb-2">Build Tools</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.result.summary.techStack.buildTools.map((tech) => (
                          <span
                            key={tech}
                            className="bg-green-500/20 border border-green-400/30 rounded-lg px-3 py-1 text-green-200 font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {job.result.summary.techStack.databases.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-300 mb-2">Databases</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.result.summary.techStack.databases.map((tech) => (
                          <span
                            key={tech}
                            className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg px-3 py-1 text-yellow-200 font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {job.result.summary.techStack.other.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-300 mb-2">Other</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.result.summary.techStack.other.map((tech) => (
                          <span
                            key={tech}
                            className="bg-indigo-500/20 border border-indigo-400/30 rounded-lg px-3 py-1 text-indigo-200 font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Languages */}
            {Object.keys(job.result.summary.languages).length > 0 && (
              <div className={`${tailwindClasses.glassCard} p-6`}>
                <h2 className="text-2xl font-bold text-white mb-4">Languages</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(job.result.summary.languages)
                    .sort(([, a], [, b]) => b - a)
                    .map(([lang, lines]) => (
                      <div
                        key={lang}
                        className="bg-white/10 rounded-lg px-4 py-2 flex items-center space-x-2"
                      >
                        <span className="text-white font-semibold">{lang}</span>
                        <span className="text-gray-400 text-sm">{lines.toLocaleString()} lines</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className={`${tailwindClasses.glassCard} p-6`}>
              <h2 className="text-2xl font-bold text-white mb-4">Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Complexity</div>
                  <div className="text-white">
                    <div>Average: <span className="font-semibold">{job.result.metrics.complexity.average}</span></div>
                    <div>Max: <span className="font-semibold">{job.result.metrics.complexity.max}</span></div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Code Quality</div>
                  <div className="text-white">
                    <div>Score: <span className="font-semibold">{job.result.metrics.codeQuality.score}/100</span></div>
                    <div>Issues: <span className="font-semibold">{job.result.metrics.codeQuality.issues}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Issues */}
            {job.result.findings.security.length > 0 && (
              <div className={`${tailwindClasses.glassCard} p-6`}>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Security Issues ({job.result.findings.security.length})
                </h2>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {job.result.findings.security.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-base mb-1">{issue.file}</div>
                          <span className="text-xs opacity-75">Line {issue.line}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          issue.severity === 'high' ? 'bg-red-500/30 text-red-200' :
                          issue.severity === 'medium' ? 'bg-yellow-500/30 text-yellow-200' :
                          'bg-blue-500/30 text-blue-200'
                        }`}>
                          {issue.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm font-medium mb-2 opacity-95">{issue.message}</div>
                      {issue.recommendation && (
                        <div className="mt-2 p-3 bg-black/20 rounded border-l-2 border-white/20">
                          <div className="text-xs font-semibold text-white/80 mb-1">💡 Recommendation:</div>
                          <div className="text-sm text-white/70">{issue.recommendation}</div>
                        </div>
                      )}
                      {issue.codeSnippet && (
                        <div className="mt-2 p-3 bg-black/30 rounded font-mono text-xs overflow-x-auto">
                          <div className="text-white/50 mb-1">Code:</div>
                          <code className="text-white/90">{issue.codeSnippet}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Best Practices */}
            {job.result.findings.bestPractices.length > 0 && (
              <div className={`${tailwindClasses.glassCard} p-6`}>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Best Practices ({job.result.findings.bestPractices.length})
                </h2>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {job.result.findings.bestPractices.map((issue, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 border border-white/10 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-white text-base mb-1">{issue.file}</div>
                          <span className="text-xs text-gray-400">Line {issue.line}</span>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-200 mb-2">{issue.message}</div>
                      {issue.recommendation && (
                        <div className="mt-2 p-3 bg-black/20 rounded border-l-2 border-white/20">
                          <div className="text-xs font-semibold text-white/80 mb-1">💡 Recommendation:</div>
                          <div className="text-sm text-white/70">{issue.recommendation}</div>
                        </div>
                      )}
                      {issue.codeSnippet && (
                        <div className="mt-2 p-3 bg-black/30 rounded font-mono text-xs overflow-x-auto">
                          <div className="text-white/50 mb-1">Code:</div>
                          <code className="text-white/90">{issue.codeSnippet}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

