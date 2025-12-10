'use client';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link as LinkIcon, ClipboardCopy, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WebhookLinksCard = () => {
    const { toast } = useToast();
    const { orgId } = useOrganization();
    const firestore = useFirestore();
    const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
    const [baseUrl, setBaseUrl] = useState("https://financeiro.fluxodeoferta.site");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBaseUrl(window.location.origin);
        }
    }, []);

    useEffect(() => {
        async function fetchSecret() {
            if (!firestore || !orgId) return;
            try {
                const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
                if (orgDoc.exists()) {
                    setWebhookSecret(orgDoc.data().webhookSecret || null);
                }
            } catch (err) {
                console.error('Failed to fetch org secret', err);
            }
        }
        fetchSecret();
    }, [firestore, orgId]);

    const handleGenerateSecret = async () => {
        if (!firestore || !orgId) return;
        setIsLoading(true);
        try {
            // Generate random hex string (16 bytes = 32 chars)
            const randomBytes = new Uint8Array(16);
            window.crypto.getRandomValues(randomBytes);
            const hexString = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            const newSecret = `wh_sec_${hexString}`;

            await updateDoc(doc(firestore, 'organizations', orgId), {
                webhookSecret: newSecret
            });
            setWebhookSecret(newSecret);

            toast({
                title: "Segredo Gerado!",
                description: "Um novo segredo de webhook foi gerado para sua organização.",
            });
        } catch (err) {
            console.error('Error generating secret', err);
            toast({
                variant: 'destructive',
                title: "Erro",
                description: "Falha ao gerar segredo de webhook.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const webhookUrls = {
        Buckpay: webhookSecret ? `${baseUrl}/api/webhooks/buckpay/${webhookSecret}` : 'Requer geração de segredo',
        Paradise: webhookSecret ? `${baseUrl}/api/webhooks/paradise/${webhookSecret}` : 'Requer geração de segredo',
        GGCheckout: webhookSecret ? `${baseUrl}/api/webhooks/ggcheckout/${webhookSecret}` : 'Em breve...',
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: `${label} copiado!`,
            description: 'O link do webhook foi copiado para a área de transferência.',
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="w-5 h-5" />
                    Links de Webhook (White-Label)
                </CardTitle>
                <CardDescription>
                    Use estes links para configurar as notificações de venda nas plataformas de pagamento.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!webhookSecret && (
                    <Alert className="border-yellow-900 bg-yellow-950/20">
                        <AlertDescription className="text-yellow-500 flex flex-col gap-2">
                            <span>Sua organização ainda não possui um Segredo de Webhook configurado.</span>
                            <Button size="sm" variant="secondary" onClick={handleGenerateSecret} disabled={isLoading} className="w-fit">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Gerar Segredo Agora
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}
                {Object.entries(webhookUrls).map(([name, url]) => (
                    <div key={name} className="space-y-2">
                        <Label htmlFor={`webhook-${name}`}>{name}</Label>
                        <div className="flex items-center gap-2">
                            <Input id={`webhook-${name}`} value={url} readOnly className="bg-neutral-900" />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(url, name)} disabled={!webhookSecret}>
                                <ClipboardCopy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export default WebhookLinksCard;
