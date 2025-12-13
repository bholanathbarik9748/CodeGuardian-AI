import { Injectable, UnauthorizedException } from '@nestjs/common';

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
   * Fetch user repositories from GitHub with pagination
   */
  async getUserRepositories(
    githubToken: string,
    page: number = 1,
    perPage: number = 30,
  ): Promise<{
    repos: GitHubRepository[];
    hasMore: boolean;
    nextPage: number | null;
    totalCount: number | null;
  }> {
    if (!githubToken) {
      throw new UnauthorizedException('GitHub access token not found');
    }

    try {
      const response = await fetch(
        `${this.githubApiUrl}/user/repos?page=${page}&per_page=${perPage}&sort=updated`,
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

      const repos = (await response.json()) as Array<{
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
      }>;
      const linkHeader = response.headers.get('link');

      // Parse Link header to determine if there are more pages
      let hasMore = false;
      let nextPage: number | null = null;

      if (linkHeader) {
        const links = linkHeader.split(',');
        const nextLink = links.find((link) => link.includes('rel="next"'));
        hasMore = !!nextLink;
        if (nextLink) {
          const match = nextLink.match(/[?&]page=(\d+)/);
          if (match) {
            nextPage = parseInt(match[1], 10);
          }
        }
      } else {
        // If no Link header, check if we got a full page
        hasMore = repos.length === perPage;
        if (hasMore) {
          nextPage = page + 1;
        }
      }

      // Get total count from Link header if available
      const totalCountHeader = response.headers.get('x-total-count');
      const totalCount = totalCountHeader
        ? parseInt(totalCountHeader, 10)
        : null;

      const mappedRepos = repos.map((repo) => ({
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

      return {
        repos: mappedRepos,
        hasMore,
        nextPage,
        totalCount,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch repositories: ${errorMessage}`);
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

      const repoData = (await response.json()) as {
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
      };
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch repository: ${errorMessage}`);
    }
  }
}
