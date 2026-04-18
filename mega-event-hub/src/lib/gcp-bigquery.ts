/**
 * Google BigQuery integration for analytics and data warehousing.
 * Streams event data for long-term analysis and reporting.
 */

import { BigQuery, Dataset, Table } from "@google-cloud/bigquery";
import { createHash } from "crypto";
import { logger } from "./gcp-monitoring";

/**
 * Standard BigQuery table schemas
 */
export enum AnalyticsTable {
  VENUE_EVENTS = "venue_events",
  USER_INTERACTIONS = "user_interactions",
  CROWD_METRICS = "crowd_metrics",
  GATE_ACTIVITY = "gate_activity",
  WEATHER_DATA = "weather_data",
}

/**
 * Analytics event row
 */
export interface AnalyticsEvent {
  event_id: string;
  venue_id: string;
  event_type: string;
  timestamp: string;
  user_id?: string;
  session_id?: string;
  properties: Record<string, unknown>;
}

/**
 * BigQuery manager for analytics streaming
 */
class BigQueryManager {
  private bigquery: BigQuery | null = null;
  private datasetId = "arenalink_analytics";
  private isProduction: boolean;
  private tables: Map<string, Table> = new Map();

  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";

    if (this.isProduction && process.env.GOOGLE_CLOUD_PROJECT) {
      try {
        this.bigquery = new BigQuery({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
        });
        
        this.initializeDataset().catch((error) => {
          logger.error("Failed to initialize BigQuery dataset", error as Error);
        });
      } catch (error) {
        logger.error("Failed to initialize BigQuery", error as Error);
      }
    }
  }

  /**
   * Initialize dataset and tables if they don't exist
   */
  private async initializeDataset(): Promise<void> {
    if (!this.bigquery) return;

    try {
      const dataset: Dataset = this.bigquery.dataset(this.datasetId);
      const [exists] = await dataset.exists();

      if (!exists) {
        await dataset.create({
          location: "US",
          metadata: {
            description: "ArenaLink analytics and event data",
          },
        });
        logger.info(`BigQuery dataset created: ${this.datasetId}`);
      }

      // Create tables with schemas
      await this.ensureTable(AnalyticsTable.VENUE_EVENTS, [
        { name: "event_id", type: "STRING", mode: "REQUIRED" },
        { name: "venue_id", type: "STRING", mode: "REQUIRED" },
        { name: "event_type", type: "STRING", mode: "REQUIRED" },
        { name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "user_id", type: "STRING", mode: "NULLABLE" },
        { name: "session_id", type: "STRING", mode: "NULLABLE" },
        { name: "properties", type: "JSON", mode: "NULLABLE" },
      ]);

      await this.ensureTable(AnalyticsTable.CROWD_METRICS, [
        { name: "venue_id", type: "STRING", mode: "REQUIRED" },
        { name: "zone_id", type: "STRING", mode: "REQUIRED" },
        { name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "crowd_count", type: "INTEGER", mode: "REQUIRED" },
        { name: "capacity", type: "INTEGER", mode: "REQUIRED" },
        { name: "density_percent", type: "FLOAT", mode: "REQUIRED" },
      ]);

      await this.ensureTable(AnalyticsTable.GATE_ACTIVITY, [
        { name: "venue_id", type: "STRING", mode: "REQUIRED" },
        { name: "gate_id", type: "STRING", mode: "REQUIRED" },
        { name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "activity_type", type: "STRING", mode: "REQUIRED" },
        { name: "count", type: "INTEGER", mode: "REQUIRED" },
        { name: "wait_time_seconds", type: "INTEGER", mode: "NULLABLE" },
      ]);
    } catch (error) {
      logger.error("Failed to initialize BigQuery dataset", error as Error);
    }
  }

  /**
   * Ensure a table exists with the given schema
   */
  private async ensureTable(
    tableName: string,
    schema: Array<{ name: string; type: string; mode: string }>
  ): Promise<void> {
    if (!this.bigquery) return;

    try {
      const dataset = this.bigquery.dataset(this.datasetId);
      const table = dataset.table(tableName);
      const [exists] = await table.exists();

      if (!exists) {
        await table.create({
          schema: { fields: schema },
          timePartitioning: {
            type: "DAY",
            field: "timestamp",
          },
        });
        logger.info(`BigQuery table created: ${tableName}`);
      }

      this.tables.set(tableName, table);
    } catch (error) {
      logger.error(`Failed to create table ${tableName}`, error as Error);
    }
  }

  /**
   * Stream analytics events to BigQuery
   */
  async insertEvent(
    tableName: AnalyticsTable,
    event: AnalyticsEvent
  ): Promise<boolean> {
    if (!this.isProduction || !this.bigquery) {
      logger.info(`[DEV] Would insert to ${tableName}:`, { event });
      return true;
    }

    try {
      const table = this.tables.get(tableName);
      if (!table) {
        throw new Error(`Table ${tableName} not initialized`);
      }

      await table.insert([event]);
      
      logger.info(`Event inserted to ${tableName}`, {
        eventId: event.event_id,
        eventType: event.event_type,
      });

      return true;
    } catch (error) {
      logger.error(`Failed to insert event to ${tableName}`, error as Error, {
        eventId: event.event_id,
      });
      return false;
    }
  }

  /**
   * Insert multiple events in batch
   */
  async insertEvents(
    tableName: AnalyticsTable,
    events: AnalyticsEvent[]
  ): Promise<boolean> {
    if (!this.isProduction || !this.bigquery) {
      logger.info(`[DEV] Would insert ${events.length} events to ${tableName}`);
      return true;
    }

    if (events.length === 0) return true;

    try {
      const table = this.tables.get(tableName);
      if (!table) {
        throw new Error(`Table ${tableName} not initialized`);
      }

      await table.insert(events);
      
      logger.info(`${events.length} events inserted to ${tableName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to insert batch to ${tableName}`, error as Error, {
        eventCount: events.length,
      });
      return false;
    }
  }

  /**
   * Execute a query and return results
   */
  async query<T = unknown>(
    sql: string,
    params?: Record<string, unknown>
  ): Promise<T[]> {
    const isReadOnly = /^\s*select\b/i.test(sql);
    if (!isReadOnly) {
      logger.warn("Rejected non-read-only BigQuery query");
      return [];
    }

    if (!this.bigquery) {
      logger.warn("BigQuery not available for queries");
      return [];
    }

    try {
      const [rows] = await this.bigquery.query({ query: sql, params });
      return rows as T[];
    } catch (error) {
      const queryFingerprint = createHash("sha256")
        .update(sql)
        .digest("hex")
        .slice(0, 16);
      logger.error("BigQuery query failed", error as Error, {
        queryFingerprint,
      });
      return [];
    }
  }

  /**
   * Get crowd metrics for a venue in a time range
   */
  async getCrowdMetrics(
    venueId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Array<{ zone_id: string; avg_density: number }>> {
    const sql = `
      SELECT 
        zone_id,
        AVG(density_percent) as avg_density
      FROM \`${this.datasetId}.${AnalyticsTable.CROWD_METRICS}\`
      WHERE venue_id = @venueId
        AND timestamp BETWEEN @startTime AND @endTime
      GROUP BY zone_id
      ORDER BY avg_density DESC
    `;

    try {
      const [rows] = await this.bigquery!.query({
        query: sql,
        params: {
          venueId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      return rows as Array<{ zone_id: string; avg_density: number }>;
    } catch (error) {
      logger.error("Failed to fetch crowd metrics", error as Error, { venueId });
      return [];
    }
  }
}

// Export singleton instance
export const bigQueryManager = new BigQueryManager();
