import { NextResponse, type NextRequest } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
    FrendzWebhookSchema,
    formatCurrencyBRL,
    objectFromHeaders,
    normalizeTrackingData,
} from '@/lib/webhook-utils';

export async function POST(request: NextRequest) {
    let db: FirebaseFirestore.Firestore;
    let webhookLogRef: FirebaseFirestore.DocumentReference | null = null;

    try {
        const { firestore, messaging } = initializeFirebase();
        db = firestore;
        const body = await request.json();

        const orgId = request.nextUrl.searchParams.get('orgId') || 'interno-fluxo';

        // Log the raw webhook request immediately (scoped to organization)
        const webhookRequestData = {
            receivedAt: Timestamp.now(),
            source: 'Frendz',
            headers: objectFromHeaders(request.headers),
            body,
            processingStatus: 'pending',
        };
        webhookLogRef = await db.collection('organizations').doc(orgId).collection('webhook_logs').add(webhookRequestData);

        // ============ VALIDATE PAYLOAD ============
        const validationResult = FrendzWebhookSchema.safeParse(body);

        if (!validationResult.success) {
            const errorMessage = `Invalid webhook payload: ${validationResult.error.message}`;
            console.error('Frendz webhook validation failed:', validationResult.error);

            if (webhookLogRef) {
                await webhookLogRef.update({
                    processingStatus: 'validation_error',
                    errorMessage,
                    validationErrors: JSON.parse(JSON.stringify(validationResult.error.errors)),
                });
            }

            return NextResponse.json(
                {
                    message: 'Invalid payload structure',
                    errors: validationResult.error.errors,
                },
                { status: 400 }
            );
        }

        const validatedData = validationResult.data;
        const transactionId = validatedData.transaction_id;
        const transactionStatus = validatedData.status;

        // Log warning if critical data is missing
        if (transactionId === 'unknown_id' || transactionStatus === 'unknown') {
            console.warn('Frendz webhook received with missing critical data:', validatedData);
            if (webhookLogRef) {
                await webhookLogRef.update({
                    processingStatus: 'warning_missing_data',
                    message: 'Transaction ID or Status unknown',
                    validatedData
                });
            }
        }

        // ============ CHECK FOR DUPLICATES ============
        const vendasRef = db.collection('organizations').doc(orgId).collection('vendas');
        const duplicateQuery = await vendasRef
            .where('transactionId', '==', transactionId)
            .where('gateway', '==', 'Frendz')
            .limit(1)
            .get();

        // Frendz sends amount in centavos
        const saleValue = validatedData.amount ? validatedData.amount / 100 : 0;
        const trackingData = normalizeTrackingData(validatedData.tracking, 'Frendz');

        // Get product info from offer or cart if available
        const productName = validatedData.offer?.title || validatedData.cart?.[0]?.title || null;

        if (!duplicateQuery.empty) {
            // Transaction already exists - UPDATE instead of creating duplicate
            const existingDoc = duplicateQuery.docs[0];
            const existingData = existingDoc.data();

            console.log(`Duplicate transaction detected: ${transactionId}. Updating existing record.`);

            await existingDoc.ref.update({
                status: normalizeStatus(transactionStatus),
                rawStatus: transactionStatus,
                updatedAt: Timestamp.now(),
                processingHistory: FieldValue.arrayUnion({
                    timestamp: Timestamp.now(),
                    eventType: validatedData.event || 'transaction',
                    status: transactionStatus,
                }),
                payload: body,
            });

            // Normalize status for notification check
            const normalizedStatus = normalizeStatus(transactionStatus);

            // Only send notification if status changed to paid/approved
            if (existingData.status !== 'approved' && normalizedStatus === 'approved') {
                await createNotificationAndPush(
                    db,
                    messaging,
                    orgId,
                    validatedData.customer?.name || 'Cliente anônimo',
                    saleValue,
                    normalizedStatus
                );
            }

            if (webhookLogRef) {
                await webhookLogRef.update({
                    processingStatus: 'success_updated',
                    message: 'Duplicate transaction updated',
                });
            }

            return NextResponse.json(
                {
                    message: 'Webhook (Frendz) recebido e atualizado com sucesso!',
                    transactionId,
                    action: 'updated',
                },
                { status: 200 }
            );
        }

        // ============ CREATE NEW SALE ============
        const normalizedStatus = normalizeStatus(transactionStatus);

        const newSale = {
            transactionId,
            externalId: validatedData.offer?.hash || validatedData.offer_hash || null,
            status: normalizedStatus,
            rawStatus: transactionStatus,
            eventType: validatedData.event || 'transaction',
            // Customer info
            customerId: validatedData.customer?.id || null,
            customerName: validatedData.customer?.name || null,
            customerEmail: validatedData.customer?.email || null,
            customerPhone: validatedData.customer?.phone || validatedData.customer?.phone_number || null,
            customerDocument: validatedData.customer?.document || null,
            // Affiliate info (if present)
            affiliateId: validatedData.affiliate?.id || null,
            affiliateName: validatedData.affiliate?.name || null,
            affiliateEmail: validatedData.affiliate?.email || null,
            // Payment info
            value: saleValue,
            netValue: validatedData.transaction?.net_amount ? validatedData.transaction.net_amount / 100 : null,
            paymentMethod: validatedData.transaction?.method || validatedData.payment_method || validatedData.method || null,
            installments: validatedData.installments || 1,
            // Product info
            productName,
            cart: validatedData.cart || [],
            // Tracking and Meta pixels
            tracking: trackingData,
            ip: validatedData.ip || null,
            fbp: validatedData.fbp || null,
            fbc: validatedData.fbc || null,
            // URLs
            checkoutUrl: validatedData.transaction?.checkout_url || validatedData.checkout_url || null,
            // Timestamps
            created_at: Timestamp.now(),
            receivedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            paidAt: validatedData.paid_at || null,
            refundAt: validatedData.refund_at || null,
            // Raw data
            payload: body,
            gateway: 'Frendz',
            processingHistory: [
                {
                    timestamp: Timestamp.now(),
                    eventType: validatedData.event || 'transaction',
                    status: transactionStatus,
                },
            ],
        };

        await vendasRef.add(newSale);

        // ============ CREATE NOTIFICATION ============
        await createNotificationAndPush(
            db,
            messaging,
            orgId,
            newSale.customerName || 'Cliente anônimo',
            newSale.value,
            normalizedStatus
        );

        // Update webhook log to success
        if (webhookLogRef) {
            await webhookLogRef.update({
                processingStatus: 'success',
                transactionId,
            });
        }

        return NextResponse.json(
            {
                message: 'Webhook (Frendz) recebido com sucesso!',
                transactionId,
                action: 'created',
            },
            { status: 200 }
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar webhook.';
        console.error('Erro ao processar o webhook (Frendz):', errorMessage, error);

        if (webhookLogRef) {
            try {
                await webhookLogRef.update({
                    processingStatus: 'error',
                    errorMessage: errorMessage,
                });
            } catch (logUpdateError) {
                console.error('Failed to update webhook log to error status:', logUpdateError);
            }
        }

        return NextResponse.json(
            {
                message: 'Erro ao processar a requisição (Frendz).',
                error: errorMessage,
            },
            { status: 500 }
        );
    }
}

/**
 * Normalize Frendz status to our internal status format
 * Frendz statuses: processing, authorized, paid, refunded, waiting_payment, refused, antifraud, chargeback, cancelled
 */
function normalizeStatus(status: string): string {
    const statusLower = status.toLowerCase();

    // Map to our standard statuses
    if (['paid', 'approved', 'confirmed', 'completed', 'authorized'].includes(statusLower)) {
        return 'approved';
    }
    if (['pending', 'waiting_payment', 'processing', 'waiting'].includes(statusLower)) {
        return 'pending';
    }
    if (['refused', 'declined', 'failed', 'canceled', 'cancelled', 'antifraud'].includes(statusLower)) {
        return 'refused';
    }
    if (['refunded', 'refund'].includes(statusLower)) {
        return 'refunded';
    }
    if (['chargeback', 'chargedback', 'dispute'].includes(statusLower)) {
        return 'chargeback';
    }

    return status; // Return original if not matched
}

// Helper function to create notification and send push
async function createNotificationAndPush(
    db: FirebaseFirestore.Firestore,
    messaging: any,
    orgId: string,
    customerName: string,
    saleValue: number | null,
    transactionStatus: string
) {
    let notificationMessage: string | null = null;
    let notificationTitle: string | null = null;

    const formattedSaleValue = formatCurrencyBRL(saleValue);

    if (transactionStatus === 'approved') {
        notificationTitle = '💸 Pagamento Confirmado! (Frendz)';
        notificationMessage = `Venda de ${formattedSaleValue} para ${customerName} confirmada!`;
    } else if (transactionStatus === 'pending') {
        notificationTitle = '⏳ Pagamento Pendente (Frendz)';
        notificationMessage = `Pagamento de ${formattedSaleValue} para ${customerName} aguardando confirmação.`;
    } else if (transactionStatus === 'refunded') {
        notificationTitle = '🔄 Reembolso Processado (Frendz)';
        notificationMessage = `Reembolso de ${formattedSaleValue} para ${customerName} processado.`;
    }

    if (notificationMessage && notificationTitle) {
        const newNotification = {
            message: notificationMessage,
            title: notificationTitle,
            createdAt: Timestamp.now(),
            read: false,
            type: 'webhook_sale_frendz',
        };
        await db.collection('organizations').doc(orgId).collection('notificacoes').add(newNotification);

        // Send push notifications to all users in the org
        try {
            const profilesSnapshot = await db.collection('organizations').doc(orgId).collection('perfis').get();
            const tokens: string[] = [];
            profilesSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                    tokens.push(...data.fcmTokens);
                }
            });

            if (tokens.length > 0) {
                const messagePayload = {
                    tokens: [...new Set(tokens)],
                    webpush: { fcmOptions: { link: '/vendas' } },
                    data: { title: notificationTitle, body: notificationMessage, link: '/vendas', icon: '/icon-192x192.png' }
                };
                await messaging.sendEachForMulticast(messagePayload);
            }
        } catch (pushErr) {
            console.error('Failed to send push notifications:', pushErr);
        }
    }
}
