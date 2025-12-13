import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface JwtPayload {
  sub: number; // GitHub user ID
  username: string;
  email: string;
  name?: string;
  avatar_url?: string;
  githubToken?: string; // GitHub access token for API calls
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  /**
   * Generate JWT token for authenticated user
   */
  async generateToken(user: GitHubUser & { accessToken?: string }): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.login,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      githubToken: user.accessToken, // Store GitHub access token
    };

    return this.jwtService.signAsync(payload);
  }

  /**
   * Validate JWT token and return user payload
   */
  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate user from JWT payload
   */
  async validateUser(payload: JwtPayload): Promise<JwtPayload | null> {
    // In a real app, you might want to check if user exists in database
    // For now, we'll just return the payload if token is valid
    return payload;
  }
}
