import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisProcessor } from './analysis.processor';
import { LLMService } from './llm.service';
import { AuthModule } from '../auth/auth.module';

// Try to import BullMQ, but make it optional
let BullModule: any;
try {
  BullModule = require('@nestjs/bullmq').BullModule;
} catch (e) {
  // BullMQ not installed - will use in-memory processing
}

// Only register queue if BullModule is available
// If Redis connection fails, the queue won't be used and we'll process synchronously
let bullMQImports: any[] = [];
if (BullModule) {
  try {
    bullMQImports = [
      BullModule.registerQueue({
        name: 'analysis',
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
        },
      }),
    ];
  } catch (e) {
    // If queue registration fails, continue without it
    console.warn('⚠️  Analysis queue registration failed, will use synchronous processing');
    bullMQImports = [];
  }
}

@Module({
  imports: [...bullMQImports, AuthModule], // For JWT authentication
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    LLMService,
    {
      provide: AnalysisProcessor,
      useFactory: (analysisService: AnalysisService, llmService: LLMService) => {
        return new AnalysisProcessor(analysisService, llmService);
      },
      inject: [AnalysisService, LLMService],
    },
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}

