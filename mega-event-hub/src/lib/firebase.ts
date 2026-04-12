import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

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
export const db: Firestore = getFirestore(app);
