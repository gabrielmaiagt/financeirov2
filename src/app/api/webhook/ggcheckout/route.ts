import { NextResponse, type NextRequest } from 'next/server';
import { getFirebaseClient } from '@/firebase/api-client';
import { Timestamp, collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { sendPushNotification, logError } from '@/lib/server-utils';
import {
  GGCheckoutWebhookSchema,
  formatCurrencyBRL,
  objectFromHeaders,
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
      source: 'GGCheckout',
      headers: objectFromHeaders(request.headers),
      body,
      processingStatus: 'pending',
    };
    webhookLogRef = await addDoc(collection(firestore, 'webhookRequests'), webhookRequestData);

    // ============ VALIDATE PAYLOAD ============
    const validationResult = GGCheckoutWebhookSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = `Invalid webhook payload: ${validationResult.error.message}`;
      console.error('GGCheckout webhook validation failed:', validationResult.error);

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
    const eventType = validatedData.event;
    const transactionId = validatedData.payment.id;
    const transactionStatus = validatedData.payment.status || 'unknown';
    const paymentMethod = validatedData.payment.method || 'unknown';

    // ============ CHECK FOR DUPLICATES ============
    const duplicateCheck = await checkDuplicateTransaction(firestore, transactionId, 'GGCheckout');

    const vendasRef = collection(firestore, 'vendas');
    const saleValue = validatedData.payment.amount ? validatedData.payment.amount / 100 : null;

    // Extract tracking data from payload root
    const trackingData = {
      utm_source: validatedData.utm_source || null,
      utm_medium: validatedData.utm_medium || null,
      utm_campaign: validatedData.utm_campaign || null,
      utm_content: validatedData.utm_content || null,
      utm_term: validatedData.utm_term || null,
      src: validatedData.src || null,
      sck: validatedData.sck || null,
    };

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

      // Send notification if payment was completed
      const isPaid = eventType === 'pix.paid' || eventType === 'card.paid' || transactionStatus === 'paid';
      if (duplicateCheck.currentStatus !== 'paid' && isPaid) {
        await createNotificationAndPush(
          firestore,
          request,
          validatedData.customer?.name || 'Cliente anônimo',
          saleValue,
          eventType,
          paymentMethod
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
          message: 'Webhook (GGCheckout) recebido e atualizado com sucesso!',
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
      customerName: validatedData.customer?.name || null,
      customerEmail: validatedData.customer?.email || null,
      customerPhone: validatedData.customer?.phone || null,
      customerDocument: validatedData.customer?.document || null,
      customerIp: validatedData.customerIp || validatedData.customer?.ip || null,
      value: saleValue,
      paymentMethod,
      productName: validatedData.product?.name || null,
      productId: validatedData.product?.id || null,
      productPrice: validatedData.product?.price || null,
      productQuantity: validatedData.product?.quantity || null,
      products: validatedData.products || [],
      tracking: trackingData,
      created_at: Timestamp.now(), // For VendasBoard compatibility
      receivedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      payload: body,
      gateway: 'GGCheckout',
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
      paymentMethod
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
        message: 'Webhook (GGCheckout) recebido com sucesso!',
        transactionId,
        action: 'created',
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar webhook.';
    console.error('Erro ao processar o webhook (GGCheckout):', errorMessage, error);

    if (firestore) {
      await logError(firestore, error, 'webhook-ggcheckout', {
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
        message: 'Erro ao processar a requisição (GGCheckout).',
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
  paymentMethod: string
) {
  const notificacoesRef = collection(firestore, 'notificacoes');
  let notificationMessage: string | null = null;
  let notificationTitle: string | null = null;

  const formattedSaleValue = formatCurrencyBRL(saleValue);
  const methodEmoji = paymentMethod === 'pix' ? '💸' : '💳';
  const methodName = paymentMethod === 'pix' ? 'PIX' : 'Cartão';

  // Determine notification based on event type
  if (eventType === 'pix.paid' || eventType === 'card.paid') {
    notificationTitle = `${methodEmoji} ${methodName} Pago! (GGCheckout)`;
    notificationMessage = `Venda de ${formattedSaleValue} para ${customerName} confirmada!`;
  } else if (eventType === 'pix.generated') {
    notificationTitle = '⏳ PIX Gerado (GGCheckout)';
    notificationMessage = `PIX de ${formattedSaleValue} para ${customerName} aguardando pagamento.`;
  } else if (eventType.includes('pending') || eventType.includes('created')) {
    notificationTitle = '⏳ Pagamento Pendente (GGCheckout)';
    notificationMessage = `Pagamento de ${formattedSaleValue} para ${customerName} aguardando confirmação.`;
  }

  if (notificationMessage && notificationTitle) {
    const newNotification = {
      message: notificationMessage,
      createdAt: Timestamp.now(),
      read: false,
      type: 'webhook_sale_ggcheckout',
    };
    await addDoc(notificacoesRef, newNotification);

    const host = request.headers.get('host');
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    sendPushNotification(notificationTitle, notificationMessage, '/vendas', baseUrl);
  }
}
