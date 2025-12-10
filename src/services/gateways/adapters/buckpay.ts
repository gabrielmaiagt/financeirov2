import { GatewayAdapter, UnifiedSale } from '../types';
import { BuckpayWebhookSchema, normalizeTrackingData } from '@/lib/webhook-utils';

export class BuckpayAdapter implements GatewayAdapter {
    name = 'Buckpay';

    async validate(request: Request, body: any): Promise<boolean> {
        const result = BuckpayWebhookSchema.safeParse(body);
        if (!result.success) {
            console.warn('Buckpay validation failed:', result.error);
            return false;
        }
        return true;
    }

    normalize(body: any): UnifiedSale {
        // Assuming body is already validated or trusted at this point, but safeParse in validate covers it.
        // However, clean architecture suggests we might re-parse or trust the input.
        // For simplicity, we use the raw body and map fields, assuming it matches the expected structure.

        const data = body.data;
        const event = body.event;

        // Map Status
        let status: UnifiedSale['status'] = 'pending';
        if (data.status === 'paid') status = 'paid';
        else if (data.status === 'refused') status = 'refused';
        else if (data.status === 'refunded') status = 'refunded';

        // Map Amount (Buckpay sends integers representing cents usually, but sometimes floats? 
        // Looking at existing logic: "saleData.total_amount ? saleData.total_amount / 100 : null")
        // If it's 1000 for R$10.00.
        const amount = data.total_amount ? data.total_amount / 100 : 0;

        return {
            gateway: 'Buckpay',
            externalId: data.id,
            status: status,
            amount: amount,
            customer: {
                name: data.buyer?.name || 'Cliente Desconhecido',
                email: data.buyer?.email || 'email@nao.informado',
                phone: data.buyer?.phone,
                document: data.buyer?.document,
            },
            product: {
                name: data.offer?.name || 'Produto',
                quantity: data.offer?.quantity,
                price: data.offer?.price, // Check if this exists in schema
            },
            tracking: normalizeTrackingData(data.tracking, 'Buckpay'),
            originalPayload: body,
            eventType: event,
        };
    }
}
