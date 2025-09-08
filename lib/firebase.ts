import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config is loaded from environment variables (see .env.local).
// Use NEXT_PUBLIC_ prefix so variables are available on the client in Next.js.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? ''
};

// Warn if any expected env var is missing (helps during local setup).
const missing = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.warn('Missing Firebase config env vars:', missing.join(', '), '\nPlease add them to .env.local (use NEXT_PUBLIC_ prefix).');
}

// Initialize Firebase app safely (prevents double initialization during HMR).
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and Cloud Firestore references
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);