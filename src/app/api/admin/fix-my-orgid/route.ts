import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';

/**
 * Quick fix endpoint to add orgId to current user
 * GET /api/admin/fix-my-orgid?uid=YOUR_UID
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json(
                { error: 'UID is required. Usage: /api/admin/fix-my-orgid?uid=YOUR_UID' },
                { status: 400 }
            );
        }

        const { auth, firestore } = initializeFirebase();

        // Get user
        const userRecord = await auth.getUser(uid);
        console.log('Found user:', userRecord.email);

        // Check current claims
        const existingClaims = userRecord.customClaims || {};
        if (existingClaims.orgId) {
            return NextResponse.json({
                success: true,
                message: 'User already has orgId',
                email: userRecord.email,
                orgId: existingClaims.orgId,
                role: existingClaims.role
            });
        }

        // Check if user exists in interno-fluxo
        const userDocRef = firestore
            .collection('organizations')
            .doc('interno-fluxo')
            .collection('users')
            .doc(uid);

        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { error: 'User not found in interno-fluxo organization' },
                { status: 404 }
            );
        }

        const userData = userDoc.data();
        const role = userData?.role || 'owner';
        const isAdmin = role === 'owner' || role === 'admin';

        // Set custom claims
        await auth.setCustomUserClaims(uid, {
            orgId: 'interno-fluxo',
            role: role,
            admin: isAdmin
        });

        console.log('✅ Successfully set custom claims for', userRecord.email);

        return NextResponse.json({
            success: true,
            message: 'Custom claims set successfully! Please logout and login again.',
            email: userRecord.email,
            orgId: 'interno-fluxo',
            role: role,
            admin: isAdmin
        });

    } catch (error: any) {
        console.error('Error setting custom claims:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to set custom claims',
                details: error.message
            },
            { status: 500 }
        );
    }
}
