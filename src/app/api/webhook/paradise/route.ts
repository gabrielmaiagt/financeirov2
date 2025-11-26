import { NextResponse, type NextRequest } from 'next/server';
import { getFirebaseClient } from '@/firebase/api-client';
import { Timestamp, collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { sendPushNotification, logError } from '@/lib/server-utils';
import {
  ParadiseWebhookSchema,
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
      source: 'Paradise',
      headers: objectFromHeaders(request.headers),
      body,
      processingStatus: 'pending',
    };
    webhookLogRef = await addDoc(collection(firestore, 'webhookRequests'), webhookRequestData);

    // ============ VALIDATE PAYLOAD ============
    const validationResult = ParadiseWebhookSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = `Invalid webhook payload: ${validationResult.error.message}`;
      console.error('Paradise webhook validation failed:', validationResult.error);

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
    const transactionId = validatedData.transaction_id;
    const transactionStatus = validatedData.status;

    // ============ CHECK FOR DUPLICATES ============
    const duplicateCheck = await checkDuplicateTransaction(firestore, transactionId, 'Paradise');

    const vendasRef = collection(firestore, 'vendas');
    const saleValue = validatedData.amount ? validatedData.amount / 100 : null;
    const trackingData = normalizeTrackingData(validatedData.tracking, 'Paradise');

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
          validatedData.webhook_type || 'transaction',
          transactionStatus,
          Timestamp.now()
        ),
        // Update payload with latest data
        payload: body,
      };

      await updateDoc(existingDocRef, updatedData);

      // Only send notification if status changed to 'approved'
      if (duplicateCheck.currentStatus !== 'approved' && transactionStatus === 'approved') {
        await createNotificationAndPush(
          firestore,
          request,
          validatedData.customer?.name || 'Cliente anônimo',
          saleValue,
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
          message: 'Webhook (Paradise) recebido e atualizado com sucesso!',
          transactionId,
          action: 'updated',
        },
        { status: 200 }
      );
    }

    // ============ CREATE NEW SALE ============
    const newSale = {
      transactionId,
      externalId: validatedData.external_id || null,
      status: transactionStatus,
      eventType: validatedData.webhook_type || 'transaction',
      customerName: validatedData.customer?.name || null,
      customerEmail: validatedData.customer?.email || null,
      customerPhone: validatedData.customer?.phone || null,
      customerDocument: validatedData.customer?.document || null,
      value: saleValue,
      paymentMethod: validatedData.payment_method || null,
      rawStatus: validatedData.raw_status || null,
      tracking: trackingData,
      created_at: Timestamp.now(), // For VendasBoard compatibility
      receivedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      payload: body,
      gateway: 'Paradise',
      processingHistory: [
        {
          timestamp: Timestamp.now(),
          eventType: validatedData.webhook_type || 'transaction',
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
        message: 'Webhook (Paradise) recebido com sucesso!',
        transactionId,
        action: 'created',
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar webhook.';
    console.error('Erro ao processar o webhook (Paradise):', errorMessage, error);

    if (firestore) {
      await logError(firestore, error, 'webhook-paradise', {
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
        message: 'Erro ao processar a requisição (Paradise).',
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
  transactionStatus: string
) {
  const notificacoesRef = collection(firestore, 'notificacoes');
  let notificationMessage: string | null = null;
  let notificationTitle: string | null = null;

  const formattedSaleValue = formatCurrencyBRL(saleValue);

  if (transactionStatus === 'approved') {
    notificationTitle = '💸 PIX Pago! (Paradise)';
    notificationMessage = `Venda de ${formattedSaleValue} para ${customerName} confirmada!`;
  } else if (transactionStatus === 'pending') {
    notificationTitle = '⏳ PIX Gerado (Paradise)';
    notificationMessage = `PIX de ${formattedSaleValue} para ${customerName} aguardando pagamento.`;
  }

  if (notificationMessage && notificationTitle) {
    const newNotification = {
      message: notificationMessage,
      createdAt: Timestamp.now(),
      read: false,
      type: 'webhook_sale_paradise',
    };
    await addDoc(notificacoesRef, newNotification);

    const host = request.headers.get('host');
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    sendPushNotification(notificationTitle, notificationMessage, '/vendas', baseUrl);
  }
}
