'use server';
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { Timestamp } from 'firebase-admin/firestore';
import { logError } from '@/lib/server-utils';

async function cleanupInvalidTokens(firestore: any, tokensToRemove: string[]) {
    if (tokensToRemove.length === 0) return;

    console.log(`Cleaning up ${tokensToRemove.length} invalid tokens.`);
    const profilesSnapshot = await firestore.collection('perfis').get();

    const batch = firestore.batch();

    profilesSnapshot.forEach((doc: any) => {
        const user = doc.data();
        const userTokens: string[] = user.fcmTokens || [];
        
        const validTokens = userTokens.filter(token => !tokensToRemove.includes(token));

        if (validTokens.length < userTokens.length) {
            console.log(`Removing tokens from profile ${doc.id}`);
            const profileRef = firestore.collection('perfis').doc(doc.id);
            batch.update(profileRef, { fcmTokens: validTokens });
        }
    });

    try {
        await batch.commit();
        console.log("Successfully removed invalid tokens from profiles.");
    } catch (error) {
        console.error("Error cleaning up invalid tokens:", error);
        await logError(firestore, error, 'cleanup-invalid-tokens');
    }
}


export async function POST(request: Request) {
  let firestore: any;
  try {
    const adminServices = initializeFirebase();
    firestore = adminServices.firestore;
    const messaging = adminServices.messaging;

    const { message, title, link = '/' } = await request.json();

    if (!message || !title) {
      return NextResponse.json({ message: 'Missing message or title in request body.' }, { status: 400 });
    }

    const profilesSnapshot = await firestore.collection("perfis").get();
    if (profilesSnapshot.empty) {
      console.log("No user profiles found to send notifications to.");
      return NextResponse.json({ message: 'No user profiles found.', successCount: 0, failureCount: 0 }, { status: 200 });
    }

    const tokens: string[] = [];
    profilesSnapshot.forEach((doc: any) => {
      const user = doc.data();
      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
        user.fcmTokens.forEach((token: string) => {
          if (token && !tokens.includes(token)) {
            tokens.push(token);
          }
        });
      }
    });

    if (tokens.length === 0) {
      console.log("No FCM tokens found across all profiles.");
      return NextResponse.json({ message: 'No FCM tokens found to send notifications to.', successCount: 0, failureCount: 0 }, { status: 200 });
    }

    console.log(`Found ${tokens.length} unique tokens. Preparing to send push notifications.`);

    const multicastMessage: MulticastMessage = {
      tokens: tokens,
      notification: {
        title,
        body: message,
      },
      webpush: {
        fcmOptions: {
          link: link || '/',
        },
        notification: {
            icon: '/icon-192x192.png'
        },
        headers: {
            Urgency: 'high',
        },
      },
      data: {
        title,
        body: message,
        link: link || '/',
      }
    };

    const response = await messaging.sendEachForMulticast(multicastMessage);
    console.log(`Successfully sent ${response.successCount} push notifications.`);

    const failureCount = response.failureCount || 0;
    if (failureCount > 0) {
        console.error(`Failed to send ${failureCount} push notifications.`);
        
        const tokensToRemove: string[] = [];
        const errorPromises = response.responses.map(async (result, index) => {
          const error = result.error;
          if (error) {
            const fcmToken = tokens[index]; // Correctly get the token that failed
            const errorDetails = {
              fcmToken,
              errorCode: error.code,
              errorMessage: error.message,
            };
            
            await logError(firestore, error, 'send-push-api-failure', errorDetails);
            
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              if (fcmToken) {
                tokensToRemove.push(fcmToken);
              }
            }
          }
        });
  
        await Promise.all(errorPromises);
  
        if (tokensToRemove.length > 0) {
          await cleanupInvalidTokens(firestore, tokensToRemove);
        }
      }

    return NextResponse.json({ message: 'Push notifications dispatched!', successCount: response.successCount, failureCount: failureCount }, { status: 200 });

  } catch (error: any) {
    console.error('Error sending push notifications:', error);
    if(firestore) {
        await logError(firestore, error, 'send-push-api-catch-block', { body: 'Could not read request body' });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Error sending push notifications.', error: errorMessage }, { status: 500 });
  }
}
