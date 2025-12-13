import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService, type GitHubUser } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Initiate GitHub OAuth flow
   * GET /auth/github/login
   * Passport intercepts this and redirects to GitHub OAuth
   */
  @Get('github/login')
  @UseGuards(AuthGuard('github'))
  githubLogin() {
    // Method body never executes - Passport handles the redirect to GitHub
  }

  /**
   * GitHub OAuth callback
   * GET /auth/github/callback
   */
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    // User is attached to request by Passport
    // Note: accessToken is included in the user object from GitHub strategy
    const user = req.user as GitHubUser & { accessToken?: string };

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`,
      );
    }

    // Generate JWT token (includes accessToken if available)
    const token = await this.authService.generateToken(user);

    if (!token) {
      console.error('❌ Failed to generate token');
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=token_generation_failed`,
      );
    }

    // Redirect to frontend dashboard with token (URL encode the token)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/dashboard?token=${encodeURIComponent(token)}`;

    console.log('✅ Redirecting to dashboard with token');
    return res.redirect(redirectUrl);
  }

  /**
   * Get current user info (protected route)
   * GET /auth/me
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: Request) {
    // User payload is attached by JWT strategy
    return {
      user: req.user,
    };
  }

  /**
   * Logout endpoint (client-side token removal)
   * GET /auth/logout
   */
  @Get('logout')
  logout() {
    // JWT tokens are stateless, so logout is handled client-side
    // by removing the token from storage
    return {
      message: 'Logged out successfully',
    };
  }
}
