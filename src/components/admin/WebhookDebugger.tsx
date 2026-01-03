'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, CheckCircle, Clock, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WebhookLog {
    id: string;
    receivedAt: Timestamp;
    source: string;
    processingStatus: 'pending' | 'success' | 'success_updated' | 'error' | 'validation_error' | 'warning_missing_data';
    errorMessage?: string;
    transactionId?: string;
    body?: any;
    headers?: any;
}

const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    success_updated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    validation_error: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    warning_missing_data: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const statusIcons = {
    pending: Clock,
    success: CheckCircle,
    success_updated: CheckCircle,
    error: AlertCircle,
    validation_error: AlertCircle,
    warning_missing_data: AlertCircle,
};

const WebhookDebugger = () => {
    const firestore = useFirestore();
    const { orgId } = useOrganization();
    const { toast } = useToast();
    const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const webhookLogsQuery = useMemoFirebase(
        () => {
            if (!firestore || !orgId) return null;
            return query(
                collection(firestore, 'organizations', orgId, 'webhook_logs'),
                orderBy('receivedAt', 'desc'),
                limit(50)
            );
        },
        [firestore, orgId, refreshKey]
    );

    const { data: webhookLogs, isLoading } = useCollection<WebhookLog>(webhookLogsQuery);

    const getWebhookUrl = (gateway: string) => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return `${baseUrl}/api/webhook/${gateway.toLowerCase()}?orgId=${orgId}`;
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copiado!',
            description: `${label} copiado para a área de transferência.`,
        });
    };

    const refresh = () => {
        setRefreshKey(prev => prev + 1);
        toast({
            title: 'Atualizado!',
            description: 'Logs recarregados com sucesso.',
        });
    };

    const gateways = ['Buckpay', 'Frendz', 'Paradise', 'GGCheckout'];

    // Estatísticas
    const stats = {
        total: webhookLogs?.length || 0,
        success: webhookLogs?.filter(log => log.processingStatus === 'success' || log.processingStatus === 'success_updated').length || 0,
        errors: webhookLogs?.filter(log => log.processingStatus === 'error' || log.processingStatus === 'validation_error').length || 0,
        pending: webhookLogs?.filter(log => log.processingStatus === 'pending').length || 0,
    };

    // Últimos webhooks por gateway
    const lastByGateway = gateways.reduce((acc, gateway) => {
        const last = webhookLogs?.find(log => log.source === gateway);
        acc[gateway] = last || null;
        return acc;
    }, {} as Record<string, WebhookLog | null>);

    return (
        <div className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Diagnóstico de Webhooks
                            </CardTitle>
                            <CardDescription>
                                Monitore e depure webhooks recebidos dos gateways
                            </CardDescription>
                        </div>
                        <Button onClick={refresh} variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Estatísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-neutral-800 border-neutral-700">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold">{stats.total}</div>
                                <p className="text-xs text-muted-foreground mt-1">Total de Webhooks</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-neutral-800 border-neutral-700">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold text-green-400">{stats.success}</div>
                                <p className="text-xs text-muted-foreground mt-1">Processados com Sucesso</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-neutral-800 border-neutral-700">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold text-red-400">{stats.errors}</div>
                                <p className="text-xs text-muted-foreground mt-1">Erros</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-neutral-800 border-neutral-700">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
                                <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* URLs dos Webhooks */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">URLs dos Webhooks</h3>
                        <div className="space-y-3">
                            {gateways.map(gateway => {
                                const url = getWebhookUrl(gateway);
                                const lastLog = lastByGateway[gateway];
                                const timeSinceLastReceived = lastLog
                                    ? `Último: ${format(lastLog.receivedAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                                    : 'Nenhum webhook recebido';

                                return (
                                    <Card key={gateway} className="bg-neutral-800 border-neutral-700">
                                        <CardContent className="pt-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h4 className="font-semibold">{gateway}</h4>
                                                        {lastLog && (
                                                            <Badge variant="outline" className={statusColors[lastLog.processingStatus]}>
                                                                {lastLog.processingStatus}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <code className="text-xs bg-neutral-900 px-2 py-1 rounded block overflow-x-auto">
                                                        {url}
                                                    </code>
                                                    <p className="text-xs text-muted-foreground mt-2">{timeSinceLastReceived}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(url, `URL do ${gateway}`)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tabela de Logs */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Últimos Webhooks Recebidos</h3>
                        <div className="border border-neutral-700 rounded-md">
                            <ScrollArea className="h-[400px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-neutral-700">
                                            <TableHead>Data/Hora</TableHead>
                                            <TableHead>Gateway</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Transaction ID</TableHead>
                                            <TableHead>Detalhes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24">
                                                    Carregando logs...
                                                </TableCell>
                                            </TableRow>
                                        ) : webhookLogs && webhookLogs.length > 0 ? (
                                            webhookLogs.map(log => {
                                                const StatusIcon = statusIcons[log.processingStatus];
                                                return (
                                                    <TableRow key={log.id} className="border-neutral-700">
                                                        <TableCell className="text-xs">
                                                            {format(log.receivedAt.toDate(), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                                                        </TableCell>
                                                        <TableCell className="font-medium">{log.source}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={statusColors[log.processingStatus]}>
                                                                <StatusIcon className="h-3 w-3 mr-1" />
                                                                {log.processingStatus}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {log.transactionId || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setSelectedLog(log)}
                                                            >
                                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                                Ver
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24">
                                                    Nenhum webhook recebido ainda.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Detalhes do Log Selecionado */}
                    {selectedLog && (
                        <Card className="bg-neutral-800 border-neutral-700">
                            <CardHeader>
                                <CardTitle className="text-base">Detalhes do Webhook</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-4 right-4"
                                    onClick={() => setSelectedLog(null)}
                                >
                                    ✕
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <span className="text-sm font-semibold">Gateway:</span>
                                    <p className="text-sm text-muted-foreground">{selectedLog.source}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-semibold">Status:</span>
                                    <p className="text-sm text-muted-foreground">{selectedLog.processingStatus}</p>
                                </div>
                                {selectedLog.errorMessage && (
                                    <div>
                                        <span className="text-sm font-semibold text-red-400">Erro:</span>
                                        <p className="text-sm text-red-300">{selectedLog.errorMessage}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-sm font-semibold">Payload Recebido:</span>
                                    <ScrollArea className="h-[200px] mt-2">
                                        <pre className="text-xs bg-neutral-900 p-3 rounded overflow-x-auto">
                                            {JSON.stringify(selectedLog.body, null, 2)}
                                        </pre>
                                    </ScrollArea>
                                </div>
                                <div>
                                    <span className="text-sm font-semibold">Headers:</span>
                                    <ScrollArea className="h-[100px] mt-2">
                                        <pre className="text-xs bg-neutral-900 p-3 rounded overflow-x-auto">
                                            {JSON.stringify(selectedLog.headers, null, 2)}
                                        </pre>
                                    </ScrollArea>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Alertas e Recomendações */}
                    {stats.errors > 0 && (
                        <Card className="bg-red-500/10 border-red-500/30">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-red-400">Erros Detectados</h4>
                                        <p className="text-sm text-red-300 mt-1">
                                            {stats.errors} webhook(s) falharam ao processar. Verifique os logs acima para detalhes.
                                        </p>
                                        <p className="text-sm text-red-300 mt-2">
                                            <strong>Possíveis causas:</strong>
                                        </p>
                                        <ul className="list-disc list-inside text-sm text-red-300 mt-1 space-y-1">
                                            <li>Formato de payload inválido do gateway</li>
                                            <li>Erro de autenticação ou validação</li>
                                            <li>Problemas de conexão com Firebase</li>
                                            <li>Campos obrigatórios faltando no payload</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {webhookLogs && webhookLogs.length === 0 && (
                        <Card className="bg-yellow-500/10 border-yellow-500/30">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-yellow-400">Nenhum Webhook Recebido</h4>
                                        <p className="text-sm text-yellow-300 mt-1">
                                            O sistema não recebeu nenhum webhook ainda.
                                        </p>
                                        <p className="text-sm text-yellow-300 mt-2">
                                            <strong>Verifique:</strong>
                                        </p>
                                        <ul className="list-disc list-inside text-sm text-yellow-300 mt-1 space-y-1">
                                            <li>Se as URLs dos webhooks estão configuradas nos gateways (Buckpay, Frendz, etc.)</li>
                                            <li>Se a aplicação está acessível publicamente (não em localhost)</li>
                                            <li>Se há vendas sendo processadas nos gateways</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WebhookDebugger;
