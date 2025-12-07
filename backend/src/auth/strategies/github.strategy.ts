import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AuthService, GitHubUser } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ||
        'http://localhost:3000/auth/github/callback',
      scope: ['user:email'], // Request email access
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): GitHubUser {
    // Extract user information from GitHub profile
    const { id, username, displayName, photos, emails } = profile;

    // Get email (GitHub may return multiple emails, use the first one)
    const email = emails && emails.length > 0 ? emails[0].value : '';

    const user: GitHubUser = {
      id: parseInt(id, 10),
      login: username || '',
      name: displayName || username || '',
      email: email,
      avatar_url: photos && photos.length > 0 ? photos[0].value : '',
    };

    return user;
  }
}
