import { GatewayAdapter, UnifiedSale } from '../types';
import { GGCheckoutWebhookSchema, normalizeTrackingData } from '@/lib/webhook-utils';

export class GGCheckoutAdapter implements GatewayAdapter {
    name = 'GGCheckout';

    async validate(request: Request, body: any): Promise<boolean> {
        const result = GGCheckoutWebhookSchema.safeParse(body);
        if (!result.success) {
            console.warn('GGCheckout validation failed:', result.error);
            return false;
        }
        return true;
    }

    normalize(body: any): UnifiedSale {
        const result = GGCheckoutWebhookSchema.parse(body);

        // Map Status from event
        // GGCheckout events: payment.approved, payment.refused, payment.refunded, payment.chargeback
        let status: UnifiedSale['status'] = 'pending';
        const event = result.event?.toLowerCase() || '';
        const paymentStatus = result.payment?.status?.toLowerCase() || '';

        if (event.includes('approved') || paymentStatus === 'approved' || paymentStatus === 'paid') {
            status = 'paid';
        } else if (event.includes('refused') || paymentStatus === 'refused' || paymentStatus === 'declined') {
            status = 'refused';
        } else if (event.includes('refunded') || paymentStatus === 'refunded') {
            status = 'refunded';
        } else if (event.includes('chargeback') || paymentStatus === 'chargeback') {
            status = 'chargeback';
        } else if (event.includes('pending') || paymentStatus === 'pending') {
            status = 'pending';
        }

        // Map Amount (GGCheckout sends in cents)
        const amount = (result.payment?.amount || 0) / 100;

        // Get product info
        const firstProduct = result.products?.[0] || result.product;
        const productName = firstProduct?.name || 'Produto GGCheckout';

        // Build tracking from flat fields
        const tracking = {
            utm_source: result.utm_source || undefined,
            utm_medium: result.utm_medium || undefined,
            utm_campaign: result.utm_campaign || undefined,
            utm_content: result.utm_content || undefined,
            utm_term: result.utm_term || undefined,
            src: result.src || undefined,
            sck: result.sck || undefined,
        };

        return {
            gateway: 'GGCheckout',
            externalId: result.payment?.id || 'unknown_id',
            status: status,
            amount: amount,
            customer: {
                name: result.customer?.name || 'Cliente Desconhecido',
                email: result.customer?.email || 'email@nao.informado',
                phone: result.customer?.phone || undefined,
                document: result.customer?.document || undefined,
            },
            product: {
                name: productName,
                quantity: firstProduct?.quantity || 1,
            },
            tracking: tracking,
            originalPayload: body,
            eventType: result.event || 'transaction',
        };
    }
}
