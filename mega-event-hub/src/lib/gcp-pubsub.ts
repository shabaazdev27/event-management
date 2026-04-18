/**
 * Google Cloud Pub/Sub integration for real-time event streaming.
 * Enables asynchronous processing of crowd data, sensor events,
 * and analytics pipelines.
 */

import { PubSub, Topic, Subscription } from "@google-cloud/pubsub";
import { logger } from "./gcp-monitoring";

/**
 * Standard topic names for ArenaLink events
 */
export enum PubSubTopic {
  SENSOR_EVENTS = "sensor-events",
  CROWD_UPDATES = "crowd-updates",
  GATE_ACTIVITY = "gate-activity",
  WEATHER_ALERTS = "weather-alerts",
  ANALYTICS_EVENTS = "analytics-events",
}

/**
 * Event payload interface
 */
export interface EventMessage {
  eventType: string;
  venueId: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, string>;
}

/**
 * Pub/Sub manager for real-time event streaming
 */
class PubSubManager {
  private pubsub: PubSub | null = null;
  private topics: Map<string, Topic> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";

    if (this.isProduction && process.env.GOOGLE_CLOUD_PROJECT) {
      try {
        this.pubsub = new PubSub({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
        });
        
        logger.info("Pub/Sub client initialized successfully");
      } catch (error) {
        logger.error("Failed to initialize Pub/Sub", error as Error);
      }
    }
  }

  /**
   * Publish a message to a topic
   */
  async publish(
    topicName: PubSubTopic,
    message: EventMessage
  ): Promise<boolean> {
    if (!this.isProduction || !this.pubsub) {
      logger.info(`[DEV] Would publish to ${topicName}:`, { message });
      return true;
    }

    try {
      const topic = await this.getTopic(topicName);
      const messageBuffer = Buffer.from(JSON.stringify(message));
      
      const messageId = await topic.publishMessage({
        data: messageBuffer,
        attributes: {
          eventType: message.eventType,
          venueId: message.venueId,
          timestamp: message.timestamp,
          ...message.metadata,
        },
      });

      logger.info(`Message published to ${topicName}`, {
        messageId,
        eventType: message.eventType,
      });

      return true;
    } catch (error) {
      logger.error(`Failed to publish to ${topicName}`, error as Error, {
        eventType: message.eventType,
      });
      return false;
    }
  }

  /**
   * Publish sensor entry/exit events
   */
  async publishSensorEvent(
    venueId: string,
    gateId: string,
    type: "entry" | "exit",
    count: number
  ): Promise<boolean> {
    const message: EventMessage = {
      eventType: `sensor.${type}`,
      venueId,
      timestamp: new Date().toISOString(),
      data: {
        gateId,
        type,
        count,
      },
    };

    return this.publish(PubSubTopic.SENSOR_EVENTS, message);
  }

  /**
   * Publish crowd density updates
   */
  async publishCrowdUpdate(
    venueId: string,
    zoneId: string,
    density: number,
    capacity: number
  ): Promise<boolean> {
    const message: EventMessage = {
      eventType: "crowd.density_update",
      venueId,
      timestamp: new Date().toISOString(),
      data: {
        zoneId,
        density,
        capacity,
        utilizationPercent: (density / capacity) * 100,
      },
    };

    return this.publish(PubSubTopic.CROWD_UPDATES, message);
  }

  /**
   * Publish analytics events for BigQuery ingestion
   */
  async publishAnalyticsEvent(
    venueId: string,
    eventName: string,
    properties: Record<string, unknown>
  ): Promise<boolean> {
    const message: EventMessage = {
      eventType: `analytics.${eventName}`,
      venueId,
      timestamp: new Date().toISOString(),
      data: properties,
    };

    return this.publish(PubSubTopic.ANALYTICS_EVENTS, message);
  }

  /**
   * Subscribe to a topic with a message handler
   */
  async subscribe(
    topicName: PubSubTopic,
    subscriptionName: string,
    handler: (message: EventMessage) => Promise<void>
  ): Promise<void> {
    if (!this.pubsub) {
      logger.warn("Pub/Sub not available for subscriptions");
      return;
    }

    try {
      const subscription = this.pubsub.subscription(subscriptionName);
      
      subscription.on("message", async (message) => {
        try {
          const eventMessage: EventMessage = JSON.parse(
            message.data.toString()
          );
          
          await handler(eventMessage);
          message.ack();
          
          logger.info(`Message processed from ${subscriptionName}`, {
            eventType: eventMessage.eventType,
          });
        } catch (error) {
          logger.error("Failed to process message", error as Error, {
            subscriptionName,
          });
          message.nack();
        }
      });

      subscription.on("error", (error) => {
        logger.error("Subscription error", error, { subscriptionName });
      });

      this.subscriptions.set(subscriptionName, subscription);
      logger.info(`Subscribed to ${subscriptionName}`);
    } catch (error) {
      logger.error("Failed to create subscription", error as Error, {
        topicName,
        subscriptionName,
      });
    }
  }

  /**
   * Get or create a topic
   */
  private async getTopic(topicName: string): Promise<Topic> {
    if (this.topics.has(topicName)) {
      return this.topics.get(topicName)!;
    }

    if (!this.pubsub) {
      throw new Error("Pub/Sub client not initialized");
    }

    const topic = this.pubsub.topic(topicName);
    const [exists] = await topic.exists();

    if (!exists) {
      await topic.create();
      logger.info(`Topic created: ${topicName}`);
    }

    this.topics.set(topicName, topic);
    return topic;
  }

  /**
   * Close all subscriptions gracefully
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.subscriptions.values()).map(
      (subscription) => subscription.close()
    );

    await Promise.all(closePromises);
    this.subscriptions.clear();
    logger.info("All subscriptions closed");
  }
}

// Export singleton instance
export const pubSubManager = new PubSubManager();
