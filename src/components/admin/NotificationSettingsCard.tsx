'use client';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Bell, Loader2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { WebhookFilters } from './WebhookFilters';

// Define the structure for a template
interface NotificationTemplate {
    title: string;
    message: string;
    enabled: boolean;
}

// Define the settings object
interface NotificationSettings {
    sale_approved: NotificationTemplate;
    sale_pending: NotificationTemplate;
    sale_refunded: NotificationTemplate;

    // NEW: Webhook filters
    notifyPending?: boolean;      // Enable/disable PIX gerado notifications
    notifyApproved?: boolean;     // Enable/disable PIX pago notifications
    notifyRefunded?: boolean;     // Enable/disable refund notifications
    playSound?: boolean;          // Enable/disable notification sound

    // NEW: Scheduled motivational notifications
    scheduledEnabled?: boolean;    // Master toggle for scheduled notifications
    schedules?: {
        '06:00'?: boolean;
        '08:00'?: boolean;
        '10:00'?: boolean;
        '12:00'?: boolean;
        '18:00'?: boolean;
        '22:00'?: boolean;
    };
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

const NotificationSettingsCard = () => {
    const { toast } = useToast();
    const { orgId } = useOrganization();
    const firestore = useFirestore();
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function fetchSettings() {
            if (!firestore || !orgId) return;
            setIsLoading(true);
            try {
                const docRef = doc(firestore, 'organizations', orgId, 'settings', 'notifications');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    // Merge with defaults to ensure all keys exist
                    const data = snap.data() as Partial<NotificationSettings>;
                    setSettings({
                        ...DEFAULT_SETTINGS,
                        ...data,
                        sale_approved: { ...DEFAULT_SETTINGS.sale_approved, ...data.sale_approved },
                        sale_pending: { ...DEFAULT_SETTINGS.sale_pending, ...data.sale_pending },
                        sale_refunded: { ...DEFAULT_SETTINGS.sale_refunded, ...data.sale_refunded },
                    });
                } else {
                    setSettings(DEFAULT_SETTINGS);
                }
            } catch (err) {
                console.error('Failed to fetch notification settings', err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, [firestore, orgId]);

    const handleSave = async () => {
        if (!firestore || !orgId) return;
        setIsSaving(true);
        try {
            const docRef = doc(firestore, 'organizations', orgId, 'settings', 'notifications');
            await setDoc(docRef, settings, { merge: true });
            toast({
                title: "Configurações Salvas!",
                description: "Seus templates de notificação foram atualizados.",
            });
        } catch (err) {
            console.error('Error saving settings', err);
            toast({
                variant: 'destructive',
                title: "Erro",
                description: "Falha ao salvar configurações.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const updateTemplate = (key: keyof NotificationSettings, field: keyof NotificationTemplate, value: any) => {
        setSettings(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
    };

    const TemplateEditor = ({ label, settingKey, badgeColor }: { label: string, settingKey: keyof NotificationSettings, badgeColor: string }) => (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge className={badgeColor}>{label}</Badge>
                    <span className="text-xs text-muted-foreground">Variáveis: {'{valor}'}, {'{cliente}'}, {'{produto}'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor={`enable-${settingKey}`} className="text-sm text-muted-foreground">Ativar</Label>
                    <Switch
                        id={`enable-${settingKey}`}
                        checked={settings[settingKey].enabled}
                        onCheckedChange={(c) => updateTemplate(settingKey, 'enabled', c)}
                    />
                </div>
            </div>

            <div className="grid gap-3">
                <div className="grid gap-1">
                    <Label htmlFor={`title-${settingKey}`}>Título</Label>
                    <Input
                        id={`title-${settingKey}`}
                        value={settings[settingKey].title}
                        onChange={(e) => updateTemplate(settingKey, 'title', e.target.value)}
                        placeholder="Ex: Nova Venda!"
                        disabled={!settings[settingKey].enabled}
                    />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor={`msg-${settingKey}`}>Mensagem</Label>
                    <Textarea
                        id={`msg-${settingKey}`}
                        value={settings[settingKey].message}
                        onChange={(e) => updateTemplate(settingKey, 'message', e.target.value)}
                        placeholder="Ex: {cliente} acabou de comprar..."
                        className="h-20 resize-none"
                        disabled={!settings[settingKey].enabled}
                    />
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Notificações</CardTitle>
                </CardHeader>
                <CardContent className="h-40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Personalizar Notificações
                </CardTitle>
                <CardDescription>
                    Edite as mensagens enviadas para Vendas Aprovadas, Pendentes e Reembolsos.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Accordion type="single" collapsible defaultValue="approved" className="w-full">
                    <AccordionItem value="approved">
                        <AccordionTrigger>✅ Venda Aprovada</AccordionTrigger>
                        <AccordionContent>
                            <TemplateEditor
                                label="Aprovada"
                                settingKey="sale_approved"
                                badgeColor="bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20"
                            />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="pending">
                        <AccordionTrigger>⏳ Venda Pendente / Gerada</AccordionTrigger>
                        <AccordionContent>
                            <TemplateEditor
                                label="Pendente"
                                settingKey="sale_pending"
                                badgeColor="bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25 border-yellow-500/20"
                            />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="refunded">
                        <AccordionTrigger>🔄 Reembolso</AccordionTrigger>
                        <AccordionContent>
                            <TemplateEditor
                                label="Reembolso"
                                settingKey="sale_refunded"
                                badgeColor="bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20"
                            />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* Webhook Filters */}
                <WebhookFilters
                    settings={settings}
                    onToggle={updateTemplate as any}
                    isSaving={isSaving}
                />

                <div className="flex justify-end pt-4 border-t border-border/50">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default NotificationSettingsCard;
