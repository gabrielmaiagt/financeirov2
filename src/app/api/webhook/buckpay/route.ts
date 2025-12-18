import { NextResponse, type NextRequest } from 'next/server';
import { getFirebaseClient } from '@/firebase/api-client';
import { Timestamp, collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { sendPushNotification, logError } from '@/lib/server-utils';
import {
  BuckpayWebhookSchema,
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
      source: 'Buckpay',
      headers: objectFromHeaders(request.headers),
      body,
      processingStatus: 'pending',
    };
    webhookLogRef = await addDoc(collection(firestore, 'webhookRequests'), webhookRequestData);

    // ============ VALIDATE PAYLOAD ============
    const validationResult = BuckpayWebhookSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = `Invalid webhook payload: ${validationResult.error.message}`;
      console.error('Buckpay webhook validation failed:', validationResult.error);

      // Serialize Zod errors to plain objects for Firestore
      const serializableErrors = JSON.parse(JSON.stringify(validationResult.error.errors));

      if (webhookLogRef) {
        await updateDoc(webhookLogRef, {
          processingStatus: 'validation_error',
          errorMessage,
          validationErrors: serializableErrors,
        });
      }

      return NextResponse.json(
        {
          message: 'Invalid payload structure',
          errors: serializableErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    const saleData = validatedData.data;
    const eventType = validatedData.event;
    const transactionStatus = saleData.status;
    const transactionId = saleData.id;

    // ============ CHECK FOR DUPLICATES ============
    const duplicateCheck = await checkDuplicateTransaction(firestore, transactionId, 'Buckpay');

    const vendasRef = collection(firestore, 'vendas');
    const saleValue = saleData.total_amount ? saleData.total_amount / 100 : null;
    const trackingData = normalizeTrackingData(saleData.tracking, 'Buckpay');

    if (duplicateCheck.exists && duplicateCheck.docId) {
      // Transaction already exists - UPDATE instead of creating duplicate
      console.log(`Duplicate transaction detected: ${transactionId}. Updating existing record.`);

      const existingDocRef = doc(firestore, 'vendas', duplicateCheck.docId);
      const existingDoc = await getDoc(existingDocRef);
      const existingData = existingDoc.data();

      const updatedData = {
        status: transactionStatus,
        eventType,
        updatedAt: Timestamp.now(),
        processingHistory: addProcessingHistory(
          existingData?.processingHistory || [],
          eventType,
          transactionStatus,
          Timestamp.now()
        ),
        // Update payload with latest data
        payload: body,
      };

      await updateDoc(existingDocRef, updatedData);

      // Only send notification if status changed to 'paid'
      if (
        duplicateCheck.currentStatus !== 'paid' &&
        eventType === 'transaction.processed' &&
        transactionStatus === 'paid'
      ) {
        await createNotificationAndPush(
          firestore,
          request,
          saleData.buyer?.name || 'Cliente anônimo',
          saleValue,
          eventType,
          transactionStatus
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
          message: 'Webhook (Buckpay) recebido e atualizado com sucesso!',
          transactionId,
          action: 'updated',
        },
        { status: 200 }
      );
    }

    // ============ CREATE NEW SALE ============
    const newSale = {
      transactionId,
      status: transactionStatus,
      eventType,
      customerName: saleData.buyer?.name || null,
      customerEmail: saleData.buyer?.email || null,
      customerPhone: saleData.buyer?.phone || null,
      customerDocument: saleData.buyer?.document || null,
      value: saleValue,
      netAmount: saleData.net_amount ? saleData.net_amount / 100 : null,
      paymentMethod: saleData.payment_method || null,
      offerName: saleData.offer?.name || null,
      offerPrice: saleData.offer?.discount_price || null,
      offerQuantity: saleData.offer?.quantity || null,
      tracking: trackingData, // Changed from trackingData to tracking
      created_at: Timestamp.now(), // For VendasBoard compatibility
      receivedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      payload: body,
      gateway: 'Buckpay',
      processingHistory: [
        {
          timestamp: Timestamp.now(),
          eventType,
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
      eventType,
      transactionStatus
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
        message: 'Webhook (Buckpay) recebido com sucesso!',
        transactionId,
        action: 'created',
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar webhook.';
    console.error('Erro ao processar o webhook (Buckpay):', errorMessage, error);

    if (firestore) {
      await logError(firestore, error, 'webhook-buckpay', {
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
        message: 'Erro ao processar a requisição (Buckpay).',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Helper function to create notification and send push
async function createNotificationAndPush(
  firestore: any,
  request: NextRequest,
  customerName: string,
  saleValue: number | null,
  eventType: string,
  transactionStatus: string
) {
  const notificacoesRef = collection(firestore, 'notificacoes');
  let notificationMessage: string | null = null;
  let notificationTitle: string | null = null;

  const formattedSaleValue = formatCurrencyBRL(saleValue);

  if (eventType === 'transaction.processed' && transactionStatus === 'paid') {
    notificationTitle = '💸 PIX Pago! (Buckpay)';
    notificationMessage = `Venda de ${formattedSaleValue} para ${customerName} confirmada!`;
  } else if (eventType === 'transaction.created' && transactionStatus === 'pending') {
    notificationTitle = '⏳ PIX Gerado (Buckpay)';
    notificationMessage = `PIX de ${formattedSaleValue} para ${customerName} aguardando pagamento.`;
  }

  if (notificationMessage && notificationTitle) {
    const newNotification = {
      message: notificationMessage,
      createdAt: Timestamp.now(),
      read: false,
      type: 'webhook_sale_buckpay',
    };
    await addDoc(notificacoesRef, newNotification);

    // Send push notification directly using Admin SDK
    try {
      console.log(`📲 Sending push notification: ${notificationTitle}`);

      const { initializeFirebase } = await import('@/firebase/server-admin');
      const adminServices = initializeFirebase();
      const adminFirestore = adminServices.firestore;
      const messaging = adminServices.messaging;

      // Get all FCM tokens
      const profilesSnapshot = await adminFirestore.collection('perfis').get();
      const tokens: string[] = [];

      profilesSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
          data.fcmTokens.forEach((token: string) => {
            if (token && !tokens.includes(token)) {
              tokens.push(token);
            }
          });
        }
      });

      if (tokens.length > 0) {
        const message: any = {
          tokens: tokens,
          // Remove 'notification' key to prevent automatic display by Firebase SDK
          // Service Worker will handle display via onBackgroundMessage using 'data'
          webpush: {
            fcmOptions: {
              link: '/vendas',
            },
            headers: {
              Urgency: 'high',
            },
          },
          data: {
            title: notificationTitle,
            body: notificationMessage,
            link: '/vendas',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
          }
        };

        const response = await messaging.sendEachForMulticast(message);
        console.log(`✅ Push sent: ${response.successCount} success, ${response.failureCount} failed`);
      } else {
        console.log('⚠️ No FCM tokens found');
      }
    } catch (pushError) {
      console.error('❌ Failed to send push notification:', pushError);
    }
  }
}
