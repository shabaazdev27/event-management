/**
 * Google Cloud Storage integration for managing event assets,
 * venue images, and user-generated content.
 */

import { Storage, Bucket, File } from "@google-cloud/storage";
import { logger } from "./gcp-monitoring";

/**
 * Supported file upload types
 */
export enum AssetType {
  VENUE_IMAGE = "venue-images",
  EVENT_BANNER = "event-banners",
  USER_CONTENT = "user-content",
  ANALYTICS_DATA = "analytics-data",
}

/**
 * Upload result metadata
 */
export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  gsUrl?: string;
  fileName?: string;
  error?: string;
}

/**
 * Cloud Storage manager for ArenaLink assets
 */
class CloudStorageManager {
  private storage: Storage | null = null;
  private bucket: Bucket | null = null;
  private bucketName: string;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";
    this.bucketName = process.env.GCP_STORAGE_BUCKET || "arenalink-assets";

    if (this.isProduction && process.env.GOOGLE_CLOUD_PROJECT) {
      try {
        this.storage = new Storage({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
        });
        this.bucket = this.storage.bucket(this.bucketName);
      } catch (error) {
        logger.error("Failed to initialize Cloud Storage", error as Error);
      }
    }
  }

  /**
   * Upload a file to Cloud Storage
   * @param file - File buffer or readable stream
   * @param assetType - Category of asset
   * @param fileName - Desired file name (will be sanitized)
   * @param metadata - Optional metadata tags
   */
  async uploadFile(
    file: Buffer,
    assetType: AssetType,
    fileName: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    if (!this.isProduction || !this.bucket) {
      logger.warn("Cloud Storage not available in development mode");
      return {
        success: false,
        error: "Storage not configured for development environment",
      };
    }

    try {
      const sanitizedName = this.sanitizeFileName(fileName);
      const destination = `${assetType}/${Date.now()}-${sanitizedName}`;
      const fileRef: File = this.bucket.file(destination);

      await fileRef.save(file, {
        metadata: {
          contentType: this.guessContentType(fileName),
          metadata: {
            ...metadata,
            uploadedAt: new Date().toISOString(),
            assetType,
          },
        },
        public: assetType !== AssetType.USER_CONTENT, // User content requires signed URLs
      });

      const publicUrl = assetType !== AssetType.USER_CONTENT
        ? `https://storage.googleapis.com/${this.bucketName}/${destination}`
        : undefined;

      logger.info("File uploaded successfully", {
        destination,
        assetType,
        size: file.length,
      });

      return {
        success: true,
        publicUrl,
        gsUrl: `gs://${this.bucketName}/${destination}`,
        fileName: destination,
      };
    } catch (error) {
      logger.error("Failed to upload file", error as Error, {
        fileName,
        assetType,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Generate a signed URL for temporary access to private files
   */
  async getSignedUrl(
    fileName: string,
    expiresInMinutes: number = 60
  ): Promise<string | null> {
    if (!this.bucket) return null;

    try {
      const file = this.bucket.file(fileName);
      const [url] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      });

      return url;
    } catch (error) {
      logger.error("Failed to generate signed URL", error as Error, { fileName });
      return null;
    }
  }

  /**
   * Delete a file from Cloud Storage
   */
  async deleteFile(fileName: string): Promise<boolean> {
    if (!this.bucket) return false;

    try {
      const file = this.bucket.file(fileName);
      await file.delete();
      logger.info("File deleted successfully", { fileName });
      return true;
    } catch (error) {
      logger.error("Failed to delete file", error as Error, { fileName });
      return false;
    }
  }

  /**
   * List files in a specific asset category
   */
  async listFiles(assetType: AssetType, maxResults: number = 100): Promise<string[]> {
    if (!this.bucket) return [];

    try {
      const [files] = await this.bucket.getFiles({
        prefix: `${assetType}/`,
        maxResults,
      });

      return files.map(file => file.name);
    } catch (error) {
      logger.error("Failed to list files", error as Error, { assetType });
      return [];
    }
  }

  /**
   * Sanitize file name for safe storage
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_")
      .toLowerCase();
  }

  /**
   * Guess content type from file extension
   */
  private guessContentType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      json: "application/json",
      csv: "text/csv",
    };

    return contentTypes[ext || ""] || "application/octet-stream";
  }
}

// Export singleton instance
export const cloudStorage = new CloudStorageManager();
