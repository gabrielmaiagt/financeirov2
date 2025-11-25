'use client';

import { getMessaging, getToken } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { doc, setDoc, arrayUnion, getFirestore, collection, writeBatch, getDocs, query, where } from 'firebase/firestore';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// This function needs to find *which* profile to save the token to.
// Since we have no auth, we can't use auth.currentUser.
// A possible strategy is to prompt the user, but for now, we'll try to find a profile
// or add it to all of them, though that's not ideal.
// A better approach is to not tie FCM tokens to users if there's no login.
// For now, this function will be a no-op until a strategy is decided.

async function saveTokenToProfile(token: string) {
    const firestore = getFirestore();
    
    // In a no-auth scenario, we could save tokens to a generic collection,
    // but to keep the structure, we'll try to update all profiles.
    // This is not ideal as it creates redundancy.
    try {
        const profilesRef = collection(firestore, 'perfis');
        const profilesSnapshot = await getDocs(profilesRef);
        
        if (profilesSnapshot.empty) {
            console.warn("No profiles found to save FCM token to.");
            return;
        }

        const batch = writeBatch(firestore);
        profilesSnapshot.forEach(profileDoc => {
            const profileRef = doc(firestore, 'perfis', profileDoc.id);
            batch.update(profileRef, {
                fcmTokens: arrayUnion(token)
            });
        });
        
        await batch.commit();
        console.log(`FCM Token added to all profiles.`);

    } catch (error: any) {
        console.error(`Error saving FCM token to profiles:`, error);
    }
}


export async function requestNotificationPermission(): Promise<boolean> {
    console.log('Requesting notification permission...');

    if (!VAPID_KEY) {
        console.error("VAPID key not configured. Cannot request notification permission.");
        return false;
    }

    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
        console.error("This browser does not support push notifications.");
        return false;
    }
  
    try {
        const permission = await Notification.requestPermission();
    
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            const messaging = getMessaging(getApp());
            const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    
            if (currentToken) {
                console.log('FCM Token:', currentToken);
                await saveTokenToProfile(currentToken);
                return true;
            } else {
                console.log('No registration token available. Request permission to generate one.');
                return false;
            }
        } else {
            console.log('Unable to get permission to notify.');
            return false;
        }
    } catch (err) {
        console.error('An error occurred while retrieving token or requesting permission. ', err);
        return false;
    }
}
