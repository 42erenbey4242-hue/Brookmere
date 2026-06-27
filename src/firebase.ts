import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

let _app: FirebaseApp | null = null;
let _db: Database | null = null;

// Render ortam değişkenlerinden otomatik config (VITE_ prefix ile tanımlanır)
export function getEnvFirebaseConfig(): FirebaseConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  if (!apiKey || !databaseURL) return null;
  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    databaseURL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };
}

export function initFirebase(config: FirebaseConfig): { app: FirebaseApp | null; db: Database | null } {
  try {
    if (getApps().length === 0) {
      _app = initializeApp(config);
    } else {
      _app = getApps()[0];
    }
    _db = getDatabase(_app);
    return { app: _app, db: _db };
  } catch (e) {
    console.warn('Firebase init failed:', e);
    return { app: null, db: null };
  }
}

export function getDb(): Database | null {
  return _db;
}
