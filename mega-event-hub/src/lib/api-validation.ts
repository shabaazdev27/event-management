import { NextResponse } from "next/server";
import { createErrorResponse } from "@/lib/security";

/** Max JSON body size for API routes (bytes). */
export const MAX_JSON_BODY_BYTES = 48_000;

/** Max user message length sent to the chat API. */
export const MAX_CHAT_MESSAGE_LENGTH = 2_000;

const GATE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export class ApiValidationError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiValidationError";
  }
}

/**
 * Validates gate / sensor identifiers to reduce injection and oversized keys in Firestore paths.
 */
export function validateGateId(id: unknown): string {
  if (typeof id !== "string" || !GATE_ID_PATTERN.test(id.trim())) {
    throw new ApiValidationError(
      "Invalid gateId: use 1–64 characters (letters, numbers, ., _, -).",
      400
    );
  }
  return id.trim();
}

export function validateLocation(
  loc: unknown
): "GENERAL" | "FANZONE" {
  if (loc === "GENERAL" || loc === "FANZONE") return loc;
  throw new ApiValidationError(
    'location must be "GENERAL" or "FANZONE".',
    400
  );
}

export function validateMaxFlow(value: unknown): number {
  const n =
    typeof value === "number" ? value : Number(typeof value === "string" ? value : NaN);
  if (!Number.isFinite(n) || n < 1 || n > 1_000_000) {
    throw new ApiValidationError(
      "max_flow must be a number between 1 and 1000000.",
      400
    );
  }
  return Math.floor(n);
}

export function parseLatLon(
  latRaw: string | null,
  lonRaw: string | null
): { lat: number; lon: number } {
  if (latRaw == null || lonRaw == null || latRaw === "" || lonRaw === "") {
    throw new ApiValidationError(
      "Query parameters lat and lon are required.",
      400
    );
  }
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new ApiValidationError("lat and lon must be valid numbers.", 400);
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new ApiValidationError(
      "lat must be between -90 and 90, lon between -180 and 180.",
      400
    );
  }
  return { lat, lon };
}

export function clampChatMessage(message: unknown): string {
  if (typeof message !== "string") {
    throw new ApiValidationError("Message is required.", 400);
  }
  const trimmed = message.trim();
  if (!trimmed) {
    throw new ApiValidationError("Message is required.", 400);
  }
  if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
    return trimmed.slice(0, MAX_CHAT_MESSAGE_LENGTH);
  }
  return trimmed;
}

/**
 * Reads the request body as JSON with a size cap (uses Content-Length when present, then text length).
 */
export async function readJsonBodyLimited(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES
): Promise<unknown> {
  const cl = request.headers.get("content-length");
  if (cl) {
    const n = Number(cl);
    if (Number.isFinite(n) && n > maxBytes) {
      throw new ApiValidationError("Payload too large.", 413);
    }
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new ApiValidationError("Payload too large.", 413);
  }
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiValidationError("Invalid JSON body.", 400);
  }
}

/** Cron / scheduler: require CRON_SECRET in production; optional in development. */
export function assertCronAuthorized(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return createErrorResponse("Server configuration error.", 500);
    }
    return null;
  }
  const auth = request.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const header = request.headers.get("x-cron-secret")?.trim();
  const token = bearer || header;
  if (!token || token !== secret) {
    return createErrorResponse("Unauthorized.", 401);
  }
  return null;
}

/**
 * Shared secret for sensor and gate management POST endpoints.
 * In production, SENSORS_API_KEY is required and requests must send
 * Authorization: Bearer <key> or x-api-key.
 */
export function assertSensorsAuthorized(request: Request): NextResponse | null {
  const key = process.env.SENSORS_API_KEY?.trim();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      return createErrorResponse("Server configuration error.", 500);
    }
    return null;
  }

  const auth = request.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const apiKey = request.headers.get("x-api-key")?.trim();
  const token = bearer || apiKey;
  if (!token || token !== key) {
    return createErrorResponse("Unauthorized.", 401);
  }
  return null;
}

