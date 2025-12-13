import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AnalysisService } from './analysis.service';
import type { JwtPayload } from '../auth/auth.service';

interface StartAnalysisDto {
  owner: string;
  repo: string;
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
}

