import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { JwtPayload } from '../auth/auth.service';
import { ReposService } from './repos.service';

@Controller('repos')
export class ReposController {
  constructor(private reposService: ReposService) {}

  /**
   * Get repositories for the authenticated user with pagination
   * GET /repos?page=1&per_page=30
   */
  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getUserRepositories(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    const user = req.user as JwtPayload;

    if (!user.githubToken) {
      return {
        error: 'GitHub access token not found. Please re-authenticate.',
        repos: [],
        hasMore: false,
        nextPage: null,
      };
    }

    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const perPageNum = perPage ? parseInt(perPage, 10) : 30;

      const result = await this.reposService.getUserRepositories(
        user.githubToken,
        pageNum,
        perPageNum,
      );

      return {
        repos: result.repos,
        hasMore: result.hasMore,
        nextPage: result.nextPage,
        totalCount: result.totalCount,
        page: pageNum,
        perPage: perPageNum,
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to fetch repositories',
        repos: [],
        hasMore: false,
        nextPage: null,
      };
    }
  }

  /**
   * Get a specific repository
   * GET /repos/:owner/:repo
   */
  @Get(':owner/:repo')
  @UseGuards(AuthGuard('jwt'))
  async getRepository(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Req() req: Request,
  ) {
    const user = req.user as JwtPayload;

    if (!user.githubToken) {
      return {
        error: 'GitHub access token not found. Please re-authenticate.',
      };
    }

    try {
      const repository = await this.reposService.getRepository(
        user.githubToken,
        owner,
        repo,
      );
      return {
        repo: repository,
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to fetch repository',
      };
    }
  }
}
