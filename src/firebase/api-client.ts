import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function if needed elsewhere, but exporting db directly is easier
export function getFirebaseClient() {
    return { app, firestore: db };
}

export { app, db };
