/**
 * Enhanced component tests with accessibility checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect as vitestExpect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

vitestExpect.extend(matchers);
import Chatbot from "./Chatbot";

// Mock the venue context
vi.mock("@/context/VenueContext", () => ({
  useVenue: () => ({
    venue: {
      id: "test-venue-1",
      name: "Test Arena",
      city: "Test City",
    },
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("Chatbot Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render with initial welcome message", () => {
    render(<Chatbot />);
    
    expect(
      screen.getByText(/Hi! I am your assistant for Test Arena/)
    ).toBeInTheDocument();
  });

  it("should have accessible input field with label", () => {
    render(<Chatbot />);
    
    const input = screen.getByLabelText("Message to assistant");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("should have accessible send button", () => {
    render(<Chatbot />);
    
    const sendButton = screen.getByRole("button", { name: "Send message" });
    expect(sendButton).toBeInTheDocument();
  });

  it("should disable send button when input is empty", () => {
    render(<Chatbot />);
    
    const sendButton = screen.getByRole("button", { name: "Send message" });
    expect(sendButton).toBeDisabled();
  });

  it("should enable send button when input has text", async () => {
    const user = userEvent.setup();
    render(<Chatbot />);
    
    const input = screen.getByLabelText("Message to assistant");
    const sendButton = screen.getByRole("button", { name: "Send message" });
    
    await user.type(input, "Hello");
    expect(sendButton).toBeEnabled();
  });

  it("should send message when Enter is pressed", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Test response" }),
    } as Response);

    render(<Chatbot />);
    
    const input = screen.getByLabelText("Message to assistant");
    await user.type(input, "Test message{Enter}");
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Test message"),
        })
      );
    });
  });

  it("should display loading indicator while waiting for response", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<Chatbot />);
    
    const input = screen.getByLabelText("Message to assistant");
    const sendButton = screen.getByRole("button", { name: "Send message" });
    
    await user.type(input, "Test");
    await user.click(sendButton);
    
    expect(screen.getByText("Assistant is typing")).toBeInTheDocument();
  });

  it("should display error message on failed request", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Service unavailable" }),
    } as Response);

    render(<Chatbot />);
    
    const input = screen.getByLabelText("Message to assistant");
    await user.type(input, "Test{Enter}");
    
    await waitFor(() => {
      expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    });
  });

  it("should have proper ARIA attributes for live region", () => {
    render(<Chatbot />);
    
    const logRegion = screen.getByRole("log");
    expect(logRegion).toHaveAttribute("aria-live", "polite");
    expect(logRegion).toHaveAttribute("aria-relevant", "additions");
  });

  it("should have accessible section label", () => {
    render(<Chatbot />);
    
    const section = screen.getByRole("region", {
      name: "Assistant chat for Test Arena",
    });
    expect(section).toBeInTheDocument();
  });

  it("should clear input after sending message", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Response" }),
    } as Response);

    render(<Chatbot />);
    
    const input = screen.getByLabelText("Message to assistant") as HTMLInputElement;
    await user.type(input, "Test message");
    
    const sendButton = screen.getByRole("button", { name: "Send message" });
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("should handle network errors gracefully", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<Chatbot />);
    
    const input = screen.getByLabelText("Message to assistant");
    await user.type(input, "Test{Enter}");
    
    await waitFor(() => {
      expect(
        screen.getByText("Sorry, I'm having trouble connecting right now.")
      ).toBeInTheDocument();
    });
  });
});
