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

      if (webhookLogRef) {
        await updateDoc(webhookLogRef, {
          processingStatus: 'validation_error',
          errorMessage,
          validationErrors: validationResult.error.errors,
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
      trackingData,
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

    const host = request.headers.get('host');
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    sendPushNotification(notificationTitle, notificationMessage, '/vendas', baseUrl);
  }
}
