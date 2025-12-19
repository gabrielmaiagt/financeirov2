import { NextResponse, type NextRequest } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
  ParadiseWebhookSchema,
  formatCurrencyBRL,
  objectFromHeaders,
  normalizeTrackingData,
} from '@/lib/webhook-utils';
import { sendTemplatedNotification } from '@/lib/notification-utils';

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
      source: 'Paradise',
      headers: objectFromHeaders(request.headers),
      body,
      processingStatus: 'pending',
    };
    webhookLogRef = await db.collection('organizations').doc(orgId).collection('webhook_logs').add(webhookRequestData);

    // ============ VALIDATE PAYLOAD ============
    const validationResult = ParadiseWebhookSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = `Invalid webhook payload: ${validationResult.error.message}`;
      console.error('Paradise webhook validation failed:', validationResult.error);

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
      console.warn('Paradise webhook received with missing critical data:', validatedData);
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
      .where('gateway', '==', 'Paradise')
      .limit(1)
      .get();

    // Paradise sends amount in cents
    const saleValue = validatedData.amount ? validatedData.amount / 100 : 0;
    const trackingData = normalizeTrackingData(validatedData.tracking, 'Paradise');

    if (!duplicateQuery.empty) {
      // Transaction already exists - UPDATE instead of creating duplicate
      const existingDoc = duplicateQuery.docs[0];
      const existingData = existingDoc.data();

      console.log(`Duplicate transaction detected: ${transactionId}. Updating existing record.`);

      await existingDoc.ref.update({
        status: transactionStatus,
        updatedAt: Timestamp.now(),
        processingHistory: FieldValue.arrayUnion({
          timestamp: Timestamp.now(),
          eventType: validatedData.webhook_type || 'transaction',
          status: transactionStatus,
        }),
        payload: body,
      });

      // Only send notification if status changed to 'approved'
      if (existingData.status !== 'approved' && transactionStatus === 'approved') {
        let notifType: 'sale_approved' | 'sale_pending' | null = null;
        if (transactionStatus === 'approved') notifType = 'sale_approved';

        if (notifType) {
          await sendTemplatedNotification(
            db,
            messaging,
            orgId,
            notifType,
            {
              customerName: validatedData.customer?.name || 'Cliente anônimo',
              value: saleValue,
              gateway: 'Paradise'
            }
          );
        }
      }

      if (webhookLogRef) {
        await webhookLogRef.update({
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
      created_at: Timestamp.now(),
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

    await vendasRef.add(newSale);

    // ============ CREATE NOTIFICATION ============
    // ============ CREATE NOTIFICATION ============
    let notifType: 'sale_approved' | 'sale_pending' | null = null;
    if (transactionStatus === 'approved') notifType = 'sale_approved';
    else if (transactionStatus === 'pending') notifType = 'sale_pending';

    if (notifType) {
      await sendTemplatedNotification(
        db,
        messaging,
        orgId,
        notifType,
        {
          customerName: newSale.customerName || 'Cliente anônimo',
          value: newSale.value,
          gateway: 'Paradise'
        }
      );
    }

    // Update webhook log to success
    if (webhookLogRef) {
      await webhookLogRef.update({
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
        message: 'Erro ao processar a requisição (Paradise).',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Helper function removed - replaced by sendTemplatedNotification

