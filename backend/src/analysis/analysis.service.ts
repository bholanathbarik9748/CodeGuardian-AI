import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import type { JwtPayload } from '../auth/auth.service';
import { LLMService } from './llm.service';

// Try to import BullMQ, but make it optional
let InjectQueue: any;
let Queue: any;
try {
  const bullmq = require('@nestjs/bullmq');
  InjectQueue = bullmq.InjectQueue;
  Queue = require('bullmq').Queue;
} catch (e) {
  // BullMQ not installed - will use in-memory processing
}

export interface AnalysisJob {
  id: string;
  userId: number; // GitHub user ID who started the analysis
  repository: {
    owner: string;
    repo: string;
    fullName: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: AnalysisResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
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
      score: number; // 0-100
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

// In-memory store for job status (in production, use Redis)
const jobStore = new Map<string, AnalysisJob>();

@Injectable()
export class AnalysisService {
  private analysisQueue: any;

  constructor(
    @Inject(forwardRef(() => LLMService))
    private readonly llmService: LLMService,
  ) {
    // Queue injection will be handled by NestJS if BullMQ is available
    // For now, we'll process synchronously if BullMQ is not available
  }

  // Method to set queue if injected (called by module if BullMQ is available)
  setQueue(queue: any) {
    this.analysisQueue = queue;
  }

  /**
   * Start analysis job for a repository
   */
  async startAnalysis(
    user: JwtPayload,
    owner: string,
    repo: string,
  ): Promise<{ jobId: string }> {
    const jobId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullName = `${owner}/${repo}`;

    // Create job record
    const job: AnalysisJob = {
      id: jobId,
      userId: user.sub, // Store user ID for history filtering
      repository: { owner, repo, fullName },
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };

    jobStore.set(jobId, job);

    // Add job to queue if BullMQ is available, otherwise process synchronously
    if (this.analysisQueue) {
      await this.analysisQueue.add(
        'analyze-repository',
        {
          jobId,
          owner,
          repo,
          fullName,
          githubToken: user.githubToken,
        },
        {
          jobId, // Use our custom jobId
        },
      );
    } else {
      // Process synchronously if BullMQ is not available
      // Import processor methods directly to avoid circular dependency
      setImmediate(async () => {
        try {
          // Use require to avoid TypeScript module resolution issues
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const processorModule = require('./analysis.processor');
          const processor = new processorModule.AnalysisProcessor(this, this.llmService);
          await processor.process({
            data: {
              jobId,
              owner,
              repo,
              fullName,
              githubToken: user.githubToken!,
            },
          });
        } catch (error) {
          this.updateJobStatus(jobId, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          });
        }
      });
    }

    return { jobId };
  }

  /**
   * Get analysis job status
   */
  getJobStatus(jobId: string): AnalysisJob {
    const job = jobStore.get(jobId);
    if (!job) {
      throw new NotFoundException(`Analysis job ${jobId} not found`);
    }
    return job;
  }

  /**
   * Update job status (called by processor)
   */
  updateJobStatus(jobId: string, updates: Partial<AnalysisJob>): void {
    const job = jobStore.get(jobId);
    if (job) {
      Object.assign(job, updates);
      jobStore.set(jobId, job);
    }
  }

  /**
   * Get all jobs for a user (for history)
   */
  getUserJobs(userId: number): AnalysisJob[] {
    return Array.from(jobStore.values()).filter(
      (job) => job.repository.owner === String(userId), // Simple filter, can be improved
    );
  }

  /**
   * Get analysis history for a user (sorted by date, most recent first)
   */
  getUserHistory(userId: number): AnalysisJob[] {
    const allJobs = Array.from(jobStore.values());
    // Filter by user ID and completed jobs, sort by completion date
    return allJobs
      .filter((job) => job.userId === userId && job.status === 'completed' && job.result)
      .sort((a, b) => {
        const dateA = a.completedAt?.getTime() || 0;
        const dateB = b.completedAt?.getTime() || 0;
        return dateB - dateA; // Most recent first
      })
      .slice(0, 50); // Limit to last 50 analyses
  }

  /**
   * Generate CSV export from analysis job
   */
  generateCsv(job: AnalysisJob): string {
    if (!job.result) {
      return '';
    }

    const lines: string[] = [];
    
    // Header
    lines.push('CodeGuardian AI - Analysis Report');
    lines.push(`Repository: ${job.repository.fullName}`);
    lines.push(`Analyzed At: ${job.completedAt?.toISOString() || 'N/A'}`);
    lines.push('');
    
    // Summary
    lines.push('SUMMARY');
    lines.push('Metric,Value');
    lines.push(`Total Files,${job.result.summary.totalFiles}`);
    lines.push(`Total Lines,${job.result.summary.totalLines}`);
    lines.push(`Quality Score,${job.result.metrics.codeQuality.score}`);
    lines.push(`Average Complexity,${job.result.metrics.complexity.average.toFixed(2)}`);
    lines.push(`Max Complexity,${job.result.metrics.complexity.max}`);
    lines.push(`Security Issues,${job.result.findings.security.length}`);
    lines.push(`Best Practice Issues,${job.result.findings.bestPractices.length}`);
    lines.push('');
    
    // Languages
    lines.push('LANGUAGES');
    lines.push('Language,Lines');
    Object.entries(job.result.summary.languages).forEach(([lang, count]) => {
      lines.push(`${lang},${count}`);
    });
    lines.push('');
    
    // Tech Stack
    lines.push('TECH STACK');
    lines.push('Category,Technologies');
    if (job.result.summary.techStack.frameworks.length > 0) {
      lines.push(`Frameworks,"${job.result.summary.techStack.frameworks.join(', ')}"`);
    }
    if (job.result.summary.techStack.libraries.length > 0) {
      lines.push(`Libraries,"${job.result.summary.techStack.libraries.join(', ')}"`);
    }
    if (job.result.summary.techStack.buildTools.length > 0) {
      lines.push(`Build Tools,"${job.result.summary.techStack.buildTools.join(', ')}"`);
    }
    if (job.result.summary.techStack.databases.length > 0) {
      lines.push(`Databases,"${job.result.summary.techStack.databases.join(', ')}"`);
    }
    if (job.result.summary.techStack.other.length > 0) {
      lines.push(`Other,"${job.result.summary.techStack.other.join(', ')}"`);
    }
    lines.push('');
    
    // Security Issues
    if (job.result.findings.security.length > 0) {
      lines.push('SECURITY ISSUES');
      lines.push('File,Line,Severity,Message,Recommendation');
      job.result.findings.security.forEach((issue) => {
        const message = (issue.message || '').replace(/"/g, '""');
        const recommendation = (issue.recommendation || '').replace(/"/g, '""');
        lines.push(`"${issue.file}",${issue.line},${issue.severity},"${message}","${recommendation}"`);
      });
      lines.push('');
    }
    
    // Best Practices
    if (job.result.findings.bestPractices.length > 0) {
      lines.push('BEST PRACTICES');
      lines.push('File,Line,Message,Recommendation');
      job.result.findings.bestPractices.forEach((issue) => {
        const message = (issue.message || '').replace(/"/g, '""');
        const recommendation = (issue.recommendation || '').replace(/"/g, '""');
        lines.push(`"${issue.file}",${issue.line},"${message}","${recommendation}"`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * Generate PDF export from analysis job
   */
  async generatePdf(job: AnalysisJob): Promise<Buffer> {
    if (!job.result) {
      throw new Error('Analysis result not available');
    }

    // Type guard - we know result exists after the check above
    const result = job.result;

    // Try to import PDFKit, but make it optional
    let PDFDocument: any;
    try {
      PDFDocument = require('pdfkit');
    } catch (e) {
      throw new Error('PDFKit not installed. Run: npm install pdfkit @types/pdfkit');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('CodeGuardian AI', { align: 'center' });
        doc.fontSize(16).text('Analysis Report', { align: 'center' });
        doc.moveDown();

        // Repository Info
        doc.fontSize(14).text(`Repository: ${job.repository.fullName}`, { underline: true });
        doc.fontSize(10).text(`Analyzed At: ${job.completedAt?.toLocaleString() || 'N/A'}`);
        doc.moveDown(2);

        // Summary
        doc.fontSize(14).text('Summary', { underline: true });
        doc.fontSize(10);
        doc.text(`Total Files: ${result.summary.totalFiles}`);
        doc.text(`Total Lines: ${result.summary.totalLines.toLocaleString()}`);
        doc.text(`Quality Score: ${result.metrics.codeQuality.score}/100`);
        doc.text(`Average Complexity: ${result.metrics.complexity.average.toFixed(2)}`);
        doc.text(`Max Complexity: ${result.metrics.complexity.max}`);
        doc.text(`Security Issues: ${result.findings.security.length}`);
        doc.text(`Best Practice Issues: ${result.findings.bestPractices.length}`);
        doc.moveDown();

        // Languages
        if (Object.keys(result.summary.languages).length > 0) {
          doc.fontSize(14).text('Languages', { underline: true });
          doc.fontSize(10);
          Object.entries(result.summary.languages)
            .sort(([, a], [, b]) => b - a)
            .forEach(([lang, count]) => {
              doc.text(`${lang}: ${count.toLocaleString()} lines`);
            });
          doc.moveDown();
        }

        // Tech Stack
        const techStack = result.summary.techStack;
        if (
          techStack.frameworks.length > 0 ||
          techStack.libraries.length > 0 ||
          techStack.buildTools.length > 0 ||
          techStack.databases.length > 0 ||
          techStack.other.length > 0
        ) {
          doc.fontSize(14).text('Tech Stack', { underline: true });
          doc.fontSize(10);
          if (techStack.frameworks.length > 0) {
            doc.text(`Frameworks: ${techStack.frameworks.join(', ')}`);
          }
          if (techStack.libraries.length > 0) {
            doc.text(`Libraries: ${techStack.libraries.join(', ')}`);
          }
          if (techStack.buildTools.length > 0) {
            doc.text(`Build Tools: ${techStack.buildTools.join(', ')}`);
          }
          if (techStack.databases.length > 0) {
            doc.text(`Databases: ${techStack.databases.join(', ')}`);
          }
          if (techStack.other.length > 0) {
            doc.text(`Other: ${techStack.other.join(', ')}`);
          }
          doc.moveDown();
        }

        // Security Issues (limit to first 20 for PDF)
        if (result.findings.security.length > 0) {
          doc.addPage();
          doc.fontSize(14).text(`Security Issues (${result.findings.security.length})`, {
            underline: true,
          });
          doc.fontSize(10);
          result.findings.security.slice(0, 20).forEach((issue, idx) => {
            if (idx > 0) doc.moveDown(0.5);
            doc.fontSize(11).text(`${issue.file}:${issue.line} [${issue.severity.toUpperCase()}]`, {
              continued: false,
            });
            doc.fontSize(10).text(issue.message);
            if (issue.recommendation) {
              doc.fontSize(9).text(`💡 ${issue.recommendation}`, { indent: 10 });
            }
            if (idx < 19) doc.moveDown();
          });
          if (result.findings.security.length > 20) {
            doc.moveDown();
            doc.fontSize(9).text(
              `... and ${result.findings.security.length - 20} more security issues`,
              { italic: true },
            );
          }
        }

        // Best Practices (limit to first 20 for PDF)
        if (result.findings.bestPractices.length > 0) {
          doc.addPage();
          doc.fontSize(14).text(
            `Best Practices (${result.findings.bestPractices.length})`,
            { underline: true },
          );
          doc.fontSize(10);
          result.findings.bestPractices.slice(0, 20).forEach((issue, idx) => {
            if (idx > 0) doc.moveDown(0.5);
            doc.fontSize(11).text(`${issue.file}:${issue.line}`, { continued: false });
            doc.fontSize(10).text(issue.message);
            if (issue.recommendation) {
              doc.fontSize(9).text(`💡 ${issue.recommendation}`, { indent: 10 });
            }
            if (idx < 19) doc.moveDown();
          });
          if (result.findings.bestPractices.length > 20) {
            doc.moveDown();
            doc.fontSize(9).text(
              `... and ${result.findings.bestPractices.length - 20} more best practice issues`,
              { italic: true },
            );
          }
        }

        // Footer
        doc.fontSize(8).text(
          `Generated by CodeGuardian AI on ${new Date().toLocaleString()}`,
          50,
          doc.page.height - 50,
          { align: 'center' },
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send webhook notification when analysis completes
   */
  async sendWebhookNotification(jobId: string, status: 'completed' | 'failed'): Promise<void> {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      return; // Webhook not configured
    }

    try {
      const job = this.getJobStatus(jobId);
      const payload = {
        event: 'analysis.completed',
        jobId: job.id,
        repository: job.repository,
        status: job.status,
        progress: job.progress,
        completedAt: job.completedAt,
        result: status === 'completed' ? {
          summary: job.result?.summary,
          metrics: job.result?.metrics,
          totalIssues: (job.result?.findings.security.length || 0) + (job.result?.findings.bestPractices.length || 0),
        } : undefined,
        error: status === 'failed' ? job.error : undefined,
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CodeGuardianAI/1.0',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Silently fail - webhook is optional
      console.warn('Webhook notification failed:', error);
    }
  }
}
