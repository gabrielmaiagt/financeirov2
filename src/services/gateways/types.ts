export interface UnifiedSale {
    gateway: string;
    externalId: string; // ID at the gateway
    status: 'pending' | 'paid' | 'refused' | 'refunded' | 'chargeback' | 'processing';
    amount: number; // In cents or standardized float (we'll standardize on float BRL for this project style or better cents? Let's check Utils)
    // Checking previous code: "saleData.total_amount ? saleData.total_amount / 100 : null" -> It stores as float in DB.
    // We will store as number (float).

    customer: {
        name: string;
        email: string;
        phone?: string;
        document?: string;
    };
    product?: {
        name: string;
        id?: string;
        quantity?: number;
        price?: number;
    };
    tracking?: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        utm_content?: string;
        utm_term?: string;
        src?: string;
        sck?: string;
    };
    originalPayload: any;
    eventType: string; // e.g., 'transaction.created'
}

export interface GatewayAdapter {
    name: string;
    /**
     * Validates the request signature or structure.
     * Returns true if valid, or a generic string "valid" (truthy).
     * Returns false or throws error if invalid.
     */
    validate(request: Request, body: any): Promise<boolean>;

    /**
     * Normalizes the specific gateway payload into the UnifiedSale format.
     */
    normalize(body: any): UnifiedSale;
}
