import { Timestamp } from 'firebase/firestore';

export interface Venda {
    id: string;
    status: string;
    payment_method: string;
    total_amount: number;
    net_amount: number;
    offer: {
        name: string;
        discount_price: number;
        quantity: number;
    };
    buyer: {
        name: string;
        email: string;
        phone: string;
        document: string;
    };
    tracking: any;
    gateway?: string; // Buckpay, Paradise, GGCheckout
    isRecovery?: boolean; // Manually marked or auto-detected from UTM
    created_at: Timestamp;
}
