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
}

