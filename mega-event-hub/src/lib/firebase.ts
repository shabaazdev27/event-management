import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
} from "firebase/firestore";

/**
 * Client Firebase config: public keys only (safe in the browser).
 * Override via NEXT_PUBLIC_* in .env for different projects.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "event-management-4d9e5.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "event-management-4d9e5",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "event-management-4d9e5.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "749459313795",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:749459313795:web:5fa27b4c19bcaa758377b6",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-WHSQCSCZ6R",
};

function createApp(): FirebaseApp {
  if (!firebaseConfig.apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[firebase] NEXT_PUBLIC_FIREBASE_API_KEY is missing; Firestore calls may fail."
      );
    }
  }
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
}

export const app = createApp();

/**
 * Initialize Firestore with optimized settings for faster loading
 */
let firestoreInstance: Firestore | null = null;

function initializeOptimizedFirestore(): Firestore {
  if (firestoreInstance) return firestoreInstance;

  try {
    // Initialize with cache optimization
    firestoreInstance = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      ignoreUndefinedProperties: true,
    });

    // Enable offline persistence for instant loading from cache
    if (typeof window !== "undefined") {
      enableMultiTabIndexedDbPersistence(firestoreInstance).catch((err) => {
        if (err.code === "failed-precondition") {
          // Multiple tabs open, fallback to single tab
          enableIndexedDbPersistence(firestoreInstance!).catch(() => {
            console.warn("[firebase] Persistence disabled");
          });
        } else if (err.code === "unimplemented") {
          console.warn("[firebase] Persistence not available in this browser");
        }
      });
    }

    return firestoreInstance;
  } catch {
    // Fallback if initialization fails
    return getFirestore(app);
  }
}

export const db: Firestore = initializeOptimizedFirestore();

/**
 * Connection state for UI feedback
 */
export const connectionState = {
  isConnected: true,
  listeners: new Set<(connected: boolean) => void>(),
  
  subscribe(callback: (connected: boolean) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  },
  
  setConnected(connected: boolean) {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      this.listeners.forEach(cb => cb(connected));
    }
  },
};
