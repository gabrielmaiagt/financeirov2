import { NextResponse, type NextRequest } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
  BuckpayWebhookSchema,
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
      source: 'Buckpay',
      headers: objectFromHeaders(request.headers),
      body,
      processingStatus: 'pending',
    };
    webhookLogRef = await db.collection('organizations').doc(orgId).collection('webhook_logs').add(webhookRequestData);

    // ============ VALIDATE PAYLOAD ============
    const validationResult = BuckpayWebhookSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = `Invalid webhook payload: ${validationResult.error.message}`;
      console.error('Buckpay webhook validation failed:', validationResult.error);

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
    const saleData = validatedData.data;
    const eventType = validatedData.event;
    const transactionStatus = saleData.status;
    const transactionId = saleData.id;

    // ============ CHECK FOR DUPLICATES ============
    const vendasRef = db.collection('organizations').doc(orgId).collection('vendas');
    const duplicateQuery = await vendasRef
      .where('transactionId', '==', transactionId)
      .where('gateway', '==', 'Buckpay')
      .limit(1)
      .get();

    const saleValue = saleData.total_amount ? saleData.total_amount / 100 : null;
    const trackingData = normalizeTrackingData(saleData.tracking, 'Buckpay');

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

      // Only send notification if status changed to 'paid'
      if (
        existingData.status !== 'paid' &&
        eventType === 'transaction.processed' &&
        transactionStatus === 'paid'
      ) {
        await createNotificationAndPush(
          db,
          messaging,
          orgId,
          saleData.buyer?.name || 'Cliente anônimo',
          saleValue,
          eventType,
          transactionStatus
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
      tracking: trackingData,
      created_at: Timestamp.now(),
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

    await vendasRef.add(newSale);

    // ============ CREATE NOTIFICATION ============
    await createNotificationAndPush(
      db,
      messaging,
      orgId,
      newSale.customerName || 'Cliente anônimo',
      newSale.value,
      eventType,
      transactionStatus
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
        message: 'Webhook (Buckpay) recebido com sucesso!',
        transactionId,
        action: 'created',
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar webhook.';
    console.error('Erro ao processar o webhook (Buckpay):', errorMessage, error);

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
        message: 'Erro ao processar a requisição (Buckpay).',
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
  transactionStatus: string
) {
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
      title: notificationTitle,
      createdAt: Timestamp.now(),
      read: false,
      type: 'webhook_sale_buckpay',
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
        const message = {
          tokens: [...new Set(tokens)],
          webpush: {
            fcmOptions: { link: '/vendas' },
            headers: { Urgency: 'high' },
          },
          data: {
            title: notificationTitle,
            body: notificationMessage,
            link: '/vendas',
            icon: '/icon-192x192.png',
          }
        };

        const response = await messaging.sendEachForMulticast(message);
        console.log(`✅ Push sent: ${response.successCount} success, ${response.failureCount} failed`);
      }
    } catch (pushError) {
      console.error('❌ Failed to send push notification:', pushError);
    }
  }
}
