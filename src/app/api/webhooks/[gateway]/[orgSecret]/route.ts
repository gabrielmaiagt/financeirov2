import { NextRequest, NextResponse } from 'next/server';
import { getGatewayAdapter } from '@/services/gateways'; // Registry
import { WebhookProcessor } from '@/services/gateways/processor';

// Initialize processor once (or per request, usually okay for serverless if lightweight)
const processor = new WebhookProcessor();

export async function POST(
    request: NextRequest,
    { params }: { params: { gateway: string; orgSecret: string } }
) {
    const { gateway, orgSecret } = params;

    // 1. Get Adapter
    const adapter = getGatewayAdapter(gateway);
    if (!adapter) {
        return NextResponse.json({ error: `Gateway '${gateway}' not supported` }, { status: 400 });
    }

    try {
        const body = await request.json();

        // 2. Validate Payload (Adapter specific)
        const isValid = await adapter.validate(request, body);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid payload or signature' }, { status: 400 });
        }

        // 3. Process
        // Headers object cleanup
        const headersObj: Record<string, string> = {};
        request.headers.forEach((v, k) => headersObj[k] = v);

        const result = await processor.process(gateway, orgSecret, adapter, body, headersObj);

        if (!result.success) {
            return NextResponse.json(
                { error: result.message, details: result.error },
                { status: result.error === 'Unauthorized' ? 401 : 500 }
            );
        }

        return NextResponse.json({
            message: 'Webhook processed successfully',
            id: result.saleId,
            action: result.action
        });

    } catch (error: any) {
        console.error('Webhook Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// Support GET for verification if needed by some gateways (usually not, but good practice to handle 405)
export async function GET() {
    return NextResponse.json({ message: 'Webhook endpoint active. Send POST method.' });
}
