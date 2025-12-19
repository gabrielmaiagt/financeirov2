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
    transaction_id: z.string().or(z.number().transform(String)).optional().nullable(),
    id: z.string().or(z.number().transform(String)).optional().nullable(), // Fallback for transaction_id
    external_id: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    event: z.string().optional().nullable(), // Some gateways send 'event' instead of status
    amount: z.preprocess((val) => Number(val), z.number()).optional().nullable(),
    value: z.preprocess((val) => Number(val), z.number()).optional().nullable(), // Fallback for amount
    payment_method: z.string().optional().nullable(),
    customer: ParadiseCustomerSchema.optional().nullable(),
    buyer: ParadiseCustomerSchema.optional().nullable(), // Fallback for customer
    raw_status: z.string().optional().nullable(),
    webhook_type: z.string().optional().nullable(),
    timestamp: z.string().optional().nullable(),
    tracking: ParadiseTrackingSchema.optional().nullable(),
}).transform((data) => ({
    ...data,
    transaction_id: data.transaction_id || data.id || 'unknown_id',
    status: data.status || data.event || 'unknown',
    amount: data.amount || data.value || 0,
    customer: data.customer || data.buyer || {},
}));

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

// ============ FRENDZ SCHEMAS ============
// Based on frendz.com.br API documentation
// Webhook payload sent to postback_url when transaction status changes

export const FrendzCustomerSchema = z.object({
    id: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    phone_number: z.string().optional().nullable(),
    document: z.string().optional().nullable(),
    street_name: z.string().optional().nullable(),
    number: z.string().optional().nullable(),
    complement: z.string().optional().nullable(),
    neighborhood: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip_code: z.string().optional().nullable(),
});

// Affiliate schema for Frendz
export const FrendzAffiliateSchema = z.object({
    id: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone_number: z.string().optional().nullable(),
});

export const FrendzCartItemSchema = z.object({
    hash: z.string().optional().nullable(),
    product_hash: z.string().optional().nullable(),
    product_id: z.number().optional().nullable(),
    offer_id: z.number().optional().nullable(),
    title: z.string().optional().nullable(),
    cover: z.string().optional().nullable(),
    price: z.number().optional().nullable(), // in centavos
    quantity: z.number().optional().nullable(),
    operation_type: z.number().optional().nullable(), // 1=main, 2=orderbump, 3=upsell
    tangible: z.boolean().optional().nullable(),
});

export const FrendzTrackingSchema = z.object({
    src: z.string().optional().nullable(),
    utm_source: z.string().optional().nullable(),
    utm_medium: z.string().optional().nullable(),
    utm_campaign: z.string().optional().nullable(),
    utm_term: z.string().optional().nullable(),
    utm_content: z.string().optional().nullable(),
});

export const FrendzTransactionSchema = z.object({
    id: z.string().or(z.number().transform(String)).optional().nullable(),
    status: z.string().optional().nullable(),
    method: z.string().optional().nullable(),
    tracking_code: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    amount: z.number().optional().nullable(), // in centavos
    net_amount: z.number().optional().nullable(), // in centavos
    url: z.string().optional().nullable(),
    checkout_url: z.string().optional().nullable(),
    billet: z.object({
        url: z.string().optional().nullable(),
        barcode: z.string().optional().nullable(),
        expires_at: z.string().optional().nullable(),
    }).optional().nullable(),
    pix: z.object({
        code: z.string().optional().nullable(),
        url: z.string().optional().nullable(),
        expires_at: z.string().optional().nullable(),
    }).optional().nullable(),
});

export const FrendzWebhookSchema = z.object({
    // Platform-level identification
    token: z.string().optional().nullable(),
    event: z.string().optional().nullable(), // 'transaction' or 'cart.abandoned'
    status: z.string().optional().nullable(), // processing, authorized, paid, refunded, waiting_payment, refused, antifraud, chargeback, cancelled
    method: z.string().optional().nullable(), // credit_card, billet, pix
    platform: z.string().optional().nullable(),

    // Nested objects (Actual current structure)
    customer: FrendzCustomerSchema.optional().nullable(),
    affiliate: FrendzAffiliateSchema.optional().nullable(),
    transaction: FrendzTransactionSchema.optional().nullable(),
    offer: z.object({
        hash: z.string().optional().nullable(),
        title: z.string().optional().nullable(),
        price: z.number().optional().nullable(), // in centavos
        payment_methods: z.string().optional().nullable(), // For cart.abandoned
    }).optional().nullable(),
    items: z.array(FrendzCartItemSchema).optional().nullable(),
    tracking: FrendzTrackingSchema.optional().nullable(),

    // Meta/Facebook tracking pixels
    ip: z.string().optional().nullable(),
    fbp: z.string().optional().nullable(), // Facebook browser pixel
    fbc: z.string().optional().nullable(), // Facebook click ID

    // Legacy or flat structure support
    hash: z.string().optional().nullable(),
    transaction_id: z.string().or(z.number().transform(String)).optional().nullable(),
    id: z.string().or(z.number().transform(String)).optional().nullable(),
    amount: z.preprocess((val) => Number(val), z.number()).optional().nullable(),
    payment_method: z.string().optional().nullable(),
    installments: z.number().optional().nullable(),
    cart: z.array(FrendzCartItemSchema).optional().nullable(),
    offer_hash: z.string().optional().nullable(),
    checkout_url: z.string().optional().nullable(),

    // Timestamps
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    paid_at: z.string().optional().nullable(),
    refund_at: z.string().optional().nullable(),

    // Cart abandoned specific
    abandoned_id: z.number().optional().nullable(),
}).transform((data) => ({
    ...data,
    transaction_id: data.transaction?.id || data.hash || data.transaction_id || data.id || 'unknown_id',
    status: data.transaction?.status || data.status || data.event || 'unknown',
    amount: data.transaction?.amount || data.amount || 0,
    cart: data.items || data.cart || [],
}));

export type FrendzWebhook = z.infer<typeof FrendzWebhookSchema>;

// ============ UTILITY FUNCTIONS ============

/**
 * Normalize tracking data from different gateway formats
 */
export function normalizeTrackingData(
    tracking: any,
    gateway: 'Buckpay' | 'Paradise' | 'GGCheckout' | 'Frendz'
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
    if (gateway === 'GGCheckout') {
        return tracking;
    }

    // Frendz
    if (gateway === 'Frendz') {
        return {
            utm_source: tracking?.utm_source || null,
            utm_medium: tracking?.utm_medium || null,
            utm_campaign: tracking?.utm_campaign || null,
            utm_content: tracking?.utm_content || null,
            utm_term: tracking?.utm_term || null,
            src: tracking?.src || null,
        };
    }

    return {};
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
    gateway: string,
    orgId: string
): Promise<{ exists: boolean; docId?: string; currentStatus?: string }> {
    try {
        const vendasRef = collection(firestore, 'organizations', orgId, 'vendas');
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
