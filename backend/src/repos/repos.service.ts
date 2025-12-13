import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from '../auth/auth.service';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  default_branch: string;
}

@Injectable()
export class ReposService {
  private readonly githubApiUrl = 'https://api.github.com';

  /**
   * Fetch user repositories from GitHub
   */
  async getUserRepositories(githubToken: string): Promise<GitHubRepository[]> {
    if (!githubToken) {
      throw new UnauthorizedException('GitHub access token not found');
    }

    try {
      const response = await fetch(
        `${this.githubApiUrl}/user/repos?per_page=100&sort=updated`,
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'CodeGuardianAI',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new UnauthorizedException('Invalid GitHub access token');
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repos = await response.json();
      return repos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        updated_at: repo.updated_at,
        default_branch: repo.default_branch,
      }));
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  /**
   * Fetch a specific repository by full name
   */
  async getRepository(
    githubToken: string,
    owner: string,
    repo: string,
  ): Promise<GitHubRepository> {
    if (!githubToken) {
      throw new UnauthorizedException('GitHub access token not found');
    }

    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}`,
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'CodeGuardianAI',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new UnauthorizedException('Invalid GitHub access token');
        }
        if (response.status === 404) {
          throw new Error('Repository not found');
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repoData = await response.json();
      return {
        id: repoData.id,
        name: repoData.name,
        full_name: repoData.full_name,
        description: repoData.description,
        private: repoData.private,
        html_url: repoData.html_url,
        language: repoData.language,
        stargazers_count: repoData.stargazers_count,
        forks_count: repoData.forks_count,
        updated_at: repoData.updated_at,
        default_branch: repoData.default_branch,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new Error(`Failed to fetch repository: ${error.message}`);
    }
  }
}
