import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  initializeAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import { logFirebaseBootstrap } from '../utils/firebaseDebug';

const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!;
const storageBucket =
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId,
  storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/** Same as `EXPO_PUBLIC_FIREBASE_PROJECT_ID` — use when logging permission issues vs Firebase Console. */
export const firebaseProjectId = projectId;

type GetReactNativePersistenceFn = (storage: typeof AsyncStorage) => Persistence;

/** `getReactNativePersistence` exists on the RN `@firebase/auth` build but not on `firebase/auth` public typings. */
const getReactNativePersistence: GetReactNativePersistenceFn = (
  require('@firebase/auth') as { getReactNativePersistence: GetReactNativePersistenceFn }
).getReactNativePersistence;

/**
 * React Native: `initializeAuth` + AsyncStorage persistence (`getAuth` alone uses memory-only).
 * Web: `browserLocalPersistence` so sessions survive reloads.
 * Resolve `firebaseAuthPersistenceReady` before treating auth as restored (see AuthContext).
 */
function initFirebaseAuth(): { auth: Auth; firebaseAuthPersistenceReady: Promise<void> } {
  if (Platform.OS === 'web') {
    const auth = getAuth(app);
    return {
      auth,
      firebaseAuthPersistenceReady: setPersistence(auth, browserLocalPersistence).then(() => undefined),
    };
  }

  try {
    const auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    return { auth, firebaseAuthPersistenceReady: Promise.resolve() };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'auth/already-initialized') {
      return { auth: getAuth(app), firebaseAuthPersistenceReady: Promise.resolve() };
    }
    throw e;
  }
}

const { auth, firebaseAuthPersistenceReady } = initFirebaseAuth();

export { auth, firebaseAuthPersistenceReady };

/**
 * Firestore sends `request.auth` from the ID token. On cold start, reads can run
 * before the token is wired → `permission-denied`. Await this before Firestore I/O when a user should be signed in.
 */
export async function ensureAuthReadyForFirestore(): Promise<void> {
  const a = auth as Auth & { authStateReady?: () => Promise<void> };
  if (typeof a.authStateReady === 'function') {
    await a.authStateReady();
  }
  const user = auth.currentUser;
  if (user) {
    await user.getIdToken();
  }
}

let firestoreSingleton: Firestore | undefined;

function getFirestoreInstance(): Firestore {
  if (firestoreSingleton) {
    return firestoreSingleton;
  }
  try {
    firestoreSingleton = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const already =
      err.code === 'failed-precondition' ||
      (typeof err.message === 'string' && err.message.includes('already'));
    if (already) {
      firestoreSingleton = getFirestore(app);
    } else {
      if (__DEV__) {
        console.warn('[Firebase] initializeFirestore failed, falling back to getFirestore:', e);
      }
      firestoreSingleton = getFirestore(app);
    }
  }
  return firestoreSingleton;
}

export const db = getFirestoreInstance();

export const storage = getStorage(app);

logFirebaseBootstrap({
  projectId: projectId || '(missing EXPO_PUBLIC_FIREBASE_PROJECT_ID)',
  appIdSuffix: firebaseConfig.appId?.slice(-8) ?? '?',
  platform: Platform.OS,
  firestoreInitialized: !!firestoreSingleton,
});
