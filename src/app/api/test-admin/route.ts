import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';

export async function GET() {
    try {
        console.log("🔍 Testing Admin SDK initialization...");
        const adminServices = initializeFirebase();

        console.log("✅ Admin SDK initialized successfully");
        console.log("📊 Checking Firestore access...");

        const firestore = adminServices.firestore;
        const perfisSnapshot = await firestore.collection('perfis').limit(1).get();

        console.log("✅ Firestore access successful");
        console.log(`📱 Found ${perfisSnapshot.size} profile(s) in first query`);

        // Count total tokens
        const allProfiles = await firestore.collection('perfis').get();
        let totalTokens = 0;
        allProfiles.forEach((doc: any) => {
            const data = doc.data();
            if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                totalTokens += data.fcmTokens.length;
            }
        });

        return NextResponse.json({
            success: true,
            adminSdkInitialized: true,
            firestoreAccess: true,
            totalProfiles: allProfiles.size,
            totalFcmTokens: totalTokens,
            messagingAvailable: !!adminServices.messaging
        });

    } catch (error: any) {
        console.error("❌ Admin SDK test failed:", error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
