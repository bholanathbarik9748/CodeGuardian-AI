import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AnalysisService } from './analysis.service';
import type { JwtPayload } from '../auth/auth.service';

interface StartAnalysisDto {
  owner: string;
  repo: string;
}

interface BatchAnalysisDto {
  repositories: Array<{ owner: string; repo: string }>;
}

@Controller('analyze')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  /**
   * Start analysis for a repository
   * POST /analyze
   */
  @Post()
  @UseGuards(AuthGuard('jwt'))
  async startAnalysis(
    @Req() req: Request,
    @Body() body: StartAnalysisDto,
  ) {
    const user = req.user as JwtPayload;
    const { owner, repo } = body;

    if (!owner || !repo) {
      return {
        error: 'Owner and repo are required',
      };
    }

    const { jobId } = await this.analysisService.startAnalysis(
      user,
      owner,
      repo,
    );

    return {
      jobId,
      message: 'Analysis started',
      statusUrl: `/analyze/${jobId}`,
    };
  }

  /**
   * Get analysis job status
   * GET /analyze/:jobId
   */
  @Get(':jobId')
  @UseGuards(AuthGuard('jwt'))
  async getAnalysisStatus(@Param('jobId') jobId: string) {
    const job = this.analysisService.getJobStatus(jobId);
    return job;
  }

  /**
   * Export analysis as JSON
   * GET /analyze/:jobId/export/json
   */
  @Get(':jobId/export/json')
  @UseGuards(AuthGuard('jwt'))
  async exportJson(@Param('jobId') jobId: string, @Res() res: Response) {
    const job = this.analysisService.getJobStatus(jobId);
    if (job.status !== 'completed' || !job.result) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Analysis not completed yet',
      });
    }

    const filename = `${job.repository.fullName.replace('/', '-')}-analysis-${jobId}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      repository: job.repository,
      analyzedAt: job.completedAt,
      ...job.result,
    });
  }

  /**
   * Export analysis as CSV
   * GET /analyze/:jobId/export/csv
   */
  @Get(':jobId/export/csv')
  @UseGuards(AuthGuard('jwt'))
  async exportCsv(@Param('jobId') jobId: string, @Res() res: Response) {
    const job = this.analysisService.getJobStatus(jobId);
    if (job.status !== 'completed' || !job.result) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Analysis not completed yet',
      });
    }

    const csv = this.analysisService.generateCsv(job);
    const filename = `${job.repository.fullName.replace('/', '-')}-analysis-${jobId}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  /**
   * Start batch analysis for multiple repositories
   * POST /analyze/batch
   */
  @Post('batch')
  @UseGuards(AuthGuard('jwt'))
  async startBatchAnalysis(
    @Req() req: Request,
    @Body() body: BatchAnalysisDto,
  ) {
    const user = req.user as JwtPayload;
    const { repositories } = body;

    if (!repositories || !Array.isArray(repositories) || repositories.length === 0) {
      return {
        error: 'Repositories array is required',
      };
    }

    if (repositories.length > 10) {
      return {
        error: 'Maximum 10 repositories allowed per batch',
      };
    }

    const jobIds = await Promise.all(
      repositories.map(({ owner, repo }) =>
        this.analysisService.startAnalysis(user, owner, repo),
      ),
    );

    return {
      jobIds: jobIds.map((j) => j.jobId),
      message: `Started analysis for ${repositories.length} repositories`,
      statusUrl: '/analyze/history',
    };
  }

  /**
   * Export analysis as PDF
   * GET /analyze/:jobId/export/pdf
   */
  @Get(':jobId/export/pdf')
  @UseGuards(AuthGuard('jwt'))
  async exportPdf(@Param('jobId') jobId: string, @Res() res: Response) {
    const job = this.analysisService.getJobStatus(jobId);
    if (job.status !== 'completed' || !job.result) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Analysis not completed yet',
      });
    }

    try {
      const pdfBuffer = await this.analysisService.generatePdf(job);
      const filename = `${job.repository.fullName.replace('/', '-')}-analysis-${jobId}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      });
    }
  }

  /**
   * Get analysis history for current user
   * GET /analyze/history/list
   */
  @Get('history/list')
  @UseGuards(AuthGuard('jwt'))
  async getAnalysisHistory(@Req() req: Request) {
    const user = req.user as JwtPayload;
    const history = this.analysisService.getUserHistory(user.sub);
    return {
      count: history.length,
      analyses: history,
    };
  }

  /**
   * Get analytics/statistics for current user
   * GET /analyze/analytics
   */
  @Get('analytics')
  @UseGuards(AuthGuard('jwt'))
  async getAnalytics(@Req() req: Request) {
    const user = req.user as JwtPayload;
    const history = this.analysisService.getUserHistory(user.sub);

    if (history.length === 0) {
      return {
        totalAnalyses: 0,
        averageQualityScore: 0,
        totalIssues: 0,
        repositoriesAnalyzed: 0,
        trends: [],
      };
    }

    // Calculate statistics
    const totalAnalyses = history.length;
    const totalIssues = history.reduce(
      (sum, job) => sum + (job.result?.findings.security.length || 0) + (job.result?.findings.bestPractices.length || 0),
      0,
    );
    const averageQualityScore =
      history.reduce((sum, job) => sum + (job.result?.metrics.codeQuality.score || 0), 0) /
      totalAnalyses;
    const repositoriesAnalyzed = new Set(history.map((job) => job.repository.fullName)).size;

    // Calculate trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentAnalyses = history.filter(
      (job) => job.completedAt && new Date(job.completedAt) >= sevenDaysAgo,
    );

    const trends: Array<{ date: string; analyses: number; averageQuality: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayAnalyses = history.filter(
        (job) =>
          job.completedAt &&
          new Date(job.completedAt) >= date &&
          new Date(job.completedAt) < nextDate,
      );

      trends.push({
        date: date.toISOString().split('T')[0],
        analyses: dayAnalyses.length,
        averageQuality: dayAnalyses.length > 0
          ? dayAnalyses.reduce((sum, job) => sum + (job.result?.metrics.codeQuality.score || 0), 0) /
            dayAnalyses.length
          : 0,
      });
    }

    // Language distribution
    const languageStats: Record<string, number> = {};
    history.forEach((job) => {
      if (job.result?.summary.languages) {
        Object.entries(job.result.summary.languages).forEach(([lang, lines]) => {
          languageStats[lang] = (languageStats[lang] || 0) + lines;
        });
      }
    });

    // Most common issues
    const securityIssueCounts: Record<string, number> = {};
    const bestPracticeCounts: Record<string, number> = {};
    history.forEach((job) => {
      job.result?.findings.security.forEach((issue) => {
        const key = issue.message.substring(0, 50);
        securityIssueCounts[key] = (securityIssueCounts[key] || 0) + 1;
      });
      job.result?.findings.bestPractices.forEach((issue) => {
        const key = issue.message.substring(0, 50);
        bestPracticeCounts[key] = (bestPracticeCounts[key] || 0) + 1;
      });
    });

    return {
      totalAnalyses,
      averageQualityScore: Math.round(averageQualityScore * 100) / 100,
      totalIssues,
      repositoriesAnalyzed,
      recentAnalyses: recentAnalyses.length,
      trends,
      languageDistribution: Object.entries(languageStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([lang, lines]) => ({ language: lang, totalLines: lines })),
      topSecurityIssues: Object.entries(securityIssueCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([message, count]) => ({ message, count })),
      topBestPractices: Object.entries(bestPracticeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([message, count]) => ({ message, count })),
    };
  }
}

