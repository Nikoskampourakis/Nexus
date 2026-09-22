import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Resolve Firebase Web API Key securely: check environment first, then config
const envKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY ||
               (import.meta as any).env?.FIREBASE_API_KEY ||
               (typeof process !== 'undefined' ? (process.env?.VITE_FIREBASE_API_KEY || process.env?.FIREBASE_API_KEY) : undefined);

const rawApiKey = (envKey && typeof envKey === 'string' && envKey.trim())
  ? envKey.trim()
  : ((firebaseConfig as any).apiKey && typeof (firebaseConfig as any).apiKey === 'string' ? (firebaseConfig as any).apiKey.trim() : '');

// A valid Firebase API key is non-empty, non-dummy string (e.g. AIza...)
export const isFirebaseConfigured = (): boolean => {
  return Boolean(rawApiKey && rawApiKey.length > 10 && rawApiKey !== 'AIzaSyPlaceholder');
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    const config = {
      ...firebaseConfig,
      apiKey: rawApiKey
    };
    appInstance = getApps().length > 0 ? getApp() : initializeApp(config);
    authInstance = getAuth(appInstance);
    const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
    dbInstance = dbId ? getFirestore(appInstance, dbId) : getFirestore(appInstance);
  } catch (error) {
    console.warn('Firebase initialization deferred or failed:', error);
  }
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();

