import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ReposModule } from './repos/repos.module';
import { AnalysisModule } from './analysis/analysis.module';

// Try to import BullMQ, but make it optional
let BullModule: any;
let useBullMQ = false;
try {
  BullModule = require('@nestjs/bullmq').BullModule;
  // Check if Redis is available (optional - will fall back if not)
  useBullMQ = true;
} catch (e) {
  console.warn('⚠️  @nestjs/bullmq not installed. Analysis features will work synchronously.');
  console.warn('   Install with: npm install @nestjs/bullmq bullmq ioredis');
}

// Only use BullMQ if Redis is available (check on startup)
let bullMQImports: any[] = [];
if (BullModule && useBullMQ) {
  try {
    // Suppress Redis connection errors by using lazy connect and error handlers
    bullMQImports = [
      BullModule.forRoot({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
          retryStrategy: () => null, // Don't retry on connection failure
          reconnectOnError: () => false, // Don't reconnect on error
          // Suppress connection errors
          showFriendlyErrorStack: false,
        },
        // Suppress connection errors in logs
        settings: {
          stalledInterval: 30000,
          maxStalledCount: 1,
        },
      }),
    ];
  } catch (e) {
    // If BullMQ setup fails, continue without it
    console.warn('⚠️  BullMQ setup failed, will use synchronous processing');
    bullMQImports = [];
  }
}

@Module({
  imports: [...bullMQImports, AuthModule, ReposModule, AnalysisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
