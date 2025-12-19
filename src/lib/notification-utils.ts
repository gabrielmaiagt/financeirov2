import { Timestamp } from 'firebase-admin/firestore';
import { formatCurrencyBRL } from './webhook-utils';
import { Messaging } from 'firebase-admin/messaging';

// Structure of the settings stored in Firestore
interface NotificationTemplate {
    title: string;
    message: string;
    enabled: boolean;
}

interface NotificationSettings {
    sale_approved: NotificationTemplate;
    sale_pending: NotificationTemplate;
    sale_refunded: NotificationTemplate;
}

const DEFAULT_SETTINGS: NotificationSettings = {
    sale_approved: {
        title: '💸 Pagamento Confirmado!',
        message: 'Venda de {valor} para {cliente} confirmada!',
        enabled: true
    },
    sale_pending: {
        title: '⏳ Pagamento Pendente',
        message: 'Pagamento de {valor} para {cliente} aguardando.',
        enabled: true
    },
    sale_refunded: {
        title: '🔄 Reembolso Processado',
        message: 'Reembolso de {valor} para {cliente} realizado.',
        enabled: true
    }
};

/**
 * Sends a notification using templates stored in the organization settings.
 * If no custom template exists, falls back to defaults.
 */
export async function sendTemplatedNotification(
    db: FirebaseFirestore.Firestore,
    messaging: Messaging,
    orgId: string,
    type: 'sale_approved' | 'sale_pending' | 'sale_refunded',
    data: {
        customerName: string;
        value: number | null;
        productName?: string;
        gateway?: string;
    }
) {
    try {
        // 1. Fetch Settings
        const settingsRef = db.collection('organizations').doc(orgId).collection('settings').doc('notifications');
        const settingsSnap = await settingsRef.get();

        let template: NotificationTemplate = DEFAULT_SETTINGS[type];

        if (settingsSnap.exists) {
            const savedSettings = settingsSnap.data() as Partial<NotificationSettings>;
            if (savedSettings[type]) {
                template = { ...template, ...savedSettings[type]! };
            }
        }

        // 2. Check if enabled
        if (!template.enabled) {
            console.log(`Notification for ${type} is disabled for org ${orgId}`);
            return;
        }

        // 3. Interpolate variables
        const formattedValue = formatCurrencyBRL(data.value);
        const title = interpolate(template.title, {
            valor: formattedValue,
            cliente: data.customerName,
            produto: data.productName || 'Produto',
            gateway: data.gateway || ''
        });
        const message = interpolate(template.message, {
            valor: formattedValue,
            cliente: data.customerName,
            produto: data.productName || 'Produto',
            gateway: data.gateway || ''
        });

        // 4. Save to Firestore (In-app notification)
        await db.collection('organizations').doc(orgId).collection('notificacoes').add({
            title,
            message,
            createdAt: Timestamp.now(),
            read: false,
            type: `webhook_${type}`,
            metadata: {
                ...data,
                originalType: type
            }
        });

        // 5. Send Push Notification
        const profilesRef = db.collection('organizations').doc(orgId).collection('perfis');
        const profilesSnap = await profilesRef.get();

        const tokens: string[] = [];
        profilesSnap.forEach((doc) => {
            const userData = doc.data();
            if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                tokens.push(...userData.fcmTokens);
            }
        });

        if (tokens.length > 0) {
            const uniqueTokens = [...new Set(tokens)];
            const payload = {
                tokens: uniqueTokens,
                webpush: {
                    fcmOptions: { link: '/vendas' },
                    headers: { Urgency: 'high' }
                },
                data: {
                    title,
                    body: message,
                    link: '/vendas',
                    icon: '/icon-192x192.png'
                }
            };

            const response = await messaging.sendEachForMulticast(payload as any);
            console.log(`Push sent for ${type}: ${response.successCount} success`);
        }

    } catch (error) {
        console.error(`Failed to send templated notification (${type})`, error);
    }
}

function interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return variables[key] || match;
    });
}
