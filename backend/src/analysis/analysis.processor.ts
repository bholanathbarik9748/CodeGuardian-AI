import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AnalysisService, type AnalysisResult } from './analysis.service';
import { LLMService } from './llm.service';

// Try to import BullMQ, but make it optional
let Processor: any;
let WorkerHost: any;
let Job: any;
try {
  const bullmq = require('@nestjs/bullmq');
  Processor = bullmq.Processor;
  WorkerHost = bullmq.WorkerHost;
  Job = require('bullmq').Job;
} catch (e) {
  // BullMQ not installed - create a simple base class
  WorkerHost = class {};
}

interface AnalysisJobData {
  jobId: string;
  owner: string;
  repo: string;
  fullName: string;
  githubToken: string;
}

// Only use @Processor decorator if BullMQ is available
const ProcessorDecorator = Processor
  ? Processor('analysis')
  : () => (target: any) => target;

// Standalone function for processing without BullMQ
export async function processAnalysisJob(
  data: AnalysisJobData,
  analysisService: AnalysisService,
  llmService: LLMService,
): Promise<AnalysisResult> {
  const processor = new AnalysisProcessor(analysisService, llmService);
  return processor.process({ data } as any);
}

@ProcessorDecorator
@Injectable()
export class AnalysisProcessor extends WorkerHost {
  constructor(
    @Inject(forwardRef(() => AnalysisService))
    private readonly analysisService: AnalysisService,
    private readonly llmService: LLMService,
  ) {
    super();
  }

  async process(job: { data: AnalysisJobData } | any): Promise<AnalysisResult> {
    const jobData = 'data' in job ? job.data : (job as any).data;
    const { jobId, owner, repo, fullName, githubToken } = jobData;

    try {
      // Update status to processing
      this.analysisService.updateJobStatus(jobId, {
        status: 'processing',
        progress: 10,
        startedAt: new Date(),
      });

      // Fetch repository contents from GitHub
      const files = await this.fetchRepositoryFiles(owner, repo, githubToken);

      this.analysisService.updateJobStatus(jobId, {
        progress: 30,
      });

      // Analyze files (includes LLM filtering if enabled)
      const analysisResult = await this.analyzeFiles(files, owner, repo);

      this.analysisService.updateJobStatus(jobId, {
        progress: this.llmService.isEnabled() ? 95 : 90, // LLM takes extra time
      });

      // Mark as completed
      this.analysisService.updateJobStatus(jobId, {
        status: 'completed',
        progress: 100,
        result: analysisResult,
        completedAt: new Date(),
      });

      return analysisResult;
    } catch (error) {
      // Mark as failed
      this.analysisService.updateJobStatus(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      });
      throw error;
    }
  }

  /**
   * Fetch repository files from GitHub
   */
  private async fetchRepositoryFiles(
    owner: string,
    repo: string,
    githubToken: string,
  ): Promise<Array<{ path: string; content: string; language: string }>> {
    const githubApiUrl = 'https://api.github.com';
    const files: Array<{ path: string; content: string; language: string }> =
      [];

    // Fetch repository tree (get default branch first)
    const repoResponse = await fetch(`${githubApiUrl}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!repoResponse.ok) {
      throw new Error(`Failed to fetch repository: ${repoResponse.statusText}`);
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch;

    // Fetch repository tree
    const treeResponse = await fetch(
      `${githubApiUrl}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
    );

    if (!treeResponse.ok) {
      throw new Error(
        `Failed to fetch repository tree: ${treeResponse.statusText}`,
      );
    }

    const treeData = await treeResponse.json();
    const codeFiles = treeData.tree.filter(
      (item: { type: string; path: string }) =>
        item.type === 'blob' &&
        (this.isCodeFile(item.path) || this.isConfigFile(item.path)),
    );

    // Prioritize config files for tech stack detection, then code files
    const configFiles = codeFiles.filter((item: { path: string }) =>
      this.isConfigFile(item.path),
    );
    const otherCodeFiles = codeFiles.filter(
      (item: { path: string }) => !this.isConfigFile(item.path),
    );

    // Include all config files + up to 50 code files
    const filesToAnalyze = [...configFiles, ...otherCodeFiles.slice(0, 50)];

    // Fetch content for each file
    for (const file of filesToAnalyze) {
      try {
        const contentResponse = await fetch(
          `${githubApiUrl}/repos/${owner}/${repo}/contents/${file.path}`,
          {
            headers: {
              Authorization: `token ${githubToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        );

        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          if (contentData.encoding === 'base64') {
            const content = Buffer.from(contentData.content, 'base64').toString(
              'utf-8',
            );
            const language = this.detectLanguage(file.path);
            files.push({
              path: file.path,
              content,
              language,
            });
          }
        }
      } catch (error) {
        // Skip files that can't be fetched
        console.warn(`Failed to fetch ${file.path}:`, error);
      }
    }

    return files;
  }

  /**
   * Analyze files and generate report
   */
  private async analyzeFiles(
    files: Array<{ path: string; content: string; language: string }>,
    owner: string,
    repo: string,
  ): Promise<AnalysisResult> {
    let totalLines = 0;
    const languages: Record<string, number> = {};
    const securityIssues: AnalysisResult['findings']['security'] = [];
    const bestPracticeIssues: AnalysisResult['findings']['bestPractices'] = [];
    let totalComplexity = 0;
    let maxComplexity = 0;

    // Detect tech stack from files
    const techStack = this.detectTechStack(files);

    // Step 1: Run regex-based detection (fast, catches obvious issues)
    for (const file of files) {
      // Count lines
      const lines = file.content.split('\n').length;
      totalLines += lines;

      // Count languages
      languages[file.language] = (languages[file.language] || 0) + lines;

      // Calculate complexity (simple: based on control flow statements)
      const complexity = this.calculateComplexity(file.content, file.language);
      totalComplexity += complexity;
      maxComplexity = Math.max(maxComplexity, complexity);

      // Check for security issues (regex-based)
      this.checkSecurityIssues(file, securityIssues);

      // Check for best practices (regex-based)
      this.checkBestPractices(file, bestPracticeIssues);
    }

    // Step 2: Use LLM to filter false positives (if enabled)
    let filteredSecurityIssues = securityIssues;
    let filteredBestPracticeIssues = bestPracticeIssues;

    if (this.llmService.isEnabled()) {
      // Group issues by file for efficient LLM processing
      const securityByFile = new Map<string, typeof securityIssues>();
      const bestPracticeByFile = new Map<string, typeof bestPracticeIssues>();

      securityIssues.forEach((issue) => {
        if (!securityByFile.has(issue.file)) {
          securityByFile.set(issue.file, []);
        }
        securityByFile.get(issue.file)!.push(issue);
      });

      bestPracticeIssues.forEach((issue) => {
        if (!bestPracticeByFile.has(issue.file)) {
          bestPracticeByFile.set(issue.file, []);
        }
        bestPracticeByFile.get(issue.file)!.push(issue);
      });

      // Process each file's issues with LLM
      const fileMap = new Map(
        files.map((f) => [f.path, f.content]),
      );

      // Filter security issues
      const securityPromises: Promise<typeof securityIssues>[] = [];
      for (const [filePath, fileIssues] of securityByFile.entries()) {
        const fileContent = fileMap.get(filePath) || '';
        securityPromises.push(
          this.llmService.analyzeSecurityIssues(fileIssues, fileContent),
        );
      }
      const filteredSecurityArrays = await Promise.all(securityPromises);
      filteredSecurityIssues = filteredSecurityArrays.flat();

      // Filter best practice issues
      const bestPracticePromises: Promise<typeof bestPracticeIssues>[] = [];
      for (const [filePath, fileIssues] of bestPracticeByFile.entries()) {
        const fileContent = fileMap.get(filePath) || '';
        bestPracticePromises.push(
          this.llmService.analyzeBestPractices(fileIssues, fileContent),
        );
      }
      const filteredBestPracticeArrays = await Promise.all(bestPracticePromises);
      filteredBestPracticeIssues = filteredBestPracticeArrays.flat();
    }

    const avgComplexity = files.length > 0 ? totalComplexity / files.length : 0;
    const codeQualityScore = this.calculateQualityScore(
      filteredSecurityIssues.length,
      filteredBestPracticeIssues.length,
      avgComplexity,
    );

    return {
      summary: {
        totalFiles: files.length,
        totalLines,
        languages,
        techStack,
      },
      metrics: {
        complexity: {
          average: Math.round(avgComplexity * 100) / 100,
          max: maxComplexity,
        },
        codeQuality: {
          score: codeQualityScore,
          issues: filteredSecurityIssues.length + filteredBestPracticeIssues.length,
        },
      },
      findings: {
        security: filteredSecurityIssues,
        bestPractices: filteredBestPracticeIssues,
      },
    };
  }

  /**
   * Detect tech stack from files
   */
  private detectTechStack(
    files: Array<{ path: string; content: string; language: string }>,
  ): AnalysisResult['summary']['techStack'] {
    const techStack: AnalysisResult['summary']['techStack'] = {
      frameworks: [],
      libraries: [],
      buildTools: [],
      databases: [],
      other: [],
    };

    const detected = new Set<string>();

    for (const file of files) {
      const path = file.path.toLowerCase();
      const content = file.content.toLowerCase();

      // Detect from file names
      if (path.includes('package.json')) {
        try {
          const pkg = JSON.parse(file.content);
          if (pkg.dependencies || pkg.devDependencies) {
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };

            // Frameworks
            if (deps.react && !detected.has('React')) {
              techStack.frameworks.push('React');
              detected.add('React');
            }
            if (deps.vue && !detected.has('Vue.js')) {
              techStack.frameworks.push('Vue.js');
              detected.add('Vue.js');
            }
            if (deps.angular && !detected.has('Angular')) {
              techStack.frameworks.push('Angular');
              detected.add('Angular');
            }
            if (deps['@nestjs/core'] && !detected.has('NestJS')) {
              techStack.frameworks.push('NestJS');
              detected.add('NestJS');
            }
            if (deps.express && !detected.has('Express')) {
              techStack.frameworks.push('Express');
              detected.add('Express');
            }
            if (deps.next && !detected.has('Next.js')) {
              techStack.frameworks.push('Next.js');
              detected.add('Next.js');
            }
            if (deps['@remix-run/react'] && !detected.has('Remix')) {
              techStack.frameworks.push('Remix');
              detected.add('Remix');
            }

            // Libraries
            if (deps.axios && !detected.has('Axios')) {
              techStack.libraries.push('Axios');
              detected.add('Axios');
            }
            if (deps.lodash && !detected.has('Lodash')) {
              techStack.libraries.push('Lodash');
              detected.add('Lodash');
            }
            if (deps.moment && !detected.has('Moment.js')) {
              techStack.libraries.push('Moment.js');
              detected.add('Moment.js');
            }
            if (deps['date-fns'] && !detected.has('date-fns')) {
              techStack.libraries.push('date-fns');
              detected.add('date-fns');
            }

            // Build Tools
            if (deps.webpack && !detected.has('Webpack')) {
              techStack.buildTools.push('Webpack');
              detected.add('Webpack');
            }
            if (deps.vite && !detected.has('Vite')) {
              techStack.buildTools.push('Vite');
              detected.add('Vite');
            }
            if (deps['@vitejs/plugin-react'] && !detected.has('Vite')) {
              techStack.buildTools.push('Vite');
              detected.add('Vite');
            }
            if (
              pkg.scripts &&
              Object.keys(pkg.scripts).some((s) => s.includes('turbo'))
            ) {
              if (!detected.has('Turborepo')) {
                techStack.buildTools.push('Turborepo');
                detected.add('Turborepo');
              }
            }

            // Databases
            if (deps.mongoose && !detected.has('MongoDB')) {
              techStack.databases.push('MongoDB');
              detected.add('MongoDB');
            }
            if (deps['@prisma/client'] && !detected.has('Prisma')) {
              techStack.databases.push('Prisma');
              detected.add('Prisma');
            }
            if (deps.typeorm && !detected.has('TypeORM')) {
              techStack.databases.push('TypeORM');
              detected.add('TypeORM');
            }
            if (deps.sequelize && !detected.has('Sequelize')) {
              techStack.databases.push('Sequelize');
              detected.add('Sequelize');
            }
            if (deps.pg && !detected.has('PostgreSQL')) {
              techStack.databases.push('PostgreSQL');
              detected.add('PostgreSQL');
            }
            if (deps.mysql && !detected.has('MySQL')) {
              techStack.databases.push('MySQL');
              detected.add('MySQL');
            }
            if (deps.redis && !detected.has('Redis')) {
              techStack.databases.push('Redis');
              detected.add('Redis');
            }
            if (deps.ioredis && !detected.has('Redis')) {
              techStack.databases.push('Redis');
              detected.add('Redis');
            }
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      }

      // Python requirements.txt
      if (path.includes('requirements.txt')) {
        if (content.includes('django') && !detected.has('Django')) {
          techStack.frameworks.push('Django');
          detected.add('Django');
        }
        if (content.includes('flask') && !detected.has('Flask')) {
          techStack.frameworks.push('Flask');
          detected.add('Flask');
        }
        if (content.includes('fastapi') && !detected.has('FastAPI')) {
          techStack.frameworks.push('FastAPI');
          detected.add('FastAPI');
        }
        if (content.includes('sqlalchemy') && !detected.has('SQLAlchemy')) {
          techStack.libraries.push('SQLAlchemy');
          detected.add('SQLAlchemy');
        }
      }

      // Docker
      if (path.includes('dockerfile') || path.includes('docker-compose')) {
        if (!detected.has('Docker')) {
          techStack.other.push('Docker');
          detected.add('Docker');
        }
      }

      // Tailwind CSS
      if (content.includes('tailwindcss') || path.includes('tailwind.config')) {
        if (!detected.has('Tailwind CSS')) {
          techStack.libraries.push('Tailwind CSS');
          detected.add('Tailwind CSS');
        }
      }

      // TypeScript
      if (path.includes('tsconfig.json')) {
        if (!detected.has('TypeScript')) {
          techStack.other.push('TypeScript');
          detected.add('TypeScript');
        }
      }
    }

    return techStack;
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(path: string): boolean {
    const codeExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.py',
      '.java',
      '.cpp',
      '.c',
      '.cs',
      '.go',
      '.rs',
      '.rb',
      '.php',
      '.swift',
      '.kt',
      '.scala',
      '.clj',
      '.sh',
      '.bash',
      '.zsh',
      '.html',
      '.css',
    ];
    return codeExtensions.some((ext) => path.toLowerCase().endsWith(ext));
  }

  /**
   * Check if file is a config file (for tech stack detection)
   */
  private isConfigFile(path: string): boolean {
    const configFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'requirements.txt',
      'pipfile',
      'go.mod',
      'cargo.toml',
      'pom.xml',
      'build.gradle',
      'dockerfile',
      'docker-compose.yml',
      'docker-compose.yaml',
      'tsconfig.json',
      'tailwind.config.js',
      'tailwind.config.ts',
      'webpack.config.js',
      'vite.config.js',
      'vite.config.ts',
      '.env.example',
    ];
    const pathLower = path.toLowerCase();
    return configFiles.some((file) => pathLower.includes(file.toLowerCase()));
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      py: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      cs: 'C#',
      go: 'Go',
      rs: 'Rust',
      rb: 'Ruby',
      php: 'PHP',
      swift: 'Swift',
      kt: 'Kotlin',
      scala: 'Scala',
      clj: 'Clojure',
      sh: 'Shell',
      bash: 'Shell',
      zsh: 'Shell',
      yaml: 'YAML',
      yml: 'YAML',
      json: 'JSON',
      xml: 'XML',
      html: 'HTML',
      css: 'CSS',
    };
    return languageMap[ext] || 'Unknown';
  }

  /**
   * Calculate code complexity (simple heuristic)
   */
  private calculateComplexity(content: string, language: string): number {
    let complexity = 1; // Base complexity

    // Count control flow statements
    const controlFlowPatterns = [
      /\bif\s*\(/g,
      /\belse\s*\{/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\bawait\s+/g,
      /\btry\s*\{/g,
    ];

    for (const pattern of controlFlowPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Check for security issues
   */
  private checkSecurityIssues(
    file: { path: string; content: string; language: string },
    issues: AnalysisResult['findings']['security'],
  ): void {
    const lines = file.content.split('\n');

    // Check for common security issues
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const lowerLine = line.toLowerCase();

      // Hardcoded secrets - only flag if clearly a secret (not in comments or examples)
      if (
        /(password|secret|api[_-]?key|token|private[_-]?key)\s*[=:]\s*['"][^'"]{8,}['"]/i.test(
          line,
        ) &&
        !/process\.env|config|\.env|example|sample|test|TODO|FIXME|XXX/i.test(
          line,
        ) &&
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('*') &&
        !line.trim().startsWith('#')
      ) {
        const match = line.match(
          /(password|secret|api[_-]?key|token|private[_-]?key)/i,
        );
        issues.push({
          file: file.path,
          line: lineNum,
          severity: 'high',
          message: `Hardcoded ${match?.[1] || 'secret'} detected`,
          recommendation:
            'Use environment variables (process.env) or a secrets manager (AWS Secrets Manager, HashiCorp Vault). Add to .gitignore and use .env.example for documentation.',
          codeSnippet: line.trim().substring(0, 100),
        });
      }

      // SQL injection risk - only flag actual SQL queries, not ORM methods
      if (
        /(query|execute|exec)\s*\(.*\$\{|\+.*['"]/i.test(line) &&
        !/\.find|\.findOne|\.create|\.update|\.delete|\.save|ORM|Sequelize|TypeORM|Prisma/i.test(
          line,
        )
      ) {
        issues.push({
          file: file.path,
          line: lineNum,
          severity: 'high',
          message: 'SQL injection risk: String interpolation in database query',
          recommendation:
            'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [userId]). For ORMs, use built-in methods that handle parameterization automatically.',
          codeSnippet: line.trim().substring(0, 100),
        });
      }

      // eval() usage - critical security issue
      if (/\beval\s*\(/i.test(line) && !line.trim().startsWith('//')) {
        issues.push({
          file: file.path,
          line: lineNum,
          severity: 'high',
          message: 'eval() usage detected - critical security vulnerability',
          recommendation:
            'Replace eval() with safe alternatives: JSON.parse() for JSON, Function constructor with validation, or use a proper parser library. Consider using a code generation tool if dynamic code is necessary.',
          codeSnippet: line.trim().substring(0, 100),
        });
      }

      // Insecure random in security contexts
      if (
        /\bMath\.random\s*\(/i.test(line) &&
        /(token|session|password|secret|crypto|auth)/i.test(file.path)
      ) {
        issues.push({
          file: file.path,
          line: lineNum,
          severity: 'medium',
          message: 'Math.random() in security-sensitive code',
          recommendation:
            'Use Web Crypto API: crypto.getRandomValues() (browser) or crypto.randomBytes() (Node.js). Math.random() is predictable and not cryptographically secure.',
          codeSnippet: line.trim().substring(0, 100),
        });
      }

      // Weak crypto algorithms
      if (
        /(md5|sha1)\s*\(/i.test(line) &&
        /(hash|password|digest|crypto)/i.test(file.path)
      ) {
        issues.push({
          file: file.path,
          line: lineNum,
          severity: 'medium',
          message: 'Deprecated hash algorithm (MD5/SHA1) detected',
          recommendation:
            'Use SHA-256 or SHA-3 for general hashing. For passwords: bcrypt (Node.js), argon2 (modern standard), or scrypt. Never use MD5 or SHA1 for security purposes.',
          codeSnippet: line.trim().substring(0, 100),
        });
      }
    });
  }

  /**
   * Check for best practices
   */
  private checkBestPractices(
    file: { path: string; content: string; language: string },
    issues: AnalysisResult['findings']['bestPractices'],
  ): void {
    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Long lines - only flag very long lines (150+ chars) to reduce noise
      if (line.length > 150 && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        issues.push({
          file: file.path,
          line: lineNum,
          message: `Line exceeds 150 characters (${line.length} chars)`,
          recommendation:
            'Break into multiple lines or extract to a variable. Modern IDEs support soft wrapping, but long lines hurt readability and code review.',
          codeSnippet: line.substring(0, 150) + '...',
        });
      }

      // TODO/FIXME - only flag meaningful TODOs (not in test files, has description)
      if (
        /(TODO|FIXME|HACK|XXX|BUG)[\s:]+[A-Za-z]{5,}/i.test(line) &&
        /\/\/|\/\*|#/.test(line) &&
        !/test|spec|example/i.test(file.path)
      ) {
        const match = line.match(/(TODO|FIXME|HACK|XXX|BUG)[\s:]+([^\n]{10,})/i);
        if (match && match[2]) {
          issues.push({
            file: file.path,
            line: lineNum,
            message: `${match[1]} found: ${match[2].trim().substring(0, 60)}${match[2].length > 60 ? '...' : ''}`,
            recommendation:
              'Create a GitHub issue or Jira ticket to track this. Add a reference number in the comment (e.g., TODO #123).',
            codeSnippet: line.trim().substring(0, 100),
          });
        }
      }

      // Console.log - only in production code, not test files
      if (
        /\bconsole\.(log|debug)\s*\(/i.test(line) &&
        !/test|spec|\.test\.|\.spec\./i.test(file.path) &&
        !line.trim().startsWith('//')
      ) {
        issues.push({
          file: file.path,
          line: lineNum,
          message: 'console.log() in production code',
          recommendation:
            'Use a logging library: Winston/Pino (Node.js), or your framework logger. Configure log levels (DEBUG, INFO, WARN, ERROR) and disable DEBUG in production.',
          codeSnippet: line.trim().substring(0, 100),
        });
      }

      // Empty catch blocks - critical issue
      if (
        /catch\s*\([^)]*\)\s*\{[\s]*\}/i.test(line) ||
        (line.includes('catch') && index < lines.length - 1 && lines[index + 1]?.trim() === '}')
      ) {
        issues.push({
          file: file.path,
          line: lineNum,
          message: 'Empty catch block - errors are silently swallowed',
          recommendation:
            'Always handle errors: log with context (logger.error(err, { context })), notify monitoring (Sentry, Datadog), or rethrow if unhandled. Silent failures make debugging impossible.',
          codeSnippet: line.trim().substring(0, 100),
        });
      }

      // Deprecated React methods - only in React files
      if (
        /(componentWillMount|componentWillReceiveProps|componentWillUpdate)/i.test(line) &&
        /\.(jsx?|tsx?)$/i.test(file.path)
      ) {
        issues.push({
          file: file.path,
          line: lineNum,
          message: 'Deprecated React lifecycle method',
          recommendation:
            'React 18+ removed these methods. Use: useEffect() for side effects, getDerivedStateFromProps() for derived state, or getSnapshotBeforeUpdate() for snapshots.',
          codeSnippet: line.trim().substring(0, 100),
        });
      }

      // var instead of let/const - modern JS standard
      if (
        /\bvar\s+\w+/i.test(line) &&
        /\.(js|jsx|ts|tsx)$/i.test(file.path) &&
        !line.trim().startsWith('//')
      ) {
        issues.push({
          file: file.path,
          line: lineNum,
          message: 'var declaration used instead of let/const',
          recommendation:
            'Use const by default, let when reassignment is needed. var has function scope and can cause bugs. Modern JS (ES6+) standard is let/const.',
          codeSnippet: line.trim().substring(0, 100),
        });
      }

      // == instead of === - only flag actual loose equality
      if (
        /[^=!<>=]=\s*[^=<>]/i.test(line) &&
        !/===|!==|<=|>=/i.test(line) &&
        /\.(js|jsx|ts|tsx)$/i.test(file.path) &&
        !line.trim().startsWith('//')
      ) {
        // Check if it's actually == (loose equality) not assignment
        if (line.includes(' == ') || line.match(/[^=!]=\s*[^=<>]/)) {
          issues.push({
            file: file.path,
            line: lineNum,
            message: 'Loose equality (==) instead of strict equality (===)',
            recommendation:
              'Always use === and !== to avoid type coercion bugs. ESLint rule: eqeqeq enforces this. Only use == if you explicitly need type coercion.',
            codeSnippet: line.trim().substring(0, 100),
          });
        }
      }
    });
  }

  /**
   * Calculate code quality score (0-100)
   */
  private calculateQualityScore(
    securityIssues: number,
    bestPracticeIssues: number,
    avgComplexity: number,
  ): number {
    let score = 100;

    // Deduct points for security issues
    score -= securityIssues * 5; // -5 per security issue

    // Deduct points for best practice issues
    score -= bestPracticeIssues * 1; // -1 per best practice issue

    // Deduct points for high complexity
    if (avgComplexity > 10) {
      score -= (avgComplexity - 10) * 2;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
