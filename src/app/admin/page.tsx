'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import ErrorLogViewer from '@/components/admin/ErrorLogViewer';
import { UserManagement } from '@/components/admin/UserManagement';
import WebhookRequestViewer from '@/components/admin/WebhookRequestViewer';
import WebhookDocumentation from '@/components/admin/WebhookDocumentation';
import WebhookLinksCard from '@/components/admin/WebhookLinksCard';
import WebhookDebugger from '@/components/admin/WebhookDebugger';
import AddGatewayGuide from '@/components/admin/AddGatewayGuide';
import NotificationSettingsCard from '@/components/admin/NotificationSettingsCard';
import TabSettingsCard from '@/components/admin/TabSettingsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { useOrganization } from '@/contexts/OrganizationContext';

export default function AdminPage() {
    const [title, setTitle] = useState('🔔 Notificação de Teste');
    const [message, setMessage] = useState('Esta é uma mensagem de teste para verificar as notificações push.');
    const [link, setLink] = useState('/');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { orgId } = useOrganization();

    const handleSendNotification = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/send-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, message, link, orgId }),
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

            <div className="w-full max-w-6xl space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Painel Administrativo
                        </h1>
                        <p className="text-muted-foreground">Gerencie usuários, integrações e monitore o sistema.</p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/">Voltar ao Painel Principal</Link>
                    </Button>
                </div>

                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
                        <TabsTrigger value="users">Usuários</TabsTrigger>
                        <TabsTrigger value="integrations">Integrações & Webhooks</TabsTrigger>
                        <TabsTrigger value="notifications">Notificações Push</TabsTrigger>
                        <TabsTrigger value="interface">Interface</TabsTrigger>
                        <TabsTrigger value="system">Logs do Sistema</TabsTrigger>
                    </TabsList>

                    {/* INTERFACE TAB */}
                    <TabsContent value="interface" className="space-y-6">
                        <TabSettingsCard />
                    </TabsContent>

                    {/* USERS TAB */}
                    <TabsContent value="users" className="space-y-6">
                        <UserManagement />
                    </TabsContent>

                    {/* INTEGRATIONS TAB */}
                    <TabsContent value="integrations" className="space-y-6">
                        <div className="w-full">
                            <WebhookDebugger />
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-6">
                                <WebhookLinksCard />
                                <WebhookDocumentation />
                            </div>
                            <div>
                                <WebhookRequestViewer />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <AddGatewayGuide />
                            </div>
                        </div>
                    </TabsContent>

                    {/* NOTIFICATIONS TAB */}
                    <TabsContent value="notifications" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <NotificationSettingsCard />
                            <Card className="w-full">
                                <CardHeader>
                                    <CardTitle>Testar Notificações Push</CardTitle>
                                    <CardDescription>
                                        Envie mensagens de teste para todos os dispositivos inscritos.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Título</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Título da notificação"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="message">Mensagem</Label>
                                        <Input
                                            id="message"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Conteúdo da mensagem"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="link">Link de Destino</Label>
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
                        </div>
                    </TabsContent>

                    {/* SYSTEM TAB */}
                    <TabsContent value="system" className="space-y-6">
                        <div className="grid gap-6">
                            <ErrorLogViewer />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div >
    );
}
