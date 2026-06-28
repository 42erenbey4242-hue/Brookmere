import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

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
let _storage: FirebaseStorage | null = null;

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

export function initFirebase(config: FirebaseConfig): { app: FirebaseApp | null; db: Database | null; storage: FirebaseStorage | null } {
  try {
    if (getApps().length === 0) {
      _app = initializeApp(config);
    } else {
      _app = getApps()[0];
    }
    _db = getDatabase(_app);
    // Storage sadece storageBucket varsa başlat
    if (config.storageBucket) {
      try { _storage = getStorage(_app); } catch {}
    }
    return { app: _app, db: _db, storage: _storage };
  } catch (e) {
    console.warn('Firebase init failed:', e);
    return { app: null, db: null, storage: null };
  }
}

export function getDb(): Database | null { return _db; }
export function getStorage_(): FirebaseStorage | null { return _storage; }

/**
 * GIF'i Firebase Storage'a yükle ve download URL'ini döndür.
 * base64 data URL olarak gelir (data:image/gif;base64,...)
 */
export async function uploadGifToStorage(userId: string, field: 'avatar' | 'banner', base64DataUrl: string): Promise<string> {
  if (!_storage) throw new Error('Firebase Storage başlatılmadı');
  const path = `profiles/${userId}/${field}.gif`;
  const sRef = storageRef(_storage, path);
  // base64 string'i yükle (data URL formatı)
  await uploadString(sRef, base64DataUrl, 'data_url');
  const url = await getDownloadURL(sRef);
  return url;
}
