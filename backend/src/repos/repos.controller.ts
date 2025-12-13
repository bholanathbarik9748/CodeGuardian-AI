import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { JwtPayload } from '../auth/auth.service';
import { ReposService } from './repos.service';

@Controller('repos')
export class ReposController {
  constructor(private reposService: ReposService) {}

  /**
   * Get all repositories for the authenticated user
   * GET /repos
   */
  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getUserRepositories(@Req() req: Request) {
    const user = req.user as JwtPayload;

    if (!user.githubToken) {
      return {
        error: 'GitHub access token not found. Please re-authenticate.',
        repos: [],
      };
    }

    try {
      const repos = await this.reposService.getUserRepositories(
        user.githubToken,
      );
      return {
        repos,
        count: repos.length,
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to fetch repositories',
        repos: [],
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
