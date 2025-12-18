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

        // Test 4: Check if user exists (Debug Logic)
        let userQueryStatus = 'Not tested';
        let foundUserPath = 'None';
        try {
            const usersSnapshot = await firestore.collectionGroup('users')
                .where('email', '==', 'gabrielmaiasantos0012@gmail.com')
                .limit(1)
                .get();

            if (usersSnapshot.empty) {
                userQueryStatus = 'Query executed but NO user found';
            } else {
                userQueryStatus = `Found ${usersSnapshot.size} user(s)`;
                foundUserPath = usersSnapshot.docs[0].ref.path;
            }
        } catch (queryError: any) {
            userQueryStatus = `Query Failed: ${queryError.message}`;
        }

        return NextResponse.json({
            status: 'ok',
            firebase: {
                appOptions: app.options,
                firestore: firestoreStatus,
                auth: authStatus,
                tokenMinting: tokenStatus,
                userQuery: userQueryStatus,
                foundUserPath
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
