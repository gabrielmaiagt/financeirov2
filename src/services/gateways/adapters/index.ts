import { BuckpayAdapter } from './buckpay';
import { ParadiseAdapter } from './paradise';
import { FrendzAdapter } from './frendz';
import { GGCheckoutAdapter } from './ggcheckout';
import { GatewayAdapter } from '../types';

const adapters: Record<string, GatewayAdapter> = {
    buckpay: new BuckpayAdapter(),
    paradise: new ParadiseAdapter(),
    frendz: new FrendzAdapter(),
    ggcheckout: new GGCheckoutAdapter(),
};

export function getGatewayAdapter(slug: string): GatewayAdapter | null {
    // Case insensitive lookup
    return adapters[slug.toLowerCase()] || null;
}

export function getAvailableGateways(): string[] {
    return Object.keys(adapters);
}

