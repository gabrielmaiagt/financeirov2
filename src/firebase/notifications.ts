import { getMessaging, getToken } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { doc, setDoc, arrayUnion, getFirestore, collection, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

async function saveTokenToProfile(token: string, orgId: string) {
    const firestore = getFirestore();

    try {
        const profilesRef = collection(firestore, 'organizations', orgId, 'perfis');
        const profilesSnapshot = await getDocs(profilesRef);

        if (profilesSnapshot.empty) {
            console.warn("No profiles found to save FCM token to.");
            return;
        }

        const batch = writeBatch(firestore);
        profilesSnapshot.forEach(profileDoc => {
            const profileRef = doc(firestore, 'organizations', orgId, 'perfis', profileDoc.id);
            batch.update(profileRef, {
                fcmTokens: arrayUnion(token)
            });
        });

        await batch.commit();
        console.log(`FCM Token added to all profiles in org ${orgId}.`);

    } catch (error: any) {
        console.error(`Error saving FCM token to profiles:`, error);
    }
}

export async function requestNotificationPermission(orgId: string): Promise<boolean> {
    console.log('Requesting notification permission...');

    // Native Platform (Android/iOS)
    if (Capacitor.isNativePlatform()) {
        try {
            const permission = await PushNotifications.requestPermissions();

            if (permission.receive === 'granted') {
                console.log('Native notification permission granted.');

                // Register with FCM
                await PushNotifications.register();

                // Listen for registration to get token
                PushNotifications.addListener('registration', async (token) => {
                    console.log('Native FCM Token:', token.value);
                    await saveTokenToProfile(token.value, orgId);
                });

                PushNotifications.addListener('registrationError', (error) => {
                    console.error('Error on registration: ', error);
                });

                return true;
            } else {
                console.log('Native notification permission denied.');
                return false;
            }
        } catch (err) {
            console.error('Error requesting native permissions:', err);
            return false;
        }
    }

    // Web Platform
    else {
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
                console.log('Web notification permission granted.');
                const messaging = getMessaging(getApp());
                const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

                if (currentToken) {
                    console.log('Web FCM Token:', currentToken);
                    await saveTokenToProfile(currentToken, orgId);
                    return true;
                } else {
                    console.log('No registration token available.');
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
}
