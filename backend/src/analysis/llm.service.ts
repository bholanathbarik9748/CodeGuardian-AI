import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface LLMAnalysisResult {
  isValidIssue: boolean;
  confidence: number; // 0-1
  reasoning?: string;
  improvedMessage?: string;
  improvedRecommendation?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface SecurityIssue {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation?: string;
  codeSnippet?: string;
}

export interface BestPracticeIssue {
  file: string;
  line: number;
  message: string;
  recommendation?: string;
  codeSnippet?: string;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private openai: OpenAI | null = null;
  private enabled: boolean = false;
  private quotaExceeded: boolean = false;
  private lastQuotaErrorTime: number = 0;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        this.openai = new OpenAI({
          apiKey,
        });
        this.enabled = true;
        this.logger.log('✅ OpenAI LLM service enabled');
      } catch (error) {
        this.logger.warn('⚠️  Failed to initialize OpenAI, LLM analysis disabled');
        this.enabled = false;
      }
    } else {
      this.logger.warn('⚠️  OPENAI_API_KEY not set, LLM analysis disabled');
      this.enabled = false;
    }
  }

  /**
   * Check if LLM service is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.openai !== null;
  }

  /**
   * Analyze security issues with LLM to reduce false positives
   */
  async analyzeSecurityIssues(
    issues: SecurityIssue[],
    fileContent: string,
  ): Promise<SecurityIssue[]> {
    if (!this.isEnabled() || issues.length === 0) {
      return issues; // Return original if LLM not available
    }

    // Limit to first 50 issues to avoid token limits
    const issuesToAnalyze = issues.slice(0, 50);
    const remainingIssues = issues.slice(50);

    try {
      const validatedIssues: SecurityIssue[] = [];

      // Batch analyze issues (5 at a time to stay within token limits)
      for (let i = 0; i < issuesToAnalyze.length; i += 5) {
        const batch = issuesToAnalyze.slice(i, i + 5);
        const results = await Promise.all(
          batch.map((issue) => this.validateSecurityIssue(issue, fileContent)),
        );

        // Only keep issues that LLM validates as real issues
        results.forEach((result, idx) => {
          if (result.isValidIssue && result.confidence > 0.6) {
            validatedIssues.push({
              ...batch[idx],
              message: result.improvedMessage || batch[idx].message,
              recommendation:
                result.improvedRecommendation || batch[idx].recommendation,
              severity: result.severity || batch[idx].severity,
            });
          }
        });
      }

      this.logger.log(
        `LLM filtered ${issues.length} security issues to ${validatedIssues.length} valid issues`,
      );

      // Return validated issues + remaining (if any)
      return [...validatedIssues, ...remainingIssues];
    } catch (error: any) {
      // Handle quota errors gracefully
      if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('429')) {
        if (!this.quotaExceeded) {
          this.quotaExceeded = true;
          this.lastQuotaErrorTime = Date.now();
          this.logger.warn(
            '⚠️  OpenAI quota exceeded. LLM analysis disabled. Falling back to regex-only mode. Will retry after 1 hour.',
          );
        }
      } else if (!this.quotaExceeded) {
        this.logger.error('Error in LLM security analysis, returning original issues', error);
      }
      return issues; // Fallback to original issues
    }
  }

  /**
   * Analyze best practices with LLM to reduce false positives
   */
  async analyzeBestPractices(
    issues: BestPracticeIssue[],
    fileContent: string,
  ): Promise<BestPracticeIssue[]> {
    if (!this.isEnabled() || issues.length === 0) {
      return issues; // Return original if LLM not available
    }

    // Limit to first 50 issues to avoid token limits
    const issuesToAnalyze = issues.slice(0, 50);
    const remainingIssues = issues.slice(50);

    try {
      const validatedIssues: BestPracticeIssue[] = [];

      // Batch analyze issues (5 at a time)
      for (let i = 0; i < issuesToAnalyze.length; i += 5) {
        const batch = issuesToAnalyze.slice(i, i + 5);
        const results = await Promise.all(
          batch.map((issue) => this.validateBestPracticeIssue(issue, fileContent)),
        );

        // Only keep issues that LLM validates as real issues
        results.forEach((result, idx) => {
          if (result.isValidIssue && result.confidence > 0.6) {
            validatedIssues.push({
              ...batch[idx],
              message: result.improvedMessage || batch[idx].message,
              recommendation:
                result.improvedRecommendation || batch[idx].recommendation,
            });
          }
        });
      }

      this.logger.log(
        `LLM filtered ${issues.length} best practice issues to ${validatedIssues.length} valid issues`,
      );

      // Return validated issues + remaining (if any)
      return [...validatedIssues, ...remainingIssues];
    } catch (error: any) {
      // Handle quota errors gracefully
      if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('429')) {
        if (!this.quotaExceeded) {
          this.quotaExceeded = true;
          this.lastQuotaErrorTime = Date.now();
          this.logger.warn(
            '⚠️  OpenAI quota exceeded. LLM analysis disabled. Falling back to regex-only mode. Will retry after 1 hour.',
          );
        }
      } else if (!this.quotaExceeded) {
        this.logger.error('Error in LLM best practice analysis, returning original issues', error);
      }
      return issues; // Fallback to original issues
    }
  }

  /**
   * Validate a single security issue with LLM
   */
  private async validateSecurityIssue(
    issue: SecurityIssue,
    fileContent: string,
  ): Promise<LLMAnalysisResult> {
    if (!this.openai) {
      return { isValidIssue: true, confidence: 1.0 };
    }

    try {
      const lines = fileContent.split('\n');
      const contextStart = Math.max(0, issue.line - 5);
      const contextEnd = Math.min(lines.length, issue.line + 5);
      const context = lines.slice(contextStart, contextEnd).join('\n');
      const lineNumber = issue.line - contextStart;

      const prompt = `You are a security code reviewer. Analyze this security issue detection:

File: ${issue.file}
Line: ${issue.line}
Issue: ${issue.message}
Severity: ${issue.severity}

Code Context:
${context}

Detected Code Snippet:
${issue.codeSnippet || 'N/A'}

Determine if this is a REAL security issue or a FALSE POSITIVE. Consider:
1. Is this actually a security vulnerability?
2. Is the code in a test file, example, or comment?
3. Is this a false positive from pattern matching?
4. What is the actual severity?

Respond in JSON format:
{
  "isValidIssue": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "improvedMessage": "more accurate message if needed",
  "improvedRecommendation": "better recommendation if needed",
  "severity": "low|medium|high"
}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // Use cheaper model by default
        messages: [
          {
            role: 'system',
            content:
              'You are a security code reviewer. Analyze code issues and respond only with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { isValidIssue: true, confidence: 0.5 };
      }

      const result = JSON.parse(content) as LLMAnalysisResult;
      return result;
    } catch (error: any) {
      // Handle quota/rate limit errors
      if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('429')) {
        if (!this.quotaExceeded) {
          this.quotaExceeded = true;
          this.lastQuotaErrorTime = Date.now();
          this.logger.warn(
            '⚠️  OpenAI quota exceeded. LLM analysis disabled. Falling back to regex-only mode. Will retry after 1 hour.',
          );
        }
        // Return original issue when quota exceeded
        return { isValidIssue: true, confidence: 1.0 };
      }
      // Only log non-quota errors to reduce spam
      if (!this.quotaExceeded) {
        this.logger.error(`Error validating security issue: ${error?.message || error}`);
      }
      return { isValidIssue: true, confidence: 0.5 }; // Default to keeping issue
    }
  }

  /**
   * Validate a single best practice issue with LLM
   */
  private async validateBestPracticeIssue(
    issue: BestPracticeIssue,
    fileContent: string,
  ): Promise<LLMAnalysisResult> {
    if (!this.openai) {
      return { isValidIssue: true, confidence: 1.0 };
    }

    try {
      const lines = fileContent.split('\n');
      const contextStart = Math.max(0, issue.line - 5);
      const contextEnd = Math.min(lines.length, issue.line + 5);
      const context = lines.slice(contextStart, contextEnd).join('\n');

      const prompt = `You are a code quality reviewer. Analyze this best practice issue:

File: ${issue.file}
Line: ${issue.line}
Issue: ${issue.message}

Code Context:
${context}

Detected Code Snippet:
${issue.codeSnippet || 'N/A'}

Determine if this is a REAL code quality issue or a FALSE POSITIVE. Consider:
1. Is this actually a problem that should be fixed?
2. Is the code in a test file, example, or intentionally written this way?
3. Is this a false positive from pattern matching?
4. Is this a legitimate best practice violation?

Respond in JSON format:
{
  "isValidIssue": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "improvedMessage": "more accurate message if needed",
  "improvedRecommendation": "better recommendation if needed"
}`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a code quality reviewer. Analyze code issues and respond only with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { isValidIssue: true, confidence: 0.5 };
      }

      const result = JSON.parse(content) as LLMAnalysisResult;
      return result;
    } catch (error: any) {
      // Handle quota/rate limit errors
      if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('429')) {
        if (!this.quotaExceeded) {
          this.quotaExceeded = true;
          this.lastQuotaErrorTime = Date.now();
          this.logger.warn(
            '⚠️  OpenAI quota exceeded. LLM analysis disabled. Falling back to regex-only mode. Will retry after 1 hour.',
          );
        }
        // Return original issue when quota exceeded
        return { isValidIssue: true, confidence: 1.0 };
      }
      // Only log non-quota errors to reduce spam
      if (!this.quotaExceeded) {
        this.logger.error(`Error validating best practice issue: ${error?.message || error}`);
      }
      return { isValidIssue: true, confidence: 0.5 }; // Default to keeping issue
    }
  }
}

