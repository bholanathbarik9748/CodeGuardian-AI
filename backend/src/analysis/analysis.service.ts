import { Injectable, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from '../auth/auth.service';

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

  constructor() {
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
          const processor = new processorModule.AnalysisProcessor(this);
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
}
