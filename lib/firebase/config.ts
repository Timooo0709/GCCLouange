import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? "AIzaSyDsd7NPGGdz4Cd1-yXQRr2xi06iXS6KVfM",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "gcclouange.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? "gcclouange",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "gcclouange.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "189043408205",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? "1:189043408205:web:54763a01f4216cede8cb04",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Use long-polling as fallback for mobile networks that block WebSocket/gRPC
export const db = getApps().length > 1
  ? getFirestore(app)
  : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
export const auth = getAuth(app);
