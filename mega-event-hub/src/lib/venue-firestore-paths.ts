import { collection, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Multi-tenant paths: one Firestore tree per stadium/venue. */
export const venuePaths = {
  stateDoc: (venueId: string) => doc(db, "siteVenues", venueId, "state", "current"),
  metricsDoc: (venueId: string) => doc(db, "siteVenues", venueId, "live", "dashboard"),
  sensorEvents: (venueId: string) => collection(db, "siteVenues", venueId, "sensorEvents"),
  events: (venueId: string) => collection(db, "siteVenues", venueId, "events"),
  eventDoc: (venueId: string, eventId: string) =>
    doc(db, "siteVenues", venueId, "events", eventId),
  incidents: (venueId: string) => collection(db, "siteVenues", venueId, "incidents"),
  cameras: (venueId: string) => collection(db, "siteVenues", venueId, "cameras"),
  parkingCameras: (venueId: string) =>
    collection(db, "siteVenues", venueId, "parking_cameras"),
  queues: (venueId: string) => collection(db, "siteVenues", venueId, "queues"),
  queueDoc: (venueId: string, queueId: string) =>
    doc(db, "siteVenues", venueId, "queues", queueId),
  cameraDoc: (venueId: string, cameraId: string) =>
    doc(db, "siteVenues", venueId, "cameras", cameraId),
  parkingCameraDoc: (venueId: string, cameraId: string) =>
    doc(db, "siteVenues", venueId, "parking_cameras", cameraId),
  incidentDoc: (venueId: string, incidentId: string) =>
    doc(db, "siteVenues", venueId, "incidents", incidentId),
  fanpoll: (venueId: string) => doc(db, "siteVenues", venueId, "globals", "fanpoll"),
  trivia: (venueId: string) => doc(db, "siteVenues", venueId, "globals", "trivia"),
  staffMetricOverrides: (venueId: string) =>
    doc(db, "siteVenues", venueId, "staff", "metricOverrides"),
};
