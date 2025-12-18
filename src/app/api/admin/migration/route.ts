import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    let collectionName = 'unknown';
    try {
        const body = await request.json();
        const orgId = body.orgId;
        collectionName = body.collectionName;

        if (!orgId || !collectionName) {
            return NextResponse.json({ error: 'orgId and collectionName are required' }, { status: 400 });
        }

        const { firestore: db } = initializeFirebase();

        // Ensure we are targeted at the correct project if ADC is used
        // and LOG the initialization status for developer to see in console
        console.log(`[Migration API] Using database for project: ${db.projectId || 'default'}`);

        console.log(`🚀 API Migration: Target Org = ${orgId}, Collection = ${collectionName}`);

        const sourceRef = db.collection(collectionName);
        const snapshot = await sourceRef.get();

        if (snapshot.empty) {
            return NextResponse.json({
                collection: collectionName,
                count: 0,
                success: true,
                message: 'No documents found to migrate'
            });
        }

        const batch = db.batch();
        let count = 0;

        snapshot.forEach((doc) => {
            const destRef = db.collection('organizations').doc(orgId).collection(collectionName).doc(doc.id);
            batch.set(destRef, doc.data());
            count++;
        });

        await batch.commit();

        return NextResponse.json({
            collection: collectionName,
            count,
            success: true
        });

    } catch (error: any) {
        console.error(`❌ Migration error for ${collectionName}:`, error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
