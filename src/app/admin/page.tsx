'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Link as LinkIcon, ClipboardCopy } from 'lucide-react';
import Link from 'next/link';
import ErrorLogViewer from '@/components/admin/ErrorLogViewer';
import WebhookRequestViewer from '@/components/admin/WebhookRequestViewer';
import WebhookDocumentation from '@/components/admin/WebhookDocumentation';
import { Separator } from '@/components/ui/separator';

const WebhookLinksCard = () => {
    const { toast } = useToast();
    const baseUrl = "https://financeiro.fluxodeoferta.site";

    const webhookUrls = {
        Buckpay: `${baseUrl}/api/webhook/buckpay`,
        Paradise: `${baseUrl}/api/webhook/paradise`,
        GGCheckout: `${baseUrl}/api/webhook/ggcheckout`,
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
                    Links de Webhook
                </CardTitle>
                <CardDescription>
                    Use estes links para configurar as notificações de venda nas plataformas de pagamento.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(webhookUrls).map(([name, url]) => (
                    <div key={name} className="space-y-2">
                        <Label htmlFor={`webhook-${name}`}>{name}</Label>
                        <div className="flex items-center gap-2">
                            <Input id={`webhook-${name}`} value={url} readOnly className="bg-neutral-900" />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(url, name)}>
                                <ClipboardCopy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                 ))}
            </CardContent>
        </Card>
    )
}

export default function AdminPage() {
  const [title, setTitle] = useState('🔔 Notificação de Teste');
  const [message, setMessage] = useState('Esta é uma mensagem de teste para verificar as notificações push.');
  const [link, setLink] = useState('/');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const handleSendNotification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, message, link }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao enviar notificação.');
      }

      toast({
        title: "Sucesso!",
        description: `Notificação enviada para ${result.successCount} dispositivo(s). Falhas: ${result.failureCount}.`,
      });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Um erro desconhecido ocorreu.';
        toast({
            variant: "destructive",
            title: "Erro ao Enviar Notificação",
            description: errorMessage,
        });
        console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-4 md:p-8">
        <div className="absolute top-0 left-0 w-full h-full bg-black -z-10">
         <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,rgba(20,20,20,1)_0%,rgba(0,0,0,1)_100%)"></div>
      </div>
      <div className="w-full max-w-4xl space-y-8">
        <Card className="w-full">
            <CardHeader>
            <CardTitle>Painel de Teste de Notificações Push</CardTitle>
            <CardDescription>
                Use este painel para enviar uma mensagem de teste para todos os dispositivos que permitiram as notificações.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="title">Título da Notificação</Label>
                <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da sua notificação"
                disabled={isLoading}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Input
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conteúdo da sua mensagem"
                disabled={isLoading}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="link">Link (Opcional)</Label>
                <Input
                id="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Ex: /tarefas"
                disabled={isLoading}
                />
            </div>
            <Button
                onClick={handleSendNotification}
                disabled={isLoading || !title || !message}
                className="w-full"
            >
                {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <Send className="mr-2 h-4 w-4" />
                )}
                Enviar Notificação
            </Button>
            </CardContent>
        </Card>
        
        <Separator />

        <WebhookLinksCard />

        <Separator />

        <WebhookDocumentation />
        
        <Separator />
        
        <WebhookRequestViewer />

        <Separator />

        <ErrorLogViewer />

        <div className="text-center mt-8">
            <Button asChild variant="link">
                <Link href="/">Voltar ao Painel Principal</Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
