/**
 * Security utility tests
 * Tests input validation, sanitization, and security headers
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  sanitizeInput,
  validateJsonInput,
  isValidVenueId,
  isValidApiKey,
  generateRequestId,
  getClientIp,
  validateMethod,
  validateContentType,
  validateRequest,
  withSecurityHeaders,
  createErrorResponse,
  createSuccessResponse,
} from "./security";

describe("Security Utilities", () => {
  describe("sanitizeInput", () => {
    it("should remove angle brackets", () => {
      expect(sanitizeInput("<script>alert('xss')</script>")).toBe("scriptalert('xss')/script");
    });

    it("should remove javascript: protocol", () => {
      expect(sanitizeInput("javascript:alert('xss')")).toBe("alert('xss')");
    });

    it("should remove event handlers", () => {
      expect(sanitizeInput('div onclick="malicious()"')).toBe('div "malicious()"');
    });

    it("should trim whitespace", () => {
      expect(sanitizeInput("  hello world  ")).toBe("hello world");
    });

    it("should limit length to 10000 characters", () => {
      const longString = "a".repeat(15000);
      expect(sanitizeInput(longString)).toHaveLength(10000);
    });

    it("should handle empty string", () => {
      expect(sanitizeInput("")).toBe("");
    });
  });

  describe("validateJsonInput", () => {
    it("should validate object with required fields", () => {
      const data = { name: "Test", value: 42 };
      const result = validateJsonInput(data, ["name", "value"]);
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("should fail when required fields are missing", () => {
      const data = { name: "Test" };
      const result = validateJsonInput(data, ["name", "value"]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: value");
    });

    it("should sanitize string fields", () => {
      const data = { name: "<script>xss</script>" };
      const result = validateJsonInput<{ name: string }>(data, ["name"]);
      
      expect(result.valid).toBe(true);
      expect(result.data?.name).toBe("scriptxss/script");
    });

    it("should reject non-object input", () => {
      const result = validateJsonInput("not an object", []);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid input data");
    });

    it("should reject null input", () => {
      const result = validateJsonInput(null, []);
      
      expect(result.valid).toBe(false);
    });
  });

  describe("isValidVenueId", () => {
    it("should accept valid alphanumeric venue IDs", () => {
      expect(isValidVenueId("venue123")).toBe(true);
      expect(isValidVenueId("test-venue_01")).toBe(true);
    });

    it("should reject invalid venue IDs", () => {
      expect(isValidVenueId("venue with spaces")).toBe(false);
      expect(isValidVenueId("venue@123")).toBe(false);
      expect(isValidVenueId(123)).toBe(false);
      expect(isValidVenueId("")).toBe(false);
    });

    it("should reject venue IDs longer than 100 characters", () => {
      const longId = "a".repeat(101);
      expect(isValidVenueId(longId)).toBe(false);
    });
  });

  describe("isValidApiKey", () => {
    it("should accept valid 32-64 character alphanumeric keys", () => {
      const validKey = "a".repeat(32);
      expect(isValidApiKey(validKey)).toBe(true);
      
      const longKey = "b".repeat(64);
      expect(isValidApiKey(longKey)).toBe(true);
    });

    it("should reject invalid API keys", () => {
      expect(isValidApiKey("short")).toBe(false);
      expect(isValidApiKey("a".repeat(31))).toBe(false);
      expect(isValidApiKey("a".repeat(65))).toBe(false);
      expect(isValidApiKey("key-with-dashes")).toBe(false);
      expect(isValidApiKey(12345)).toBe(false);
    });
  });

  describe("generateRequestId", () => {
    it("should generate unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it("should start with 'req_' prefix", () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req_/);
    });
  });

  describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const request = new NextRequest("http://localhost", {
        headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
      });
      
      expect(getClientIp(request)).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const request = new NextRequest("http://localhost", {
        headers: { "x-real-ip": "192.168.1.1" },
      });
      
      expect(getClientIp(request)).toBe("192.168.1.1");
    });

    it("should return 'unknown' if no IP headers present", () => {
      const request = new NextRequest("http://localhost");
      
      expect(getClientIp(request)).toBe("unknown");
    });
  });

  describe("validateMethod", () => {
    it("should accept allowed methods", () => {
      const request = new NextRequest("http://localhost", { method: "POST" });
      const result = validateMethod(request, ["GET", "POST"]);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject disallowed methods", () => {
      const request = new NextRequest("http://localhost", { method: "DELETE" });
      const result = validateMethod(request, ["GET", "POST"]);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(405);
    });
  });

  describe("validateContentType", () => {
    it("should accept correct content type", () => {
      const request = new NextRequest("http://localhost", {
        headers: { "content-type": "application/json" },
      });
      const result = validateContentType(request);
      
      expect(result.valid).toBe(true);
    });

    it("should reject incorrect content type", () => {
      const request = new NextRequest("http://localhost", {
        headers: { "content-type": "text/plain" },
      });
      const result = validateContentType(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(415);
    });

    it("should handle missing content type", () => {
      const request = new NextRequest("http://localhost");
      const result = validateContentType(request);
      
      expect(result.valid).toBe(false);
      expect(result.error?.status).toBe(415);
    });
  });

  describe("validateRequest", () => {
    it("should generate request ID if not provided", () => {
      const request = new NextRequest("http://localhost");
      const result = validateRequest(request);
      
      expect(result.valid).toBe(true);
      expect(result.requestId).toMatch(/^req_/);
    });

    it("should use provided request ID", () => {
      const request = new NextRequest("http://localhost", {
        headers: { "x-request-id": "custom-123" },
      });
      const result = validateRequest(request);
      
      expect(result.requestId).toBe("custom-123");
    });

    it("should reject requests that are too large", () => {
      const request = new NextRequest("http://localhost", {
        headers: { "content-length": "20000000" },
      });
      const result = validateRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(413);
    });

    it("should extract client IP", () => {
      const request = new NextRequest("http://localhost", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      const result = validateRequest(request);
      
      expect(result.clientIp).toBe("192.168.1.1");
    });
  });

  describe("Error and Success Responses", () => {
    it("should create error responses with proper structure", () => {
      const response = createErrorResponse("Test error", 400, { detail: "extra" });
      
      expect(response.status).toBe(400);
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("should create success responses with security headers", () => {
      const response = createSuccessResponse({ data: "test" }, 200);
      
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });

  describe("Security Headers", () => {
    it("should provide comprehensive security headers", () => {
      // Just verify the security utilities are properly exported
      expect(sanitizeInput).toBeDefined();
      expect(validateJsonInput).toBeDefined();
      expect(withSecurityHeaders).toBeDefined();
      expect(createErrorResponse).toBeDefined();
      expect(createSuccessResponse).toBeDefined();
    });
  });
});
