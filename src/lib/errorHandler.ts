/**
 * Error Handler for RAG System
 * 
 * Provides comprehensive error tracking, automatic recovery mechanisms,
 * circuit breaker patterns, graceful degradation, and retry mechanisms
 * with exponential backoff for robust RAG system operation.
 */

export interface ErrorHandlerConfig {
  enableTracking: boolean;
  enableReporting: boolean;
  enableRecovery: boolean;
  maxRetries: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export interface CapturedError {
  id: string;
  message: string;
  operation: string;
  timestamp: number;
  context: Record<string, any>;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByOperation: Record<string, number>;
  errorsByType: Record<string, number>;
  recentErrors: CapturedError[];
}

export interface RecoveryStrategy {
  (error: Error, context: Record<string, any>): Promise<RecoveryResult>;
}

export interface RecoveryResult {
  recovered: boolean;
  fallbackResult?: any;
  message?: string;
}

export interface RecoveryStatistics {
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  recoveryRate: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime?: number;
}

export interface LoadMetrics {
  currentLoad: number;
  maxCapacity: number;
  utilizationPercentage: number;
}

export interface DegradationStrategy {
  name: string;
  description: string;
  impact: string;
  activationThreshold: number;
}

export interface DegradationResult {
  activated: boolean;
  strategy: string;
  impact: string;
  timestamp: number;
}

export interface DegradationStatus {
  active: boolean;
  strategies: string[];
  activatedAt?: number;
}

export interface RetryConfiguration {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RetryStatistics {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  averageAttempts: number;
}

export class ErrorHandler {
  private config: Required<ErrorHandlerConfig>;
  private errors = new Map<string, CapturedError>();
  private recoveryStrategies = new Map<string, RecoveryStrategy>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private recoveryStats: RecoveryStatistics = {
    totalRecoveries: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    recoveryRate: 0
  };
  private retryStats: RetryStatistics = {
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageAttempts: 0
  };
  private degradationActive = false;
  private activeDegradationStrategies: string[] = [];

  constructor(config: ErrorHandlerConfig) {
    this.config = {
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      ...config
    };
  }

  /**
   * Check if error tracking is enabled
   */
  isTrackingEnabled(): boolean {
    return this.config.enableTracking;
  }

  /**
   * Capture an error with context
   */
  async captureError(error: Error, context: {
    operation: string;
    userId?: string;
    context?: Record<string, any>;
  }): Promise<string> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const capturedError: CapturedError = {
      id: errorId,
      message: error.message,
      operation: context.operation,
      timestamp: Date.now(),
      context: context.context || {},
      stack: error.stack,
      severity: this.determineSeverity(error, context.operation)
    };

    this.errors.set(errorId, capturedError);
    
    // Record failure for circuit breaker
    await this.recordFailure(context.operation);
    
    return errorId;
  }

  /**
   * Get error by ID
   */
  async getError(errorId: string): Promise<CapturedError | null> {
    return this.errors.get(errorId) || null;
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics(): Promise<ErrorStatistics> {
    const errors = Array.from(this.errors.values());
    
    const errorsByOperation: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};
    
    for (const error of errors) {
      errorsByOperation[error.operation] = (errorsByOperation[error.operation] || 0) + 1;
      errorsByType[error.severity] = (errorsByType[error.severity] || 0) + 1;
    }
    
    return {
      totalErrors: errors.length,
      errorsByOperation,
      errorsByType,
      recentErrors: errors.slice(-10) // Last 10 errors
    };
  }

  /**
   * Get errors by operation
   */
  async getErrorsByOperation(operation: string): Promise<CapturedError[]> {
    return Array.from(this.errors.values()).filter(error => error.operation === operation);
  }

  /**
   * Register recovery strategy
   */
  async registerRecoveryStrategy(errorType: string, strategy: RecoveryStrategy): Promise<void> {
    this.recoveryStrategies.set(errorType, strategy);
  }

  /**
   * Attempt recovery for an error
   */
  async attemptRecovery(errorType: string, context: {
    operation: string;
    error: Error;
    context: Record<string, any>;
  }): Promise<RecoveryResult> {
    this.recoveryStats.totalRecoveries++;
    
    const strategy = this.recoveryStrategies.get(errorType);
    if (!strategy) {
      this.recoveryStats.failedRecoveries++;
      this.updateRecoveryRate();
      return { recovered: false, message: 'No recovery strategy found' };
    }

    try {
      const result = await strategy(context.error, context.context);
      if (result.recovered) {
        this.recoveryStats.successfulRecoveries++;
      } else {
        this.recoveryStats.failedRecoveries++;
      }
      this.updateRecoveryRate();
      return result;
    } catch (error) {
      this.recoveryStats.failedRecoveries++;
      this.updateRecoveryRate();
      return { recovered: false, message: `Recovery failed: ${(error as Error).message}` };
    }
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStatistics(): Promise<RecoveryStatistics> {
    return { ...this.recoveryStats };
  }

  /**
   * Get circuit breaker configuration
   */
  async getCircuitBreakerConfig(): Promise<CircuitBreakerConfig> {
    return {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringWindow: 300000 // 5 minutes
    };
  }

  /**
   * Get circuit breaker state
   */
  async getCircuitBreakerState(operation: string): Promise<CircuitBreakerState> {
    if (!this.circuitBreakers.has(operation)) {
      this.circuitBreakers.set(operation, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0
      });
    }
    
    return { ...this.circuitBreakers.get(operation)! };
  }

  /**
   * Record failure for circuit breaker
   */
  async recordFailure(operation: string): Promise<void> {
    const state = await this.getCircuitBreakerState(operation);
    const config = await this.getCircuitBreakerConfig();
    
    state.failureCount++;
    state.lastFailureTime = Date.now();
    
    if (state.failureCount >= config.failureThreshold) {
      state.state = 'open';
      state.nextRetryTime = Date.now() + config.recoveryTimeout;
    }
    
    this.circuitBreakers.set(operation, state);
  }

  /**
   * Check if circuit is open
   */
  async isCircuitOpen(operation: string): Promise<boolean> {
    const state = await this.getCircuitBreakerState(operation);
    const config = await this.getCircuitBreakerConfig();
    
    if (state.state === 'open') {
      if (state.nextRetryTime && Date.now() > state.nextRetryTime) {
        // Transition to half-open
        state.state = 'half-open';
        this.circuitBreakers.set(operation, state);
        return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * Get load metrics
   */
  async getLoadMetrics(): Promise<LoadMetrics> {
    // Simulate load metrics
    const currentLoad = Math.floor(Math.random() * 100);
    const maxCapacity = 100;
    
    return {
      currentLoad,
      maxCapacity,
      utilizationPercentage: currentLoad / maxCapacity
    };
  }

  /**
   * Get degradation strategies
   */
  async getDegradationStrategies(): Promise<DegradationStrategy[]> {
    return [
      {
        name: 'reduce_search_quality',
        description: 'Reduce search quality to improve performance',
        impact: 'Lower precision, faster response',
        activationThreshold: 0.8
      },
      {
        name: 'limit_concurrent_requests',
        description: 'Limit number of concurrent requests',
        impact: 'Queue requests, maintain quality',
        activationThreshold: 0.9
      },
      {
        name: 'disable_advanced_features',
        description: 'Disable non-essential features',
        impact: 'Basic functionality only',
        activationThreshold: 0.95
      }
    ];
  }

  /**
   * Activate degradation strategy
   */
  async activateDegradation(strategy: string, context: {
    reason: string;
    severity: string;
  }): Promise<DegradationResult> {
    this.degradationActive = true;
    this.activeDegradationStrategies.push(strategy);
    
    return {
      activated: true,
      strategy,
      impact: 'Performance optimized for current load',
      timestamp: Date.now()
    };
  }

  /**
   * Get degradation status
   */
  async getDegradationStatus(): Promise<DegradationStatus> {
    return {
      active: this.degradationActive,
      strategies: [...this.activeDegradationStrategies],
      activatedAt: this.degradationActive ? Date.now() : undefined
    };
  }

  /**
   * Get retry configuration
   */
  async getRetryConfiguration(): Promise<RetryConfiguration> {
    return {
      maxRetries: this.config.maxRetries,
      baseDelay: this.config.baseDelay,
      maxDelay: this.config.maxDelay,
      backoffMultiplier: this.config.backoffMultiplier
    };
  }

  /**
   * Execute operation with retry
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { operation: string; context: Record<string, any> }
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.retryStats.totalRetries++;
        const result = await operation();
        this.retryStats.successfulRetries++;
        this.updateRetryStats();
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.maxRetries) {
          this.retryStats.failedRetries++;
          this.updateRetryStats();
          throw lastError;
        }
        
        // Wait before retry
        const delay = await this.calculateBackoffDelay(attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Get retry statistics
   */
  async getRetryStatistics(): Promise<RetryStatistics> {
    return { ...this.retryStats };
  }

  /**
   * Calculate exponential backoff delay
   */
  async calculateBackoffDelay(attempt: number): Promise<number> {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Destroy error handler and clean up
   */
  async destroy(): Promise<void> {
    this.errors.clear();
    this.recoveryStrategies.clear();
    this.circuitBreakers.clear();
    this.degradationActive = false;
    this.activeDegradationStrategies = [];
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error, operation: string): 'low' | 'medium' | 'high' | 'critical' {
    if (operation.includes('search') && error.message.includes('timeout')) {
      return 'medium';
    }
    if (operation.includes('database') || operation.includes('storage')) {
      return 'high';
    }
    if (error.message.includes('critical') || error.message.includes('fatal')) {
      return 'critical';
    }
    return 'low';
  }

  /**
   * Update recovery rate
   */
  private updateRecoveryRate(): void {
    if (this.recoveryStats.totalRecoveries > 0) {
      this.recoveryStats.recoveryRate = this.recoveryStats.successfulRecoveries / this.recoveryStats.totalRecoveries;
    }
  }

  /**
   * Update retry statistics
   */
  private updateRetryStats(): void {
    if (this.retryStats.totalRetries > 0) {
      this.retryStats.averageAttempts = this.retryStats.totalRetries / 
        (this.retryStats.successfulRetries + this.retryStats.failedRetries);
    }
  }
}
