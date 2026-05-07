// Monitoring and Alerting Utility
// Provides health checks, metrics collection, and alerting capabilities

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
}

export interface Metrics {
  timestamp: string;
  requests: {
    total: number;
    success: number;
    error: number;
  };
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: {
    count: number;
    byType: Record<string, number>;
  };
}

export interface Alert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Metrics = {
    timestamp: new Date().toISOString(),
    requests: { total: 0, success: 0, error: 0 },
    responseTime: { avg: 0, p50: 0, p95: 0, p99: 0 },
    errors: { count: 0, byType: {} }
  };
  private responseTimes: number[] = [];

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Record a request
   */
  recordRequest(success: boolean, responseTime: number): void {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }

    this.updateResponseTimeMetrics();
  }

  /**
   * Record an error
   */
  recordError(errorType: string): void {
    this.metrics.errors.count++;
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
  }

  /**
   * Update response time metrics
   */
  private updateResponseTimeMetrics(): void {
    if (this.responseTimes.length === 0) return;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    this.metrics.responseTime.avg = sum / sorted.length;
    this.metrics.responseTime.p50 = sorted[Math.floor(sorted.length * 0.5)];
    this.metrics.responseTime.p95 = sorted[Math.floor(sorted.length * 0.95)];
    this.metrics.responseTime.p99 = sorted[Math.floor(sorted.length * 0.99)];
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metrics {
    this.metrics.timestamp = new Date().toISOString();
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      timestamp: new Date().toISOString(),
      requests: { total: 0, success: 0, error: 0 },
      responseTime: { avg: 0, p50: 0, p95: 0, p99: 0 },
      errors: { count: 0, byType: {} }
    };
    this.responseTimes = [];
  }

  /**
   * Perform health checks
   */
  async performHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Database health check
    checks.push(await this.checkDatabase());

    // Cache health check
    checks.push(await this.checkCache());

    // External service health checks
    checks.push(await this.checkExternalServices());

    return checks;
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      // Placeholder - actual implementation would query database
      // const db = await getDb();
      // await db.prepare('SELECT 1').first();
      
      const responseTime = Date.now() - start;
      return {
        name: 'database',
        status: 'healthy',
        responseTime
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCache(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      // Placeholder - actual implementation would check KV cache
      // await kv.put('health-check', 'ok', { expirationTtl: 60 });
      
      const responseTime = Date.now() - start;
      return {
        name: 'cache',
        status: 'healthy',
        responseTime
      };
    } catch (error) {
      return {
        name: 'cache',
        status: 'degraded',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start
      };
    }
  }

  /**
   * Check external services
   */
  private async checkExternalServices(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      // Placeholder - actual implementation would check external services
      // await fetch('https://api.example.com/health');
      
      const responseTime = Date.now() - start;
      return {
        name: 'external-services',
        status: 'healthy',
        responseTime
      };
    } catch (error) {
      return {
        name: 'external-services',
        status: 'degraded',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start
      };
    }
  }

  /**
   * Send alert
   */
  async sendAlert(alert: Alert): Promise<void> {
    console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
    
    // Placeholder - actual implementation would send to alerting service
    // Options: PagerDuty, Slack, Email, SMS, etc.
    // await fetch(process.env.ALERT_WEBHOOK_URL, {
    //   method: 'POST',
    //   body: JSON.stringify(alert)
    // });
  }

  /**
   * Check if alert should be triggered based on metrics
   */
  checkAlertThresholds(): Alert[] {
    const alerts: Alert[] = [];
    const metrics = this.getMetrics();

    // High error rate alert (> 5%)
    if (metrics.requests.total > 0) {
      const errorRate = metrics.requests.error / metrics.requests.total;
      if (errorRate > 0.05) {
        alerts.push({
          severity: errorRate > 0.1 ? 'critical' : 'warning',
          message: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
          timestamp: new Date().toISOString(),
          source: 'monitoring',
          metadata: { errorRate }
        });
      }
    }

    // Slow response time alert (> 2s average)
    if (metrics.responseTime.avg > 2000) {
      alerts.push({
        severity: metrics.responseTime.avg > 5000 ? 'critical' : 'warning',
        message: `Slow response time: ${metrics.responseTime.avg.toFixed(0)}ms average`,
        timestamp: new Date().toISOString(),
        source: 'monitoring',
        metadata: { avgResponseTime: metrics.responseTime.avg }
      });
    }

    return alerts;
  }
}

export const monitoring = MonitoringService.getInstance();

// Convenience functions
export const recordRequest = (success: boolean, responseTime: number) => monitoring.recordRequest(success, responseTime);
export const recordError = (errorType: string) => monitoring.recordError(errorType);
export const getMetrics = () => monitoring.getMetrics();
export const performHealthChecks = () => monitoring.performHealthChecks();
export const sendAlert = (alert: Alert) => monitoring.sendAlert(alert);
export const checkAlertThresholds = () => monitoring.checkAlertThresholds();
