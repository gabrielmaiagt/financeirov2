'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Users as UsersIcon, Webhook, Bell, Activity, ArrowLeft } from 'lucide-react';
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
import { WidgetConfigCard } from '@/components/admin/WidgetConfigCard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatsCard } from '@/components/admin/StatsCard';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('users');
    const [title, setTitle] = useState('🔔 Notificação de Teste');
    const [message, setMessage] = useState('Esta é uma mensagem de teste para verificar as notificações push.');
    const [link, setLink] = useState('/');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { orgId } = useOrganization();
    const firestore = useFirestore();

    // Fetch stats for cards
    const usersQuery = useMemoFirebase(
        () => firestore && orgId ? collection(firestore, 'organizations', orgId, 'users') : null,
        [firestore, orgId]
    );
    const { data: users } = useCollection(usersQuery);

    const webhooksQuery = useMemoFirebase(
        () => firestore && orgId ? collection(firestore, 'organizations', orgId, 'webhookLogs') : null,
        [firestore, orgId]
    );
    const { data: webhookLogs } = useCollection(webhooksQuery);

    const notificationsQuery = useMemoFirebase(
        () => firestore && orgId ? collection(firestore, 'organizations', orgId, 'pushSubscriptions') : null,
        [firestore, orgId]
    );
    const { data: pushSubscriptions } = useCollection(notificationsQuery);

    // Calculate today's webhooks
    const webhooksToday = useMemo(() => {
        if (!webhookLogs) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return webhookLogs.filter(log => {
            const logDate = log.timestamp?.toDate() || new Date(0);
            return logDate >= today;
        }).length;
    }, [webhookLogs]);

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
        <div className="min-h-screen bg-black text-foreground">
            {/* Background gradient */}
            <div className="fixed top-0 left-0 w-full h-full -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-black to-black"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent"></div>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <AdminSidebar
                    mode="tabs"
                    activeValue={activeTab}
                    onItemClick={setActiveTab}
                />

                {/* Main Content */}
                <main className="flex-1 p-8 space-y-8 overflow-y-auto">
                    {/* Header with back button */}
                    <div className="flex items-center gap-4 mb-4">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/" className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Dashboard
                            </Link>
                        </Button>
                    </div>

                    {/* Stats Cards - Show different stats based on active tab */}
                    {activeTab === 'users' && (
                        <>
                            <AdminHeader
                                title="Gerenciamento de Usuários"
                                description="Visualize e gerencie todos os usuários da organização"
                            />
                            <div className="grid gap-6 md:grid-cols-3 mb-8">
                                <StatsCard
                                    title="Total de Usuários"
                                    value={users?.length || 0}
                                    icon={UsersIcon}
                                    variant="success"
                                />
                                <StatsCard
                                    title="Administradores"
                                    value={users?.filter(u => u.role === 'admin').length || 0}
                                    icon={UsersIcon}
                                    variant="info"
                                />
                                <StatsCard
                                    title="Usuários Ativos"
                                    value={users?.filter(u => u.active !== false).length || 0}
                                    icon={Activity}
                                    variant="default"
                                />
                            </div>
                            <UserManagement />
                        </>
                    )}

                    {activeTab === 'integrations' && (
                        <>
                            <AdminHeader
                                title="Integrações & Webhooks"
                                description="Configure e monitore integrações de pagamento e webhooks"
                            />
                            <div className="grid gap-6 md:grid-cols-3 mb-8">
                                <StatsCard
                                    title="Webhooks Hoje"
                                    value={webhooksToday}
                                    icon={Webhook}
                                    variant="info"
                                />
                                <StatsCard
                                    title="Total de Logs"
                                    value={webhookLogs?.length || 0}
                                    icon={Activity}
                                    variant="default"
                                />
                                <StatsCard
                                    title="Taxa de Sucesso"
                                    value={webhookLogs?.length ? `${Math.round((webhookLogs.filter(l => l.status === 'success').length / webhookLogs.length) * 100)}%` : '0%'}
                                    icon={Activity}
                                    variant="success"
                                />
                            </div>
                            <div className="space-y-6">
                                <WebhookDebugger />
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
                            </div>
                        </>
                    )}

                    {activeTab === 'notifications' && (
                        <>
                            <AdminHeader
                                title="Notificações Push"
                                description="Configure e envie notificações para todos os usuários"
                            />
                            <div className="grid gap-6 md:grid-cols-3 mb-8">
                                <StatsCard
                                    title="Dispositivos Ativos"
                                    value={pushSubscriptions?.length || 0}
                                    icon={Bell}
                                    variant="info"
                                />
                                <StatsCard
                                    title="Notificações Enviadas"
                                    value="0"
                                    icon={Send}
                                    variant="default"
                                />
                                <StatsCard
                                    title="Taxa de Clique"
                                    value="0%"
                                    icon={Activity}
                                    variant="success"
                                />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <NotificationSettingsCard />
                                <Card className="bg-neutral-900/50 backdrop-blur-sm border-neutral-800">
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
                                            className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500"
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
                        </>
                    )}

                    {activeTab === 'widget' && (
                        <>
                            <AdminHeader
                                title="Widget Mobile"
                                description="Configure seu widget iOS para acompanhar métricas na tela inicial"
                            />
                            <WidgetConfigCard />
                        </>
                    )}

                    {activeTab === 'interface' && (
                        <>
                            <AdminHeader
                                title="Configurações de Interface"
                                description="Personalize a aparência e o comportamento da interface"
                            />
                            <TabSettingsCard />
                        </>
                    )}

                    {activeTab === 'system' && (
                        <>
                            <AdminHeader
                                title="Logs do Sistema"
                                description="Monitore erros e atividades do sistema"
                            />
                            <ErrorLogViewer />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
