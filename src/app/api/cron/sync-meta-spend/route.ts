import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin (if not already initialized)
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = getFirestore();

// Helper: Get today's date in Brazil timezone (YYYY-MM-DD)
function getTodayDateId(): string {
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const year = brazilTime.getFullYear();
    const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
    const day = String(brazilTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accessToken = process.env.META_ACCESS_TOKEN;
        const accountIdsString = process.env.META_AD_ACCOUNT_IDS || '';
        const accountIds = accountIdsString.split(',').map(id => id.trim());

        if (!accessToken) {
            return NextResponse.json({ error: 'META_ACCESS_TOKEN not configured' }, { status: 500 });
        }

        if (accountIds.length === 0) {
            return NextResponse.json({ error: 'No ad accounts configured' }, { status: 500 });
        }

        const dateId = getTodayDateId();
        let totalSpendAllAccounts = 0;
        const results = {
            date: dateId,
            accounts: [] as any[],
            campaigns: [] as any[],
            total_spend: 0,
        };

        // Fetch data for each ad account
        for (const accountId of accountIds) {
            try {
                console.log(`[META SYNC] Processing account: ${accountId}`);

                // 1) ACCOUNT LEVEL - Get total spend for the account
                const accountUrl =
                    `https://graph.facebook.com/v19.0/${accountId}/insights` +
                    `?fields=spend,impressions,clicks` +
                    `&date_preset=today` +
                    `&level=account` +
                    `&time_increment=1` +
                    `&access_token=${accessToken}`;

                const accountRes = await fetch(accountUrl);
                const accountJson: any = await accountRes.json();

                if (accountJson.error) {
                    console.error(`[META ERROR] Account ${accountId}:`, accountJson.error);
                    continue;
                }

                const accountData = accountJson.data?.[0] ?? {};
                const accountSpend = Number(accountData.spend ?? 0);
                const accountImpressions = Number(accountData.impressions ?? 0);
                const accountClicks = Number(accountData.clicks ?? 0);

                totalSpendAllAccounts += accountSpend;

                // Save account data to Firestore
                await db
                    .collection('meta_spend_daily')
                    .doc(dateId)
                    .collection('accounts')
                    .doc(accountId)
                    .set({
                        date: dateId,
                        accountId,
                        spend: accountSpend,
                        impressions: accountImpressions,
                        clicks: accountClicks,
                        updatedAt: new Date(),
                    }, { merge: true });

                results.accounts.push({
                    accountId,
                    spend: accountSpend,
                    impressions: accountImpressions,
                    clicks: accountClicks,
                });

                console.log(`[ACCOUNT] ${dateId} - ${accountId} - R$ ${accountSpend.toFixed(2)}`);

                // 2) CAMPAIGN LEVEL - Get spend per campaign
                const campaignUrl =
                    `https://graph.facebook.com/v19.0/${accountId}/insights` +
                    `?fields=campaign_id,campaign_name,spend,impressions,clicks` +
                    `&date_preset=today` +
                    `&level=campaign` +
                    `&time_increment=1` +
                    `&access_token=${accessToken}`;

                const campaignRes = await fetch(campaignUrl);
                const campaignJson: any = await campaignRes.json();

                if (campaignJson.error) {
                    console.error(`[META ERROR] Campaigns for ${accountId}:`, campaignJson.error);
                } else {
                    const campaigns = campaignJson.data ?? [];
                    const batch = db.batch();
                    const baseRef = db.collection('meta_spend_daily').doc(dateId).collection('campaigns');

                    for (const c of campaigns) {
                        const campaignId = c.campaign_id as string;
                        const name = c.campaign_name as string;
                        const spend = Number(c.spend ?? 0);
                        const impressions = Number(c.impressions ?? 0);
                        const clicks = Number(c.clicks ?? 0);

                        const docRef = baseRef.doc(campaignId);
                        batch.set(docRef, {
                            date: dateId,
                            campaignId,
                            campaignName: name,
                            accountId,
                            spend,
                            impressions,
                            clicks,
                            updatedAt: new Date(),
                        }, { merge: true });

                        results.campaigns.push({
                            campaignId,
                            campaignName: name,
                            spend,
                            impressions,
                            clicks,
                        });
                    }

                    await batch.commit();
                    console.log(`[CAMPAIGNS] ${dateId} - ${accountId} - ${campaigns.length} campaigns saved`);
                }
            } catch (err) {
                console.error(`[META ERROR] General error for account ${accountId}:`, err);
            }
        }

        // Save total spend for the day
        await db.collection('meta_spend_daily').doc(dateId).set({
            date: dateId,
            total_spend: totalSpendAllAccounts,
            updatedAt: new Date(),
        }, { merge: true });

        results.total_spend = totalSpendAllAccounts;

        console.log(`[TOTAL] ${dateId} - total_spend = R$ ${totalSpendAllAccounts.toFixed(2)}`);

        return NextResponse.json({
            success: true,
            message: 'Meta spend data synced successfully',
            data: results,
        });
    } catch (error: any) {
        console.error('[META SYNC ERROR]:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error',
        }, { status: 500 });
    }
}
