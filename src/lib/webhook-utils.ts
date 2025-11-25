// Webhook validation schemas and utility functions
import { z } from 'zod';

// ============ BUCKPAY SCHEMAS ============

export const BuckpayBuyerSchema = z.object({
    name: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    document: z.string().optional().nullable(),
});

export const BuckpayOfferSchema = z.object({
    name: z.string().optional().nullable(),
    discount_price: z.number().optional().nullable(),
    quantity: z.number().optional().nullable(),
});

export const BuckpayTrackingSchema = z.object({
    ref: z.string().optional().nullable(),
    src: z.string().optional().nullable(),
    sck: z.string().optional().nullable(),
    utm: z.object({
        source: z.string().optional().nullable(),
        medium: z.string().optional().nullable(),
        campaign: z.string().optional().nullable(),
        id: z.string().optional().nullable(),
        term: z.string().optional().nullable(),
        content: z.string().optional().nullable(),
    }).optional().nullable(),
});

export const BuckpayDataSchema = z.object({
    id: z.string(),
    status: z.string(),
    payment_method: z.string().optional().nullable(),
    total_amount: z.number().optional().nullable(),
    net_amount: z.number().optional().nullable(),
    offer: BuckpayOfferSchema.optional().nullable(),
    buyer: BuckpayBuyerSchema.optional().nullable(),
    tracking: BuckpayTrackingSchema.optional().nullable(),
    created_at: z.string().optional().nullable(),
});

export const BuckpayWebhookSchema = z.object({
    event: z.string(),
    data: BuckpayDataSchema,
});

export type BuckpayWebhook = z.infer<typeof BuckpayWebhookSchema>;

// ============ PARADISE SCHEMAS ============

export const ParadiseCustomerSchema = z.object({
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    document: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
});

export const ParadiseTrackingSchema = z.object({
    utm_source: z.string().optional().nullable(),
    utm_campaign: z.string().optional().nullable(),
    utm_medium: z.string().optional().nullable(),
    utm_content: z.string().optional().nullable(),
    utm_term: z.string().optional().nullable(),
    src: z.string().optional().nullable(),
    sck: z.string().optional().nullable(),
});

export const ParadiseWebhookSchema = z.object({
    transaction_id: z.string(),
    external_id: z.string().optional().nullable(),
    status: z.string(),
    amount: z.number().optional().nullable(),
    payment_method: z.string().optional().nullable(),
    customer: ParadiseCustomerSchema.optional().nullable(),
    raw_status: z.string().optional().nullable(),
    webhook_type: z.string().optional().nullable(),
    timestamp: z.string().optional().nullable(),
    tracking: ParadiseTrackingSchema.optional().nullable(),
});

export type ParadiseWebhook = z.infer<typeof ParadiseWebhookSchema>;

// ============ GGCHECKOUT SCHEMAS ============
// Based on official documentation from https://www.ggcheckout.com/faq/integracoes

export const GGCheckoutCustomerSchema = z.object({
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    document: z.string().optional().nullable(),
    ip: z.string().optional().nullable(),
});

export const GGCheckoutProductSchema = z.object({
    id: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    price: z.number().optional().nullable(),
    quantity: z.number().optional().nullable(),
});

export const GGCheckoutPaymentSchema = z.object({
    id: z.string(),
    method: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    amount: z.number().optional().nullable(),
});

export const GGCheckoutWebhookSchema = z.object({
    event: z.string(),
    createdAt: z.string().optional().nullable(),
    customer: GGCheckoutCustomerSchema.optional().nullable(),
    payment: GGCheckoutPaymentSchema,
    product: GGCheckoutProductSchema.optional().nullable(),
    products: z.array(GGCheckoutProductSchema).optional().nullable(),
    webhook: z.object({
        id: z.string().optional().nullable(),
        url: z.string().optional().nullable(),
    }).optional().nullable(),
    src: z.string().optional().nullable(),
    sck: z.string().optional().nullable(),
    utm_source: z.string().optional().nullable(),
    utm_medium: z.string().optional().nullable(),
    utm_campaign: z.string().optional().nullable(),
    utm_content: z.string().optional().nullable(),
    utm_term: z.string().optional().nullable(),
    customerIp: z.string().optional().nullable(),
});

export type GGCheckoutWebhook = z.infer<typeof GGCheckoutWebhookSchema>;

// ============ UTILITY FUNCTIONS ============

/**
 * Normalize tracking data from different gateway formats
 */
export function normalizeTrackingData(
    tracking: any,
    gateway: 'Buckpay' | 'Paradise' | 'GGCheckout'
): Record<string, any> {
    if (!tracking) return {};

    if (gateway === 'Buckpay') {
        return {
            utm_source: tracking?.utm?.source || null,
            utm_medium: tracking?.utm?.medium || null,
            utm_campaign: tracking?.utm?.campaign || null,
            utm_content: tracking?.utm?.content || null,
            utm_term: tracking?.utm?.term || null,
            utm_id: tracking?.utm?.id || null,
            ref: tracking?.ref || null,
            src: tracking?.src || null,
            sck: tracking?.sck || null,
        };
    }

    if (gateway === 'Paradise') {
        return {
            utm_source: tracking?.utm_source || null,
            utm_medium: tracking?.utm_medium || null,
            utm_campaign: tracking?.utm_campaign || null,
            utm_content: tracking?.utm_content || null,
            utm_term: tracking?.utm_term || null,
            src: tracking?.src || null,
            sck: tracking?.sck || null,
        };
    }

    // GGCheckout - tracking is already flat in the payload root
    return tracking;
}

/**
 * Check if a transaction already exists in the database
 */
import { collection, query, where, limit, getDocs } from 'firebase/firestore';

/**
 * Check if a transaction already exists in the database
 */
export async function checkDuplicateTransaction(
    firestore: any,
    transactionId: string,
    gateway: string
): Promise<{ exists: boolean; docId?: string; currentStatus?: string }> {
    try {
        const vendasRef = collection(firestore, 'vendas');
        const q = query(
            vendasRef,
            where('transactionId', '==', transactionId),
            where('gateway', '==', gateway),
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { exists: false };
        }

        const doc = snapshot.docs[0];
        return {
            exists: true,
            docId: doc.id,
            currentStatus: doc.data().status,
        };
    } catch (error) {
        console.error('Error checking duplicate transaction:', error);
        return { exists: false };
    }
}

/**
 * Add processing history entry to a sale
 */
export function addProcessingHistory(
    existingHistory: any[] = [],
    eventType: string,
    status: string,
    timestamp: any
) {
    return [
        ...existingHistory,
        {
            timestamp,
            eventType,
            status,
        },
    ];
}

/**
 * Format currency for Brazilian Real
 */
export const formatCurrencyBRL = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'valor não informado';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

/**
 * Convert headers to plain object for logging
 */
export const objectFromHeaders = (headers: Headers): Record<string, string> => {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
        obj[key] = value;
    });
    return obj;
};
