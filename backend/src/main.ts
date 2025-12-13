// Load environment variables from .env file
let dotenvLoaded = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  const envPath = path.resolve(__dirname, '../.env');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.warn(
      '⚠️  Warning: Could not load .env file:',
      result.error.message,
    );
  } else {
    dotenvLoaded = true;
    console.log('✅ Loaded environment variables from .env file');
  }
} catch (e) {
  console.warn(
    '⚠️  Warning: dotenv package not found. Install it with: npm install dotenv',
  );
  console.warn(
    '   Or set environment variables manually before starting the server',
  );
}

// Verify required environment variables
if (
  !process.env.GITHUB_CLIENT_ID ||
  process.env.GITHUB_CLIENT_ID === 'your_actual_client_id'
) {
  console.error('❌ ERROR: GITHUB_CLIENT_ID is not set or is a placeholder!');
  console.error(
    '   Please update backend/.env with your actual GitHub OAuth Client ID',
  );
  console.error('   Current value:', process.env.GITHUB_CLIENT_ID || '(empty)');
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Suppress Redis/ioredis connection errors (they're expected if Redis isn't running)
  const originalError = console.error;
  const originalLog = console.log;
  
  const isRedisError = (message: string): boolean => {
    return (
      message.includes('ECONNREFUSED') ||
      message.includes('Connection is closed') ||
      (message.includes('6379') && message.includes('connect')) ||
      message.includes('ioredis') ||
      (message.includes('Redis') && message.includes('connection'))
    );
  };

  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (isRedisError(message)) {
      // Silently ignore Redis connection errors (analysis will work synchronously)
      return;
    }
    originalError.apply(console, args);
  };

  console.log = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (isRedisError(message)) {
      // Silently ignore Redis connection errors
      return;
    }
    originalLog.apply(console, args);
  };

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Reduce verbosity - only show errors, warnings, and our custom logs
  });

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const port = parseInt(process.env.PORT || '3000', 10);

  try {
    await app.listen(port);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 BACKEND SERVER STARTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 URL:     http://localhost:${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(
      `🔗 CORS:    Enabled for ${process.env.FRONTEND_URL || 'http://localhost:5173'}`,
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      const fallbackPort = port + 1;
      console.error(
        `❌ Port ${port} is already in use. Trying port ${fallbackPort}...`,
      );
      await app.listen(fallbackPort);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 BACKEND SERVER STARTED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 URL:     http://localhost:${fallbackPort}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(
        `🔗 CORS:    Enabled for ${process.env.FRONTEND_URL || 'http://localhost:5173'}`,
      );
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      throw error;
    }
  }
}
bootstrap();
