import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDoc, mockCollection } = vi.hoisted(() => ({
  mockDoc: vi.fn((...args: unknown[]) => ({ kind: "doc" as const, args })),
  mockCollection: vi.fn((...args: unknown[]) => ({
    kind: "collection" as const,
    args,
  })),
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
}));

vi.mock("@/lib/firebase", () => ({ db: { __testDb: true } }));

import { venuePaths } from "./venue-firestore-paths";

describe("venuePaths", () => {
  beforeEach(() => {
    mockDoc.mockClear();
    mockCollection.mockClear();
  });

  it("stateDoc uses siteVenues/{id}/state/current", () => {
    venuePaths.stateDoc("chennai");
    expect(mockDoc).toHaveBeenCalledWith(
      { __testDb: true },
      "siteVenues",
      "chennai",
      "state",
      "current"
    );
  });

  it("metricsDoc uses live/dashboard", () => {
    venuePaths.metricsDoc("x");
    expect(mockDoc).toHaveBeenCalledWith(
      { __testDb: true },
      "siteVenues",
      "x",
      "live",
      "dashboard"
    );
  });

  it("sensorEvents is a collection under venue", () => {
    venuePaths.sensorEvents("v1");
    expect(mockCollection).toHaveBeenCalledWith(
      { __testDb: true },
      "siteVenues",
      "v1",
      "sensorEvents"
    );
  });

  it("queueDoc and incidentDoc nest ids correctly", () => {
    venuePaths.queueDoc("v", "q1");
    expect(mockDoc).toHaveBeenLastCalledWith(
      { __testDb: true },
      "siteVenues",
      "v",
      "queues",
      "q1"
    );
    venuePaths.incidentDoc("v", "i1");
    expect(mockDoc).toHaveBeenLastCalledWith(
      { __testDb: true },
      "siteVenues",
      "v",
      "incidents",
      "i1"
    );
  });
});
