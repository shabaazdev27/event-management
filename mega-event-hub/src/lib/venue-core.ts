import {
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import {
  getVenueCatalogCapacity,
  listAllVenueIds,
  venueExistsInCatalog,
} from "@/lib/venue-catalog";
import { DEFAULT_VENUE_ID } from "@/lib/venues";

export type GateLocation = "GENERAL" | "FANZONE";

export type VenueGateRecord = {
  id: string;
  max_flow: number;
  current_occupied: number;
  total_entries_count: number;
  location: GateLocation;
};

export type VenueState = {
  total_capacity: number;
  current_occupied: number;
  gates: VenueGateRecord[];
  fanzone_capacity: number;
  fanzone_occupied: number;
  critical_threshold: number;
};

export type DashboardGateMetric = {
  id: string;
  max_flow: number;
  current: number;
  wait_time: number;
};

export type DashboardLiveMetricsPayload = {
  type: "DASHBOARD_LIVE_METRICS";
  timestamp: number;
  venueId: string;
  global_status: {
    total: number;
    occupied: number;
    free: number;
    occupancy_percent: number;
    alert_status: string;
    alert_message: string;
  };
  gates: DashboardGateMetric[];
  fanzone: { occupied: number; max: number };
};

async function assertVenue(venueId: string) {
  const ok = await venueExistsInCatalog(venueId);
  if (!ok) {
    throw new Error(`Unknown venue: ${venueId}`);
  }
}

async function defaultVenueState(venueId: string): Promise<VenueState> {
  const cap = await getVenueCatalogCapacity(venueId);
  return {
    total_capacity: cap,
    current_occupied: Math.round(cap * 0.46),
    gates: [],
    fanzone_capacity: 5000,
    fanzone_occupied: 2200,
    critical_threshold: 0.95,
  };
}

export async function getVenueState(
  venueId: string = DEFAULT_VENUE_ID
): Promise<VenueState> {
  await assertVenue(venueId);
  const stateRef = venuePaths.stateDoc(venueId);
  const snap = await getDoc(stateRef);

  if (!snap.exists()) {
    const initialState = await defaultVenueState(venueId);
    await setDoc(stateRef, initialState);
    return initialState;
  }
  return snap.data() as VenueState;
}

export async function saveVenueState(venueId: string, state: VenueState) {
  await assertVenue(venueId);
  await setDoc(venuePaths.stateDoc(venueId), state);
}

async function broadcastUpdate(
  venueId: string,
  payload: DashboardLiveMetricsPayload
) {
  await setDoc(venuePaths.metricsDoc(venueId), payload);
}

export async function handleSensorEntry(
  gate_id: string,
  venueId: string = DEFAULT_VENUE_ID
) {
  await assertVenue(venueId);
  const state = await getVenueState(venueId);
  const gateIndex = state.gates.findIndex((g) => g.id === gate_id);

  if (gateIndex === -1) throw new Error("Gate ID not found in VenueState");

  state.current_occupied += 1;
  state.gates[gateIndex].total_entries_count += 1;

  await addDoc(venuePaths.sensorEvents(venueId), {
    time: Timestamp.now(),
    type: "ENTRY",
    gate: gate_id,
  });

  if (state.gates[gateIndex].location === "FANZONE") {
    state.fanzone_occupied += 1;
  }

  await saveVenueState(venueId, state);
  await triggerOperationalChecks(state, venueId);
}

export async function handleSensorExit(
  gate_id: string,
  venueId: string = DEFAULT_VENUE_ID
) {
  await assertVenue(venueId);
  const state = await getVenueState(venueId);
  const gateIndex = state.gates.findIndex((g) => g.id === gate_id);

  if (gateIndex === -1) throw new Error("Gate ID not found in VenueState");

  state.current_occupied = Math.max(0, state.current_occupied - 1);
  state.gates[gateIndex].total_entries_count = Math.max(
    0,
    state.gates[gateIndex].total_entries_count - 1
  );

  if (state.gates[gateIndex].location === "FANZONE") {
    state.fanzone_occupied = Math.max(0, state.fanzone_occupied - 1);
  }

  await saveVenueState(venueId, state);
  await triggerOperationalChecks(state, venueId);
}

export async function addNewGate(
  id: string,
  max_flow: number,
  location: GateLocation,
  venueId: string = DEFAULT_VENUE_ID
) {
  await assertVenue(venueId);
  const state = await getVenueState(venueId);

  if (state.gates.find((g) => g.id === id)) {
    throw new Error("Gate ID already exists");
  }

  const newGate: VenueGateRecord = {
    id,
    max_flow,
    current_occupied: 0,
    total_entries_count: 0,
    location,
  };

  state.gates.push(newGate);
  await saveVenueState(venueId, state);
  await triggerOperationalChecks(state, venueId);
}

export async function triggerOperationalChecks(
  state?: VenueState,
  venueId: string = DEFAULT_VENUE_ID
) {
  await assertVenue(venueId);
  const currentState = state ?? (await getVenueState(venueId));

  const free_capacity =
    currentState.total_capacity - currentState.current_occupied;
  const current_occupancy_ratio =
    currentState.current_occupied / currentState.total_capacity;

  let alert_status = "GREEN";
  let alert_message = "";

  if (current_occupancy_ratio >= currentState.critical_threshold) {
    alert_status = "RED";
    alert_message =
      "CRITICAL: OVERCROWDED. CAPACITY REACHED " +
      Math.round(current_occupancy_ratio * 100) +
      "%.";
  } else if (current_occupancy_ratio >= 0.85) {
    alert_status = "AMBER";
    alert_message =
      "WARNING: HIGH OCCUPANCY. CAPACITY REACHED " +
      Math.round(current_occupancy_ratio * 100) +
      "%.";
  }

  const dashboardPayload: DashboardLiveMetricsPayload = {
    type: "DASHBOARD_LIVE_METRICS",
    timestamp: Timestamp.now().toMillis(),
    venueId,
    global_status: {
      total: currentState.total_capacity,
      occupied: currentState.current_occupied,
      free: free_capacity,
      occupancy_percent: current_occupancy_ratio,
      alert_status,
      alert_message,
    },
    gates: [],
    fanzone: {
      occupied: currentState.fanzone_occupied,
      max: currentState.fanzone_capacity,
    },
  };

  const fiveMinsAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
  const logCol = venuePaths.sensorEvents(venueId);

  for (const gate of currentState.gates) {
    const logQuery = query(
      logCol,
      where("gate", "==", gate.id),
      where("type", "==", "ENTRY"),
      where("time", ">=", fiveMinsAgo)
    );

    const relevant_entries = await getDocs(logQuery);
    const entry_count = relevant_entries.size;
    const avg_entry_rate_per_min = entry_count / 5;

    let wait_time_minutes = 0;
    if (avg_entry_rate_per_min > 0) {
      wait_time_minutes = Math.round(
        gate.total_entries_count / avg_entry_rate_per_min
      );
    }

    dashboardPayload.gates.push({
      id: gate.id,
      max_flow: gate.max_flow,
      current: gate.current_occupied,
      wait_time: wait_time_minutes,
    });
  }

  await broadcastUpdate(venueId, dashboardPayload);
}

export async function processScheduledCalculations() {
  const ids = await listAllVenueIds();
  for (const id of ids) {
    try {
      await triggerOperationalChecks(undefined, id);
    } catch {
      /* venue may have no state yet */
    }
  }
}
