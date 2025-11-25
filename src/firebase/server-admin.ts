// This file is meant for server-side Firebase initialization (e.g., in API routes)
// It uses service account credentials for admin privileges.

import { initializeApp, getApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

// Construct the service account object from environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // The private key needs to be parsed correctly, as it comes with escaped newlines
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

interface FirebaseAdminServices {
    app: App;
    firestore: Firestore;
    messaging: Messaging;
}

// This function initializes the Firebase Admin SDK if it hasn't been already.
export function initializeFirebase(): FirebaseAdminServices {
    // Check if all required environment variables are present
    const hasCredentials = serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey;

    if (!hasCredentials) {
        // In a local dev environment without the env var, we can't initialize.
        // This is a fallback to prevent crashing. The API route will fail gracefully.
        console.error("Firebase Admin credentials not found in environment variables. SDK not initialized.");
        // We throw an error to make it clear that the initialization failed.
        throw new Error("Firebase Admin SDK failed to initialize. Service account environment variables are missing.");
    }
    
    // Initialize on the server, only if not already initialized.
    if (getApps().length === 0) {
        const app = initializeApp({
            credential: cert(serviceAccount as any) // Cast as any to satisfy type checking
        });
        return {
            app,
            firestore: getFirestore(app),
            messaging: getMessaging(app),
        };
    } else {
        const app = getApp();
        return {
            app,
            firestore: getFirestore(app),
            messaging: getMessaging(app),
        };
    }
}
