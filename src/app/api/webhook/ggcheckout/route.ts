import { NextResponse, type NextRequest } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
  GGCheckoutWebhookSchema,
  formatCurrencyBRL,
  objectFromHeaders,
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
      source: 'GGCheckout',
      headers: objectFromHeaders(request.headers),
      body,
      processingStatus: 'pending',
    };
    webhookLogRef = await db.collection('organizations').doc(orgId).collection('webhook_logs').add(webhookRequestData);

    // ============ VALIDATE PAYLOAD ============
    const validationResult = GGCheckoutWebhookSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = `Invalid webhook payload: ${validationResult.error.message}`;
      console.error('GGCheckout webhook validation failed:', validationResult.error);

      const serializableErrors = JSON.parse(JSON.stringify(validationResult.error.errors));

      if (webhookLogRef) {
        await webhookLogRef.update({
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
    const vendasRef = db.collection('organizations').doc(orgId).collection('vendas');
    const duplicateQuery = await vendasRef
      .where('transactionId', '==', transactionId)
      .where('gateway', '==', 'GGCheckout')
      .limit(1)
      .get();

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

    if (!duplicateQuery.empty) {
      // Transaction already exists - UPDATE instead of creating duplicate
      const existingDoc = duplicateQuery.docs[0];
      const existingData = existingDoc.data();

      console.log(`Duplicate transaction detected: ${transactionId}. Updating existing record.`);

      await existingDoc.ref.update({
        status: transactionStatus,
        eventType,
        updatedAt: Timestamp.now(),
        processingHistory: FieldValue.arrayUnion({
          timestamp: Timestamp.now(),
          eventType,
          status: transactionStatus,
        }),
        payload: body,
      });

      // Send notification if payment was completed
      const isPaid = eventType === 'pix.paid' || eventType === 'card.paid' || transactionStatus === 'paid';
      if (existingData.status !== 'paid' && isPaid) {
        await createNotificationAndPush(
          db,
          messaging,
          orgId,
          validatedData.customer?.name || 'Cliente anônimo',
          saleValue,
          eventType,
          paymentMethod
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
      created_at: Timestamp.now(),
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

    await vendasRef.add(newSale);

    // ============ CREATE NOTIFICATION ============
    await createNotificationAndPush(
      db,
      messaging,
      orgId,
      newSale.customerName || 'Cliente anônimo',
      newSale.value,
      eventType,
      paymentMethod
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
        message: 'Webhook (GGCheckout) recebido com sucesso!',
        transactionId,
        action: 'created',
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar webhook.';
    console.error('Erro ao processar o webhook (GGCheckout):', errorMessage, error);

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
        message: 'Erro ao processar a requisição (GGCheckout).',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Helper function to create notification and send push
async function createNotificationAndPush(
  db: FirebaseFirestore.Firestore,
  messaging: any,
  orgId: string,
  customerName: string,
  saleValue: number | null,
  eventType: string,
  paymentMethod: string
) {
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
      title: notificationTitle,
      createdAt: Timestamp.now(),
      read: false,
      type: 'webhook_sale_ggcheckout',
    };
    await db.collection('organizations').doc(orgId).collection('notificacoes').add(newNotification);

    // Send push notification
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
