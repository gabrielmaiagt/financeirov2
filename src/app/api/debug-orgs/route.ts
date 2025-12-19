import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { firestore } = initializeFirebase();

        // Fetch all organizations
        const orgsSnapshot = await firestore.collection('organizations').get();

        const organizations = orgsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || doc.id,
                hasWebhookSecret: !!data.webhookSecret,
                webhookSecretPreview: data.webhookSecret
                    ? `${data.webhookSecret.substring(0, 10)}...`
                    : null,
                createdAt: data.createdAt?.toDate?.() || null,
                usersCount: null, // Could be fetched if needed
            };
        });

        // Summary
        const summary = {
            totalOrganizations: organizations.length,
            withWebhookSecret: organizations.filter(o => o.hasWebhookSecret).length,
            withoutWebhookSecret: organizations.filter(o => !o.hasWebhookSecret).length,
        };

        return NextResponse.json({
            summary,
            organizations,
            webhookUrlFormat: {
                withSecret: '/api/webhooks/{gateway}/{webhookSecret}',
                legacy: '/api/webhook/{gateway}?orgId={orgId}',
                availableGateways: ['buckpay', 'paradise', 'frendz', 'ggcheckout'],
            },
        });

    } catch (error: any) {
        console.error('Debug orgs error:', error);
        return NextResponse.json({
            error: 'Failed to fetch organizations',
            message: error.message
        }, { status: 500 });
    }
}
