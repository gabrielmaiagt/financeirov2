import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import type { MulticastMessage } from 'firebase-admin/messaging';

export async function GET() {
    try {
        console.log("🧪 Testing direct FCM push notification...");

        const adminServices = initializeFirebase();
        const firestore = adminServices.firestore;
        const messaging = adminServices.messaging;

        // Get all FCM tokens
        const profilesSnapshot = await firestore.collection('perfis').get();
        const tokens: string[] = [];

        profilesSnapshot.forEach((doc: any) => {
            const data = doc.data();
            if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                data.fcmTokens.forEach((token: string) => {
                    if (token && !tokens.includes(token)) {
                        tokens.push(token);
                    }
                });
            }
        });

        if (tokens.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No FCM tokens found'
            }, { status: 400 });
        }

        console.log(`Found ${tokens.length} tokens. Sending test notification...`);

        const message: MulticastMessage = {
            tokens: tokens,
            notification: {
                title: '🧪 TESTE DE NOTIFICAÇÃO',
                body: 'Se você recebeu isso, o FCM está funcionando perfeitamente!',
            },
            webpush: {
                fcmOptions: {
                    link: '/perfis',
                },
                notification: {
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png',
                    requireInteraction: true,
                },
            },
            data: {
                title: '🧪 TESTE DE NOTIFICAÇÃO',
                body: 'Se você recebeu isso, o FCM está funcionando perfeitamente!',
                link: '/perfis',
            }
        };

        const response = await messaging.sendEachForMulticast(message);

        console.log(`✅ Successfully sent ${response.successCount} notifications`);
        console.log(`❌ Failed to send ${response.failureCount} notifications`);

        if (response.failureCount > 0) {
            response.responses.forEach((result, index) => {
                if (result.error) {
                    console.error(`Token ${index} error:`, result.error.code, result.error.message);
                }
            });
        }

        return NextResponse.json({
            success: true,
            tokensFound: tokens.length,
            successCount: response.successCount,
            failureCount: response.failureCount,
            errors: response.responses
                .filter(r => r.error)
                .map((r, i) => ({ token: tokens[i].substring(0, 20) + '...', error: r.error?.message }))
        });

    } catch (error: any) {
        console.error("❌ Test notification failed:", error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
