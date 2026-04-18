/**
 * Google Cloud Monitoring and Logging integration.
 * Provides structured logging, error tracking, and performance monitoring
 * for production deployments on GCP.
 */

import { Logging } from "@google-cloud/logging";
import { ErrorReporting } from "@google-cloud/error-reporting";

/**
 * Log severity levels following Google Cloud standards
 */
export enum LogSeverity {
  DEBUG = "DEBUG",
  INFO = "INFO",
  NOTICE = "NOTICE",
  WARNING = "WARNING",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
  ALERT = "ALERT",
  EMERGENCY = "EMERGENCY",
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  message: string;
  severity: LogSeverity;
  context?: Record<string, unknown>;
  userId?: string;
  venueId?: string;
  eventId?: string;
  requestId?: string;
  timestamp?: Date;
}

/**
 * Cloud Logger singleton for structured logging
 */
class CloudLogger {
  private logging: Logging | null = null;
  private errorReporting: ErrorReporting | null = null;
  private logName = "arenalink-app";
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";
    
    if (this.isProduction && process.env.GOOGLE_CLOUD_PROJECT) {
      try {
        this.logging = new Logging({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
        });
        
        this.errorReporting = new ErrorReporting({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
          reportMode: "production",
          serviceContext: {
            service: "arenalink-app",
            version: process.env.APP_VERSION || "1.0.0",
          },
        });
      } catch (error) {
        console.error("[CloudLogger] Failed to initialize GCP services:", error);
      }
    }
  }

  /**
   * Write a structured log entry to Cloud Logging
   */
  async log(entry: LogEntry): Promise<void> {
    const timestamp = entry.timestamp || new Date();
    
    // Always log to console for local development
    if (!this.isProduction) {
      console.log(`[${entry.severity}] ${entry.message}`, entry.context || "");
      return;
    }

    // Log to Cloud Logging in production
    if (this.logging) {
      try {
        const log = this.logging.log(this.logName);
        const metadata = {
          resource: { type: "cloud_run_revision" },
          severity: entry.severity,
          timestamp,
          labels: {
            venue_id: entry.venueId || "",
            event_id: entry.eventId || "",
            user_id: entry.userId || "",
          },
        };

        const logEntry = log.entry(metadata, {
          message: entry.message,
          context: entry.context,
          requestId: entry.requestId,
        });

        await log.write(logEntry);
      } catch (error) {
        console.error("[CloudLogger] Failed to write log:", error);
      }
    } else {
      // Fallback to console if Cloud Logging not available
      console.log(`[${entry.severity}] ${entry.message}`, entry.context || "");
    }
  }

  /**
   * Log informational messages
   */
  async info(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log({ message, severity: LogSeverity.INFO, context });
  }

  /**
   * Log warning messages
   */
  async warn(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log({ message, severity: LogSeverity.WARNING, context });
  }

  /**
   * Log error messages and report to Error Reporting
   */
  async error(message: string, error?: Error, context?: Record<string, unknown>): Promise<void> {
    await this.log({ 
      message, 
      severity: LogSeverity.ERROR, 
      context: { ...context, error: error?.message, stack: error?.stack } 
    });

    // Report to Error Reporting service
    if (this.errorReporting && error) {
      try {
        this.errorReporting.report(error);
      } catch (reportError) {
        console.error("[CloudLogger] Failed to report error:", reportError);
      }
    }
  }

  /**
   * Log critical errors that require immediate attention
   */
  async critical(message: string, error?: Error, context?: Record<string, unknown>): Promise<void> {
    await this.log({ 
      message, 
      severity: LogSeverity.CRITICAL, 
      context: { ...context, error: error?.message, stack: error?.stack } 
    });

    if (this.errorReporting && error) {
      try {
        this.errorReporting.report(error);
      } catch (reportError) {
        console.error("[CloudLogger] Failed to report critical error:", reportError);
      }
    }
  }

  /**
   * Log performance metrics
   */
  async metric(metricName: string, value: number, labels?: Record<string, string>): Promise<void> {
    await this.log({
      message: `Metric: ${metricName}`,
      severity: LogSeverity.INFO,
      context: {
        metric: metricName,
        value,
        labels,
      },
    });
  }
}

// Export singleton instance
export const logger = new CloudLogger();

/**
 * Middleware helper to add request context to logs
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return {
    info: (message: string, context?: Record<string, unknown>) =>
      logger.info(message, { ...context, requestId, userId }),
    warn: (message: string, context?: Record<string, unknown>) =>
      logger.warn(message, { ...context, requestId, userId }),
    error: (message: string, error?: Error, context?: Record<string, unknown>) =>
      logger.error(message, error, { ...context, requestId, userId }),
  };
}
