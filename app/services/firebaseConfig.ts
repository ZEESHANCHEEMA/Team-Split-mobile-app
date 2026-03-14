import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Use React Native build of Auth so session persists in AsyncStorage (app close/reopen)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const authModule = require("@firebase/auth");

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

const isFirstLoad = getApps().length === 0;
const app = isFirstLoad ? initializeApp(firebaseConfig) : getApp();

export const auth = isFirstLoad
  ? authModule.initializeAuth(app, {
      persistence: authModule.getReactNativePersistence(AsyncStorage),
    })
  : authModule.getAuth(app);

function getFirestoreInstance() {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch (e: unknown) {
    return getFirestore(app);
  }
}

export const db = getFirestoreInstance();

export const storage = getStorage(app);