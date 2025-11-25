// This file is meant for server-side Firebase initialization (e.g., in API routes)
// It uses service account credentials for admin privileges.

import { initializeApp, getApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

interface FirebaseAdminServices {
    app: App;
    firestore: Firestore;
    messaging: Messaging;
}

// This function initializes the Firebase Admin SDK if it hasn't been already.
export function initializeFirebase(): FirebaseAdminServices {
    // Initialize on the server, only if not already initialized.
    if (getApps().length === 0) {
        let app: App;

        // Try Firebase App Hosting automatic credentials first (production)
        try {
            console.log("Attempting to initialize Admin SDK with App Hosting credentials...");
            app = initializeApp();
            console.log("✅ Admin SDK initialized successfully with App Hosting credentials");
        } catch (appHostingError) {
            console.warn("App Hosting initialization failed. Trying local credentials...", appHostingError);

            // Fallback to local environment variables (development)
            const serviceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            };

            const hasCredentials = serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey;

            if (!hasCredentials) {
                const error = new Error("Firebase Admin SDK failed to initialize. No App Hosting credentials and no local env vars found.");
                console.error(error.message);
                throw error;
            }

            try {
                app = initializeApp({
                    credential: cert(serviceAccount as any)
                });
                console.log("✅ Admin SDK initialized successfully with local credentials");
            } catch (localError) {
                console.error("Failed to initialize with local credentials:", localError);
                throw new Error("Firebase Admin SDK initialization failed with both App Hosting and local credentials.");
            }
        }

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
