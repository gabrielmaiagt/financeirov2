'use client';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, use Collection } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Loader2 } from 'lucide-react';
import { formatCurrencyBRL } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

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
            <Icon className="h-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
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
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    // Buscar vendas
    const vendasQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'vendas'), orderBy('created_at', 'desc')) : null),
        [firestore]
    );

    const { data: vendasRaw } = useCollection<any>(vendasQuery);

    // Buscar dados de gasto do Meta
    const metaSpendQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'meta_spend_daily'), orderBy('date', 'desc')) : null),
        [firestore]
    );

    const { data: metaSpendDocs } = useCollection<any>(metaSpendQuery);

    // Buscar todas as campanhas do dia atual
    const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);

    useEffect(() => {
        if (!firestore || !metaSpendDocs || metaSpendDocs.length === 0) return;

        const fetchCampaigns = async () => {
            const today = new Date().toISOString().split('T')[0];
            const todayDoc = metaSpendDocs.find((doc: any) => doc.date === today);

            if (!todayDoc) return;

            const campaignsRef = collection(firestore, 'meta_spend_daily', today, 'campaigns');
            const campaignsSnapshot = await getDocs(campaignsRef);

            const campaigns: MetaCampaign[] = [];
            campaignsSnapshot.forEach((doc) => {
                campaigns.push({ id: doc.id, ...doc.data() } as any);
            });

            setMetaCampaigns(campaigns);
        };

        fetchCampaigns();
    }, [firestore, metaSpendDocs]);

    // Filtrar vendas por data
    const filteredVendas = useMemo(() => {
        if (!vendasRaw) return [];

        let filtered = vendasRaw.map((v: any) => ({
            ...v,
            total_amount: typeof v.total_amount === 'string' ? parseFloat(v.total_amount) : (v.total_amount ?? 0),
            status: v.status ?? 'unknown',
            created_at: v.created_at,
        }));

        if (dateRange?.from) {
            filtered = filtered.filter((v: any) => {
                const date = v.created_at?.toDate();
                if (!date) return false;

                const start = startOfDay(dateRange.from!);
                const end = endOfDay(dateRange.to || dateRange.from!);

                return isWithinInterval(date, { start, end });
            });
        }

        return filtered;
    }, [vendasRaw, dateRange]);

    // Calcular métricas de vendas
    const salesMetrics = useMemo(() => {
        if (!filteredVendas) return { totalRevenue: 0, paidCount: 0, generatedCount: 0 };

        let totalRevenue = 0;
        let paidCount = 0;
        let generatedCount = 0;

        filteredVendas.forEach((venda: any) => {
            const lowerCaseStatus = venda.status.toLowerCase();
            const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');

            if (isPaid) {
                paidCount++;
                totalRevenue += venda.total_amount;
            } else {
                generatedCount++;
            }
        });

        return { totalRevenue, paidCount, generatedCount: generatedCount + paidCount };
    }, [filteredVendas]);

    // Calcular gasto do Meta
    const metaMetrics = useMemo(() => {
        if (!metaSpendDocs || metaSpendDocs.length === 0) return { totalSpend: 0 };

        const today = new Date().toISOString().split('T')[0];
        const todayDoc = metaSpendDocs.find((doc: any) => doc.date === today);

        return {
            totalSpend: todayDoc?.total_spend ?? 0,
        };
    }, [metaSpendDocs]);

    // Calcular Lucro e ROI
    const profit = salesMetrics.totalRevenue - metaMetrics.totalSpend;
    const roi = metaMetrics.totalSpend > 0 ? ((profit / metaMetrics.totalSpend) * 100) : 0;

    if (!firestore) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header com filtro de data */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Dashboard de Performance</h1>
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            </div>

            {/* Cards de métricas principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Faturamento"
                    value={formatCurrencyBRL(salesMetrics.totalRevenue)}
                    icon={DollarSign}
                    subtitle={`${salesMetrics.paidCount} vendas pagas`}
                />
                <StatCard
                    title="Gasto em Anúncios"
                    value={formatCurrencyBRL(metaMetrics.totalSpend)}
                    icon={BarChart3}
                    subtitle="Meta Ads (hoje)"
                />
                <StatCard
                    title="Lucro"
                    value={formatCurrencyBRL(profit)}
                    icon={TrendingUp}
                    subtitle={profit >= 0 ? "Positivo" : "Negativo"}
                />
                <StatCard
                    title="ROI"
                    value={`${roi.toFixed(1)}%`}
                    icon={Target}
                    subtitle="Retorno sobre investimento"
                />
            </div>

            {/* Tabela de campanhas */}
            <Card className="bg-transparent border-neutral-800">
                <CardHeader>
                    <CardTitle>Gasto por Campanha (Hoje)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border border-neutral-800 rounded-md overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-neutral-800 bg-neutral-900">
                                    <TableHead>Campanha</TableHead>
                                    <TableHead className="text-right">Gasto</TableHead>
                                    <TableHead className="text-center">Impressões</TableHead>
                                    <TableHead className="text-center">Cliques</TableHead>
                                    <TableHead className="text-center">Conta</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {metaCampaigns.length > 0 ? (
                                    metaCampaigns
                                        .sort((a, b) => b.spend - a.spend)
                                        .map((campaign) => (
                                            <TableRow key={campaign.campaignId} className="border-neutral-800">
                                                <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                                                <TableCell className="text-right">{formatCurrencyBRL(campaign.spend)}</TableCell>
                                                <TableCell className="text-center">{campaign.impressions.toLocaleString()}</TableCell>
                                                <TableCell className="text-center">{campaign.clicks}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline">{campaign.accountId.replace('act_', '')}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            Nenhum dado de campanha disponível. Execute a sincronização primeiro.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
