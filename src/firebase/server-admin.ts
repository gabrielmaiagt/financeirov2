// This file is meant for server-side Firebase initialization (e.g., in API routes)
// It uses service account credentials for admin privileges.

import { initializeApp, getApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getAuth, Auth } from 'firebase-admin/auth';

interface FirebaseAdminServices {
    app: App;
    firestore: Firestore;
    messaging: Messaging;
    auth: Auth;
}

// This function initializes the Firebase Admin SDK if it hasn't been already.
export function initializeFirebase(): FirebaseAdminServices {
    // Initialize on the server, only if not already initialized.
    if (getApps().length === 0) {
        let app: App;

        // 1. Try local environment variables first (Development/Manual Configuration)
        // This is prioritized to ensure local dev works correctly even if gcloud creds are present
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };

        const hasLocalCredentials = serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey;

        if (hasLocalCredentials) {
            try {
                console.log("Attempting to initialize Admin SDK with local credentials...");
                app = initializeApp({
                    credential: cert(serviceAccount as any),
                    projectId: serviceAccount.projectId // Explicitly set projectId
                });
                console.log("✅ Admin SDK initialized successfully with local credentials");
                return {
                    app,
                    firestore: getFirestore(app),
                    messaging: getMessaging(app),
                    auth: getAuth(app),
                };
            } catch (localError) {
                console.error("Failed to initialize with provided local credentials:", localError);
                // If local creds fail but were provided, we probably shouldn't fallback silently, but let's try default as last resort
            }
        }

        // 2. Fallback to Firebase App Hosting / Google Cloud Default Credentials
        try {
            console.log("Attempting to initialize Admin SDK with App Hosting/Default credentials...");
            app = initializeApp();
            console.log("✅ Admin SDK initialized successfully with App Hosting/Default credentials");
        } catch (appHostingError) {
            console.error("Firebase Admin SDK initialization failed completely.", appHostingError);
            throw new Error("Firebase Admin SDK initialization failed. Check your credentials.");
        }

        return {
            app,
            firestore: getFirestore(app),
            messaging: getMessaging(app),
            auth: getAuth(app),
        };
    } else {
        const app = getApp();
        return {
            app,
            firestore: getFirestore(app),
            messaging: getMessaging(app),
            auth: getAuth(app),
        };
    }
}
