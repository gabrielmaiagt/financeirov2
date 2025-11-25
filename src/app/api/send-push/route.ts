'use server';
import { NextResponse } from 'next/server';
// import { initializeFirebase } from '@/firebase/server-admin'; // Removed Admin SDK
// import type { MulticastMessage } from 'firebase-admin/messaging'; // Removed Admin SDK
// import { Timestamp } from 'firebase-admin/firestore'; // Removed Admin SDK
import { logError } from '@/lib/server-utils';
import { getFirebaseClient } from '@/firebase/api-client';

export async function POST(request: Request) {
  let firestore: any;
  try {
    // const adminServices = initializeFirebase(); // Removed Admin SDK
    // firestore = adminServices.firestore;
    // const messaging = adminServices.messaging;

    // Initialize Client SDK just for logging if needed, or remove if not used
    const client = getFirebaseClient();
    firestore = client.firestore;

    const { message, title, link = '/' } = await request.json();

    if (!message || !title) {
      return NextResponse.json({ message: 'Missing message or title in request body.' }, { status: 400 });
    }

    console.warn("Push Notification skipped: Firebase Admin SDK is disabled.");
    console.log(`[MOCK PUSH] Title: ${title}, Message: ${message}, Link: ${link}`);

    // Since we removed Admin SDK, we cannot send multicast messages from the server side
    // without using the legacy HTTP API (which requires server key) or the new HTTP v1 API (which requires OAuth2/Service Account).
    // For now, we just log the request to ensure the webhook flow doesn't break.

    /*
    // Original logic commented out
    const profilesSnapshot = await firestore.collection("perfis").get();
    // ... (rest of the logic)
    */

    return NextResponse.json({
      message: 'Push notifications are currently disabled (Admin SDK removed). Request logged.',
      successCount: 0,
      failureCount: 0
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error sending push notifications:', error);
    if (firestore) {
      await logError(firestore, error, 'send-push-api-catch-block', { body: 'Could not read request body' });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Error sending push notifications.', error: errorMessage }, { status: 500 });
  }
}
