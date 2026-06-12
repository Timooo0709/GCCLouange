import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore est consommé via l'API REST (voir lib/firebase/setlists.ts) —
// seul le module Auth du SDK est utilisé.
export const auth = getAuth(app);
