import { initializeFirebase } from '@/firebase/server-admin';
import { UnifiedSale, GatewayAdapter } from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { formatCurrencyBRL } from '@/lib/webhook-utils';

interface ProcessResult {
    success: boolean;
    message: string;
    saleId?: string;
    action?: 'created' | 'updated' | 'ignored';
    error?: string;
}

export class WebhookProcessor {
    private db: any;
    private messaging: any;

    constructor() {
        const { firestore, messaging } = initializeFirebase();
        this.db = firestore;
        this.messaging = messaging;
    }

    async process(
        gatewaySlug: string,
        orgSecret: string,
        adapter: GatewayAdapter,
        payload: any,
        headers: any
    ): Promise<ProcessResult> {
        try {
            // 1. Resolve Organization
            const orgId = await this.resolveOrganization(orgSecret);
            if (!orgId) {
                return { success: false, message: 'Invalid Organization Secret', error: 'Unauthorized' };
            }

            // 2. Normalize Data
            const sale = adapter.normalize(payload);

            // 3. Log Request (Scoped to Org)
            await this.logRequest(orgId, gatewaySlug, payload, headers, sale.externalId);

            // 4. Check Duplicate / Idempotency
            const existingSale = await this.findExistingSale(orgId, gatewaySlug, sale.externalId);

            if (existingSale) {
                // Update existing
                await this.updateSale(orgId, existingSale.id, sale);

                // Notify if status changed to paid
                if (existingSale.status !== 'paid' && sale.status === 'paid') {
                    await this.sendNotification(orgId, sale, 'paid');
                }

                return { success: true, message: 'Sale updated', saleId: existingSale.id, action: 'updated' };
            } else {
                // Create new
                const newId = await this.createSale(orgId, sale);

                // Notify
                if (sale.status === 'paid') {
                    await this.sendNotification(orgId, sale, 'paid');
                } else if (sale.status === 'pending') {
                    await this.sendNotification(orgId, sale, 'created');
                }

                return { success: true, message: 'Sale created', saleId: newId, action: 'created' };
            }

        } catch (error: any) {
            console.error(`Webhook Processing Error (${gatewaySlug}):`, error);
            return { success: false, message: 'Internal Processing Error', error: error.message };
        }
    }

    private async resolveOrganization(secret: string): Promise<string | null> {
        // Determine if secret is "legacy" (global hardcoded) or dynamic
        // Implementation Plan Phase 3 will add webhookSecret field.
        // Ideally we query: collection('organizations').where('webhookSecret', '==', secret).limit(1)

        // For now, if we haven't migrated data, we might not find any. 
        // But we are building the "future" state.

        const orgsRef = this.db.collection('organizations');
        const snapshot = await orgsRef.where('webhookSecret', '==', secret).limit(1).get();

        if (!snapshot.empty) {
            return snapshot.docs[0].id;
        }
        return null;
    }

    private async logRequest(orgId: string, gateway: string, body: any, headers: any, externalId: string) {
        // Log to organizations/{orgId}/webhook_logs
        try {
            await this.db.collection('organizations').doc(orgId).collection('webhook_logs').add({
                gateway,
                receivedAt: Timestamp.now(),
                externalId,
                headers,
                body,
                processed: true
            });
        } catch (e) {
            console.error('Failed to log webhook', e);
        }
    }

    private async findExistingSale(orgId: string, gateway: string, externalId: string) {
        const salesRef = this.db.collection('organizations').doc(orgId).collection('sales');
        const q = salesRef.where('gateway', '==', gateway).where('externalId', '==', externalId).limit(1);
        const snap = await q.get();
        if (!snap.empty) {
            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    }

    private async createSale(orgId: string, sale: UnifiedSale): Promise<string> {
        const docRef = this.db.collection('organizations').doc(orgId).collection('sales').doc(); // Auto ID

        const saleData = {
            ...sale,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            history: [{
                status: sale.status,
                timestamp: Timestamp.now()
            }]
        };

        await docRef.set(saleData);
        return docRef.id;
    }

    private async updateSale(orgId: string, saleId: string, sale: UnifiedSale) {
        const docRef = this.db.collection('organizations').doc(orgId).collection('sales').doc(saleId);

        await docRef.update({
            status: sale.status,
            amount: sale.amount,
            updatedAt: Timestamp.now(),
            // We could merge other fields like customer if they changed
            history: FieldValue.arrayUnion({
                status: sale.status,
                timestamp: Timestamp.now()
            })
        });
    }

    private async sendNotification(orgId: string, sale: UnifiedSale, type: 'paid' | 'created') {
        const title = type === 'paid' ? `💸 PIX Pago (${sale.gateway})` : `⏳ PIX Gerado (${sale.gateway})`;
        const message = type === 'paid'
            ? `Venda de ${formatCurrencyBRL(sale.amount)} confirmada!`
            : `PIX de ${formatCurrencyBRL(sale.amount)} aguardando pagamento.`;

        // 1. Save to DB
        await this.db.collection('organizations').doc(orgId).collection('notifications').add({
            title,
            message,
            type: type === 'paid' ? 'sale_paid' : 'sale_created',
            saleId: sale.externalId,
            read: false,
            createdAt: Timestamp.now()
        });

        // 2. Send Push
        // Fetch users of this org? Or just send to topic based on orgId?
        // Current implementation fetches tokens from `perfis` (profiles).
        // We need to find profiles belonging to this org.
        // Assuming 'perfis' has 'orgId' field OR 'organizations/{orgId}/members' has mapping.
        // The current architecture uses global 'perfis' collection but with 'orgId' field now? 
        // UserManagement uses 'organizations/{orgId}/users'.
        // Wait, UserManagement.tsx uses `collection(firestore, 'organizations', orgId, 'users')`.
        // MemberList.tsx uses `organizations/{orgId}/members` (invitations?).
        // The `perfis` collection seems to be the main user profile store with FCM tokens.
        // We should query 'perfis' where 'orgId' == orgId? Or iterate users?

        // Let's assume 'perfis' has orgId as per recent migrations.
        // Or we iterate `organizations/{orgId}/users` (auth users) and find their corresponding profiles?
        // Simpler: Query 'perfis' where 'orgId' == orgId (if that field exists). 
        // Looking at `ProfilesBoard.tsx`, it uses `useOrganization`... 
        // It queries `perfis` with `where('orgId', '==', orgId)`. 
        // YES.

        try {
            const profilesRef = this.db.collection('perfis');
            const snap = await profilesRef.where('orgId', '==', orgId).get();

            const tokens: string[] = [];
            snap.forEach((doc: any) => {
                const data = doc.data();
                if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                    tokens.push(...data.fcmTokens);
                }
            });

            if (tokens.length > 0) {
                const payload = {
                    tokens: tokens, // clean duplicates?
                    webpush: {
                        fcmOptions: { link: '/vendas' },
                        headers: { Urgency: 'high' }
                    },
                    data: {
                        title,
                        body: message,
                        link: '/vendas',
                        icon: '/icon-192x192.png'
                    }
                };
                // Clean dupes
                payload.tokens = [...new Set(tokens)];
                await this.messaging.sendEachForMulticast(payload);
            }
        } catch (e) {
            console.error('Push error', e);
        }
    }
}
