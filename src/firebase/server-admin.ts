// This file is meant for server-side Firebase initialization (e.g., in API routes)
const app = getApp();
return {
    app,
    firestore: getFirestore(app),
    messaging: getMessaging(app),
};
    }
}
