'use client';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { formatCurrencyBRL } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, isWithinInterval, eachDayOfInterval, format, getHours } from 'date-fns';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MetaSpendDaily {
    date: string;
    total_spend: number;
    updatedAt: Date;
}

interface MetaCampaign {
    id: string;
    campaignId: string;
    campaignName: string;
    accountId: string;
    spend: number;
    impressions: number;
    clicks: number;
    date: string;
}

const StatCard = ({ title, value, icon: Icon, subtitle, trend }: any) => (
    <Card className="bg-transparent border-neutral-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
                {typeof value === 'number' ? (
                    <AnimatedNumber value={value} formatter={formatCurrencyBRL} />
                ) : (
                    value
                )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend !== undefined && (
                <div className={cn("flex items-center gap-1 text-xs mt-2", trend >= 0 ? "text-green-500" : "text-red-500")}>
                    {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
            )}
        </CardContent>
    </Card>
);

export default function DashboardBoard() {
    const firestore = useFirestore();
    const { orgId } = useOrganization();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [isSyncing, setIsSyncing] = useState(false);

    // Buscar vendas
    const vendasQuery = useMemoFirebase(
        () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'vendas'), orderBy('created_at', 'desc')) : null),
        [firestore, orgId]
    );

    const { data: vendasRaw } = useCollection<any>(vendasQuery);

    // Buscar dados de gasto do Meta (todos os dias)
    const metaSpendQuery = useMemoFirebase(
        () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'meta_spend_daily'), orderBy('date', 'desc')) : null),
        [firestore, orgId]
    );

    const { data: metaSpendDocs } = useCollection<any>(metaSpendQuery);

    // Buscar campanhas para o período selecionado
    const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);

    useEffect(() => {
        if (!firestore || !dateRange?.from || !orgId) {
            console.log('Skipping campaign fetch: missing firestore, dateRange, or orgId');
            return;
        }

        const fetchCampaigns = async () => {
            setLoadingCampaigns(true);
            const campaigns: MetaCampaign[] = [];

            const start = dateRange.from!;
            const end = dateRange.to || dateRange.from!;
            const days = eachDayOfInterval({ start, end });

            try {
                for (const day of days) {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const campaignsRef = collection(firestore, 'organizations', orgId, 'meta_spend_daily', dateStr, 'campaigns');
                    const snapshot = await getDocs(campaignsRef);

                    snapshot.forEach((doc) => {
                        campaigns.push({ id: doc.id, ...doc.data() } as any);
                    });
                }

                setMetaCampaigns(campaigns);
            } catch (error) {
                console.error('Error fetching campaigns:', error);
            } finally {
                setLoadingCampaigns(false);
            }
        };

        fetchCampaigns();
    }, [firestore, dateRange, orgId, metaSpendDocs]);

    // Filtrar vendas por data
    const filteredVendas = useMemo(() => {
        if (!vendasRaw || !dateRange?.from) return [];

        return vendasRaw.filter((v: any) => {
            const date = v.created_at?.toDate();
            if (!date) return false;

            const start = startOfDay(dateRange.from!);
            const end = endOfDay(dateRange.to || dateRange.from!);

            return isWithinInterval(date, { start, end });
        });
    }, [vendasRaw, dateRange]);

    // Calcular métricas de vendas (mesma lógica do VendasBoard)
    const salesMetrics = useMemo(() => {
        if (!filteredVendas) return { totalRevenue: 0, paidCount: 0 };

        let totalRevenue = 0;
        let paidCount = 0;

        filteredVendas.forEach((venda: any) => {
            const lowerCaseStatus = venda.status?.toLowerCase() || '';
            const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');

            if (isPaid) {
                paidCount++;
                totalRevenue += venda.net_amount || venda.netAmount || 0;
            }
        });

        return { totalRevenue, paidCount };
    }, [filteredVendas]);

    // Calcular gasto do Meta para o período
    const metaMetrics = useMemo(() => {
        if (!metaSpendDocs || !dateRange?.from) return { totalSpend: 0 };

        const start = startOfDay(dateRange.from!);
        const end = endOfDay(dateRange.to || dateRange.from!);
        const days = eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));

        let totalSpend = 0;

        if (selectedAccount !== 'all') {
            totalSpend = metaCampaigns
                .filter(c => c.accountId === selectedAccount)
                .reduce((acc, curr) => acc + curr.spend, 0);
        } else {
            metaSpendDocs.forEach((doc: any) => {
                if (days.includes(doc.date)) {
                    totalSpend += doc.total_spend || 0;
                }
            });
        }

        return { totalSpend };
    }, [metaSpendDocs, dateRange, selectedAccount, metaCampaigns]);

    const profit = salesMetrics.totalRevenue - metaMetrics.totalSpend;
    const roi = metaMetrics.totalSpend > 0 ? (salesMetrics.totalRevenue / metaMetrics.totalSpend) : 0;
    const cpa = salesMetrics.paidCount > 0 ? (metaMetrics.totalSpend / salesMetrics.paidCount) : 0;
    const margin = salesMetrics.totalRevenue > 0 ? ((profit / salesMetrics.totalRevenue) * 100) : 0;

    const filteredCampaigns = useMemo(() => {
        let campaigns = metaCampaigns;
        if (selectedAccount !== 'all') {
            campaigns = campaigns.filter(c => c.accountId === selectedAccount);
        }

        const grouped = new Map<string, MetaCampaign>();

        campaigns.forEach(c => {
            if (grouped.has(c.campaignId)) {
                const existing = grouped.get(c.campaignId)!;
                existing.spend += c.spend;
                existing.impressions += c.impressions;
                existing.clicks += c.clicks;
            } else {
                grouped.set(c.campaignId, { ...c });
            }
        });

        return Array.from(grouped.values()).sort((a, b) => b.spend - a.spend);
    }, [metaCampaigns, selectedAccount]);

    const uniqueAccounts = useMemo(() => {
        const accounts = new Set<string>();
        metaCampaigns.forEach(c => accounts.add(c.accountId));
        return Array.from(accounts);
    }, [metaCampaigns]);

    // Calcular dados por hora para os gráficos
    const hourlyData = useMemo(() => {
        // Inicializar array com 24 horas
        const hours = Array.from({ length: 24 }, (_, i) => ({
            hour: `${i.toString().padStart(2, '0')}:00`,
            hourNum: i,
            revenue: 0,
            spend: 0,
            profit: 0,
            salesCount: 0
        }));

        // Agrupar vendas por hora
        filteredVendas.forEach((venda: any) => {
            const date = venda.created_at?.toDate();
            if (!date) return;

            const hour = getHours(date);
            const lowerCaseStatus = venda.status?.toLowerCase() || '';
            const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');

            if (isPaid) {
                hours[hour].revenue += venda.net_amount || venda.netAmount || 0;
                hours[hour].salesCount++;
            }
        });

        // Distribuir gasto de anúncios proporcionalmente pelas horas (simplificado)
        const hourlySpend = metaMetrics.totalSpend / 24;
        hours.forEach(h => {
            h.spend = hourlySpend;
            h.profit = h.revenue - h.spend;
        });

        return hours;
    }, [filteredVendas, metaMetrics.totalSpend]);

    // Calcular dados acumulados por hora
    const cumulativeHourlyData = useMemo(() => {
        let cumRevenue = 0;
        let cumSpend = 0;
        let cumProfit = 0;

        return hourlyData.map(h => {
            cumRevenue += h.revenue;
            cumSpend += h.spend;
            cumProfit += h.profit;

            return {
                hour: h.hour,
                Faturamento: cumRevenue,
                Investimento: cumSpend,
                Lucro: cumProfit
            };
        });
    }, [hourlyData]);

    const handleSync = async () => {
        if (!dateRange?.from) return;
        setIsSyncing(true);

        try {
            const start = dateRange.from!;
            const end = dateRange.to || dateRange.from!;
            const days = eachDayOfInterval({ start, end });

            console.log(`Iniciando sincronização de ${days.length} dias...`);

            for (const day of days) {
                const dateStr = format(day, 'yyyy-MM-dd');

                await fetch(`/api/cron/sync-meta-spend?date=${dateStr}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET_FOR_CLIENT || 'sua_chave_secreta_aqui_mude_isso'}`
                    }
                });
            }

            console.log('Sincronização concluída!');
            alert('Sincronização concluída! A página será recarregada.');
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('Erro ao sincronizar. Verifique o console.');
        } finally {
            setIsSyncing(false);
        }
    };

    if (!firestore) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold">Dashboard de Performance</h1>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Todas as Contas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Contas</SelectItem>
                            {uniqueAccounts.map(acc => (
                                <SelectItem key={acc} value={acc}>{acc.replace('act_', '')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full md:w-[300px]" />
                    <Button variant="outline" size="icon" onClick={handleSync} disabled={isSyncing} title="Sincronizar Agora">
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                    title="Faturamento"
                    value={salesMetrics.totalRevenue}
                    icon={DollarSign}
                    subtitle={`${salesMetrics.paidCount} vendas pagas`}
                />
                <StatCard
                    title="Gasto em Anúncios"
                    value={metaMetrics.totalSpend}
                    icon={BarChart3}
                    subtitle="Meta Ads"
                />
                <StatCard
                    title="Lucro"
                    value={profit}
                    icon={TrendingUp}
                    subtitle={profit >= 0 ? "Positivo" : "Negativo"}
                />
                <StatCard
                    title="ROI"
                    value={`${roi.toFixed(2)}x`}
                    icon={Target}
                    subtitle="Retorno sobre investimento"
                />
                <StatCard
                    title="CPA"
                    value={cpa}
                    icon={DollarSign}
                    subtitle="Custo por aquisição"
                />
                <StatCard
                    title="Margem"
                    value={`${margin.toFixed(1)}%`}
                    icon={TrendingUp}
                    subtitle="Margem de lucro"
                />
            </div>

            <Card className="bg-transparent border-neutral-800">
                <CardHeader>
                    <CardTitle>Performance por Campanha</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border border-neutral-800 rounded-md overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-neutral-800 bg-neutral-900">
                                    <TableHead>Campanha</TableHead>
                                    <TableHead className="text-right">Gasto</TableHead>
                                    <TableHead className="text-center">Vendas (Est.)</TableHead>
                                    <TableHead className="text-center">CPM</TableHead>
                                    <TableHead className="text-center">CPC</TableHead>
                                    <TableHead className="text-center">CTR</TableHead>
                                    <TableHead className="text-center">Conta</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingCampaigns ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredCampaigns.length > 0 ? (
                                    filteredCampaigns.map((campaign) => {
                                        const cpm = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;
                                        const cpc = campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0;
                                        const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;

                                        return (
                                            <TableRow key={campaign.campaignId} className="border-neutral-800">
                                                <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                                                <TableCell className="text-right">{formatCurrencyBRL(campaign.spend)}</TableCell>
                                                <TableCell className="text-center">-</TableCell>
                                                <TableCell className="text-center">{formatCurrencyBRL(cpm)}</TableCell>
                                                <TableCell className="text-center">{formatCurrencyBRL(cpc)}</TableCell>
                                                <TableCell className="text-center">{ctr.toFixed(2)}%</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline">{campaign.accountId.replace('act_', '')}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            Nenhum dado encontrado para o período selecionado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Gráfico: Lucro por Horário */}
            <Card className="bg-transparent border-neutral-800">
                <CardHeader>
                    <CardTitle>Lucro por Horário</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="hour" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                formatter={(value: any) => formatCurrencyBRL(value)}
                            />
                            <Legend />
                            <Bar dataKey="profit" name="Lucro" fill="#3B82F6" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Gráfico: Faturamento x Investimento x Lucro (Acumulado) */}
            <Card className="bg-transparent border-neutral-800">
                <CardHeader>
                    <CardTitle>Faturamento x Investimento x Lucro por Hora (Acumulado)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={cumulativeHourlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="hour" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                formatter={(value: any) => formatCurrencyBRL(value)}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="Faturamento" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                            <Area type="monotone" dataKey="Investimento" stackId="2" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                            <Area type="monotone" dataKey="Lucro" stackId="3" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
