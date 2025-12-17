import { NextResponse, type NextRequest } from 'next/server';
import { getFirebaseClient } from '@/firebase/api-client';
import { Timestamp, collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { sendPushNotification, logError } from '@/lib/server-utils';
import {
    FrendzWebhookSchema,
    formatCurrencyBRL,
    objectFromHeaders,
    normalizeTrackingData,
    checkDuplicateTransaction,
    addProcessingHistory,
} from '@/lib/webhook-utils';

export async function POST(request: NextRequest) {
    let firestore: any;
    let webhookLogRef: any;

    try {
        const client = getFirebaseClient();
        firestore = client.firestore;
        const body = await request.json();

        // Log the raw webhook request immediately
        const webhookRequestData = {
            receivedAt: Timestamp.now(),
            source: 'Frendz',
            headers: objectFromHeaders(request.headers),
            body,
            processingStatus: 'pending',
        };
        webhookLogRef = await addDoc(collection(firestore, 'webhookRequests'), webhookRequestData);

        // ============ VALIDATE PAYLOAD ============
        const validationResult = FrendzWebhookSchema.safeParse(body);

        if (!validationResult.success) {
            const errorMessage = `Invalid webhook payload: ${validationResult.error.message}`;
            console.error('Frendz webhook validation failed:', validationResult.error);

            if (webhookLogRef) {
                await updateDoc(webhookLogRef, {
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
                await updateDoc(webhookLogRef, {
                    processingStatus: 'warning_missing_data',
                    message: 'Transaction ID or Status unknown',
                    validatedData
                });
            }
        }

        // ============ CHECK FOR DUPLICATES ============
        const duplicateCheck = await checkDuplicateTransaction(firestore, transactionId, 'Frendz');

        const vendasRef = collection(firestore, 'vendas');
        // Frendz sends amount in centavos
        const saleValue = validatedData.amount ? validatedData.amount / 100 : 0;
        const trackingData = normalizeTrackingData(validatedData.tracking, 'Frendz');

        // Get product info from cart if available
        const firstProduct = validatedData.cart?.[0];
        const productName = firstProduct?.title || null;

        if (duplicateCheck.exists && duplicateCheck.docId) {
            // Transaction already exists - UPDATE instead of creating duplicate
            console.log(`Duplicate transaction detected: ${transactionId}. Updating existing record.`);

            const existingDocRef = doc(firestore, 'vendas', duplicateCheck.docId);
            const existingDoc = await getDoc(existingDocRef);
            const existingData = existingDoc.data();

            const updatedData = {
                status: transactionStatus,
                updatedAt: Timestamp.now(),
                processingHistory: addProcessingHistory(
                    existingData?.processingHistory || [],
                    validatedData.event || 'transaction',
                    transactionStatus,
                    Timestamp.now()
                ),
                // Update payload with latest data
                payload: body,
            };

            await updateDoc(existingDocRef, updatedData);

            // Normalize status for notification check
            const normalizedStatus = normalizeStatus(transactionStatus);

            // Only send notification if status changed to paid/approved
            if (duplicateCheck.currentStatus !== 'approved' && normalizedStatus === 'approved') {
                await createNotificationAndPush(
                    firestore,
                    request,
                    validatedData.customer?.name || 'Cliente anônimo',
                    saleValue,
                    normalizedStatus
                );
            }

            if (webhookLogRef) {
                await updateDoc(webhookLogRef, {
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
            externalId: validatedData.offer_hash || null,
            status: normalizedStatus,
            rawStatus: transactionStatus,
            eventType: validatedData.event || 'transaction',
            customerName: validatedData.customer?.name || null,
            customerEmail: validatedData.customer?.email || null,
            customerPhone: validatedData.customer?.phone_number || null,
            customerDocument: validatedData.customer?.document || null,
            value: saleValue,
            paymentMethod: validatedData.payment_method || null,
            installments: validatedData.installments || 1,
            productName,
            cart: validatedData.cart || [],
            tracking: trackingData,
            created_at: Timestamp.now(), // For VendasBoard compatibility
            receivedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
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

        await addDoc(vendasRef, newSale);

        // ============ CREATE NOTIFICATION ============
        await createNotificationAndPush(
            firestore,
            request,
            newSale.customerName || 'Cliente anônimo',
            newSale.value,
            normalizedStatus
        );

        // Update webhook log to success
        if (webhookLogRef) {
            await updateDoc(webhookLogRef, {
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

        if (firestore) {
            await logError(firestore, error, 'webhook-frendz', {
                body: 'Could not read request body or process webhook.',
            });
        }

        if (webhookLogRef) {
            try {
                await updateDoc(webhookLogRef, {
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
 * Common Frendz statuses: paid, pending, refused, refunded, chargeback, waiting_payment
 */
function normalizeStatus(status: string): string {
    const statusLower = status.toLowerCase();

    // Map to our standard statuses
    if (['paid', 'approved', 'confirmed', 'completed'].includes(statusLower)) {
        return 'approved';
    }
    if (['pending', 'waiting_payment', 'processing', 'waiting'].includes(statusLower)) {
        return 'pending';
    }
    if (['refused', 'declined', 'failed', 'canceled', 'cancelled'].includes(statusLower)) {
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
    firestore: any,
    request: NextRequest,
    customerName: string,
    saleValue: number | null,
    transactionStatus: string
) {
    const notificacoesRef = collection(firestore, 'notificacoes');
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
            createdAt: Timestamp.now(),
            read: false,
            type: 'webhook_sale_frendz',
        };
        await addDoc(notificacoesRef, newNotification);

        const host = request.headers.get('host');
        const protocol = host?.startsWith('localhost') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;
        sendPushNotification(notificationTitle, notificationMessage, '/vendas', baseUrl);
    }
}
