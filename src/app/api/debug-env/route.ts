import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { firestore, auth, app } = initializeFirebase();

        // Test 1: Firestore Access
        const testDoc = await firestore.collection('organizations').limit(1).get();
        const firestoreStatus = testDoc.empty ? 'Connected (Empty)' : `Connected (${testDoc.size} docs)`;

        // Test 2: Auth Service (just check if instance exists, creating token logs sensitive info usually)
        const authStatus = auth ? 'Auth Instance Created' : 'Auth Instance Missing';

        // Test 3: Create a dummy custom token to verify IAM permissions
        let tokenStatus = 'Not tested';
        try {
            await auth.createCustomToken('test-uid');
            tokenStatus = 'Success: Token Minting Works';
        } catch (tokenError: any) {
            tokenStatus = `Failed: ${tokenError.message}`;
        }

        return NextResponse.json({
            status: 'ok',
            firebase: {
                appOptions: app.options, // Safe to expose options (projectId etc)
                firestore: firestoreStatus,
                auth: authStatus,
                tokenMinting: tokenStatus
            },
            env: {
                projectId: process.env.FIREBASE_PROJECT_ID,
                hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
                hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
