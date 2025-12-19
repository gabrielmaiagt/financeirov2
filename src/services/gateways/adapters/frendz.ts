import { GatewayAdapter, UnifiedSale } from '../types';
import { FrendzWebhookSchema, normalizeTrackingData } from '@/lib/webhook-utils';

export class FrendzAdapter implements GatewayAdapter {
    name = 'Frendz';

    async validate(request: Request, body: any): Promise<boolean> {
        const result = FrendzWebhookSchema.safeParse(body);
        if (!result.success) {
            console.warn('Frendz validation failed:', result.error);
            return false;
        }
        return true;
    }

    normalize(body: any): UnifiedSale {
        const result = FrendzWebhookSchema.parse(body);

        // Map Status - including all Frendz statuses: processing, authorized, paid, refunded, waiting_payment, refused, antifraud, chargeback, cancelled
        let status: UnifiedSale['status'] = 'pending';
        const s = result.status?.toLowerCase() || '';
        if (['paid', 'approved', 'completed', 'authorized'].includes(s)) status = 'paid';
        else if (['refused', 'declined', 'failed', 'canceled', 'cancelled', 'antifraud'].includes(s)) status = 'refused';
        else if (['refunded'].includes(s)) status = 'refunded';
        else if (['chargeback'].includes(s)) status = 'chargeback';
        else if (['processing', 'waiting_payment'].includes(s)) status = 'pending';

        // Map Amount (Frendz sends in cents)
        const amount = (result.amount || 0) / 100;

        // Product info from items or offer
        const firstItem = result.cart?.[0];
        const productName = result.offer?.title || firstItem?.title || 'Produto Frendz';

        return {
            gateway: 'Frendz',
            externalId: result.transaction_id,
            status: status,
            amount: amount,
            customer: {
                name: result.customer?.name || 'Cliente Desconhecido',
                email: result.customer?.email || 'email@nao.informado',
                phone: result.customer?.phone || result.customer?.phone_number || undefined,
                document: result.customer?.document || undefined,
            },
            product: {
                name: productName,
                quantity: firstItem?.quantity || 1,
            },
            tracking: normalizeTrackingData(result.tracking, 'Frendz'),
            originalPayload: body,
            eventType: result.event || 'transaction',
        };
    }
}
