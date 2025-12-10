import { GatewayAdapter, UnifiedSale } from '../types';
import { ParadiseWebhookSchema, normalizeTrackingData } from '@/lib/webhook-utils';

export class ParadiseAdapter implements GatewayAdapter {
    name = 'Paradise';

    async validate(request: Request, body: any): Promise<boolean> {
        const result = ParadiseWebhookSchema.safeParse(body);
        if (!result.success) {
            console.warn('Paradise validation failed:', result.error);
            return false;
        }
        return true;
    }

    normalize(body: any): UnifiedSale {
        // Paradise structure: transaction_id, status, customer object, etc.
        // Logic ported from api/webhook/paradise/route.ts

        // Status mapping
        let status: UnifiedSale['status'] = 'pending';
        switch (body.status) {
            case 'approved': status = 'paid'; break;
            case 'pending': status = 'pending'; break;
            case 'refused': status = 'refused'; break;
            case 'refunded': status = 'refunded'; break;
            case 'chargeback': status = 'chargeback'; break;
            default: status = 'pending';
        }

        // Amount comes in cents usually. Code says: "validatedData.amount ? validatedData.amount / 100 : 0"
        const amount = body.amount ? body.amount / 100 : 0;

        return {
            gateway: 'Paradise',
            externalId: body.transaction_id || 'unknown',
            status: status,
            amount: amount,
            customer: {
                name: body.customer?.name || 'Cliente Desconhecido',
                email: body.customer?.email || 'email@nao.informado',
                phone: body.customer?.phone,
                document: body.customer?.document,
            },
            product: {
                name: 'Produto (Paradise)', // Paradise payload might not have product details in top level? 
                // Checking schema in route: "validatedData" doesn't explicitly show product name mapping. 
                // Assuming generic or checking if available.
            },
            tracking: normalizeTrackingData(body.tracking, 'Paradise'),
            originalPayload: body,
            eventType: body.webhook_type || 'transaction',
        };
    }
}
