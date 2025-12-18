import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const email = searchParams.get('email');
        const newPass = searchParams.get('pass');

        if (!email || !newPass) {
            return NextResponse.json({ error: 'Use ?email=x&pass=y' }, { status: 400 });
        }

        const { firestore: db } = initializeFirebase();

        // 1. Find user
        console.log(`Searching for ${email}...`);

        // Try Collection Group first
        let usersSnapshot = await db.collectionGroup('users')
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();

        // Fallback to specific org if empty
        if (usersSnapshot.empty) {
            console.log("Not found in CG, checking interno-fluxo...");
            usersSnapshot = await db.collection('organizations')
                .doc('interno-fluxo')
                .collection('users')
                .where('email', '==', email.toLowerCase())
                .limit(1)
                .get();
        }

        if (usersSnapshot.empty) {
            return NextResponse.json({ error: 'User not found anywhere' }, { status: 404 });
        }

        const userDoc = usersSnapshot.docs[0];

        // 2. Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPass, salt);

        // 3. Update
        await userDoc.ref.update({
            passwordHash: passwordHash,
            updatedAt: new Date()
        });

        return NextResponse.json({
            success: true,
            userPath: userDoc.ref.path,
            message: `Password updated to '${newPass}'`
        });

    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message
        }, { status: 500 });
    }
}
