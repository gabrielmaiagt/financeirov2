import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';

/**
 * Admin endpoint to migrate existing users to have orgId custom claims
 * This should only be run once during migration
 */
export async function POST(request: NextRequest) {
    try {
        const { auth, firestore } = initializeFirebase();

        // List all users
        const listUsersResult = await auth.listUsers();
        const users = listUsersResult.users;

        console.log(`Found ${users.length} users to potentially migrate`);

        const migrationResults = [];

        for (const user of users) {
            try {
                // Get current custom claims
                const userRecord = await auth.getUser(user.uid);
                const existingClaims = userRecord.customClaims || {};

                // Skip if user already has orgId
                if (existingClaims.orgId) {
                    console.log(`User ${user.email} already has orgId: ${existingClaims.orgId}`);
                    migrationResults.push({
                        email: user.email,
                        status: 'skipped',
                        reason: 'Already has orgId',
                        orgId: existingClaims.orgId
                    });
                    continue;
                }

                // Check if user exists in interno-fluxo organization
                const userDocRef = firestore
                    .collection('organizations')
                    .doc('interno-fluxo')
                    .collection('users')
                    .doc(user.uid);

                const userDoc = await userDocRef.get();

                if (userDoc.exists) {
                    // User exists in interno-fluxo, add custom claims
                    const userData = userDoc.data();
                    const role = userData?.role || 'member';
                    const isAdmin = role === 'owner' || role === 'admin';

                    await auth.setCustomUserClaims(user.uid, {
                        orgId: 'interno-fluxo',
                        role: role,
                        admin: isAdmin
                    });

                    console.log(`✅ Migrated user ${user.email} to interno-fluxo`);
                    migrationResults.push({
                        email: user.email,
                        status: 'migrated',
                        orgId: 'interno-fluxo',
                        role: role
                    });
                } else {
                    // User doesn't exist in any organization
                    console.log(`⚠️ User ${user.email} not found in any organization`);
                    migrationResults.push({
                        email: user.email,
                        status: 'orphan',
                        reason: 'Not found in any organization'
                    });
                }

            } catch (userError: any) {
                console.error(`Error migrating user ${user.email}:`, userError);
                migrationResults.push({
                    email: user.email,
                    status: 'error',
                    error: userError.message
                });
            }
        }

        // Summary
        const summary = {
            total: users.length,
            migrated: migrationResults.filter(r => r.status === 'migrated').length,
            skipped: migrationResults.filter(r => r.status === 'skipped').length,
            orphaned: migrationResults.filter(r => r.status === 'orphan').length,
            errors: migrationResults.filter(r => r.status === 'error').length
        };

        return NextResponse.json({
            success: true,
            message: 'Migration completed',
            summary,
            results: migrationResults
        });

    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Migration failed',
                details: error.message
            },
            { status: 500 }
        );
    }
}
