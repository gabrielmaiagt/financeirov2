'use client';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp, writeBatch, getDocs, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, PackageCheck, PackagePlus, Server, Copy, Trash2, TrendingUp, Percent, FileText, Eye, Clock, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import DetalhesVendaModal from '@/components/DetalhesVendaModal';
import { Venda } from '@/types/venda';
import { formatCurrencyBRL } from '@/lib/formatters';

// Client-side component to render relative time
const TimeAgo = ({ date }: { date: Date | undefined }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (date) {
      const update = () => setTimeAgo(formatDistanceToNow(date, { addSuffix: true, locale: ptBR }));
      update();
      const interval = setInterval(update, 60000); // update every minute
      return () => clearInterval(interval);
    }
  }, [date]);

  if (!date) return 'N/A';

  return timeAgo || 'agora mesmo';
};

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) => (
  <Card className="bg-neutral-900/50 border-neutral-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-neutral-400">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const VendasBoard = () => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Query atualizada para ordenar por created_at (novo padrão) ou receivedAt (legado)
  // Como não dá para ordenar por dois campos diferentes facilmente sem índice composto, vamos ordenar no cliente se necessário ou assumir created_at
  const vendasQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'vendas'), orderBy('created_at', 'desc')) : null),
    [firestore]
  );

  const { data: vendasRaw, isLoading } = useCollection<any>(vendasQuery);

  // Normalizar dados (suporte a legado e novo)
  const vendas: Venda[] = useMemo(() => {
    if (!vendasRaw) return [];
    return vendasRaw.map(v => ({
      ...v,
      // Fallbacks para campos antigos
      total_amount: v.total_amount ?? v.value ?? 0,
      status: v.status ?? 'unknown',
      buyer: v.buyer ?? {
        name: v.customerName ?? 'Desconhecido',
        email: v.customerEmail ?? '',
        phone: v.customerPhone ?? '',
        document: v.customerDocument ?? ''
      },
      created_at: v.created_at ?? v.receivedAt ?? Timestamp.now(),
      offer: v.offer ?? {
        name: v.offerName ?? 'N/A',
        discount_price: v.offerPrice ?? 0,
        quantity: v.offerQuantity ?? 1
      },
      payment_method: v.payment_method ?? v.paymentMethod ?? v.gateway ?? 'N/A',
      net_amount: v.net_amount ?? v.netAmount ?? 0,
      tracking: v.tracking ?? v.trackingData ?? {},
      gateway: v.gateway ?? 'N/A'
    }));
  }, [vendasRaw]);

  // Filtrar vendas por data
  const filteredVendas = useMemo(() => {
    if (!vendas) return [];
    if (!dateRange?.from) return vendas;

    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    return vendas.filter(venda => {
      if (!venda.created_at) return false;
      const date = venda.created_at.toDate();
      return isWithinInterval(date, { start: from, end: to });
    });
  }, [vendas, dateRange]);

  const salesMetrics = useMemo(() => {
    if (!filteredVendas) return { paidCount: 0, generatedCount: 0, conversionRate: 0, totalRevenue: 0, pendingRevenue: 0, totalFees: 0, netRevenue: 0, arpu: 0 };

    let paidCount = 0;
    let generatedCount = 0;
    let totalRevenue = 0;
    let pendingRevenue = 0;
    let totalFees = 0;

    filteredVendas.forEach(venda => {
      const lowerCaseStatus = venda.status.toLowerCase();
      const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');
      const isGenerated = lowerCaseStatus.includes('gerado') || lowerCaseStatus.includes('created') || lowerCaseStatus.includes('pending');

      if (isPaid) {
        paidCount++;
        totalRevenue += venda.total_amount;

        // Calculate gateway fees
        const gateway = venda.gateway?.toLowerCase() || '';
        let fee = 0;

        if (gateway.includes('buckpay')) {
          // Buckpay: 4.49% + R$ 1.49
          fee = (venda.total_amount * 0.0449) + 1.49;
        } else if (gateway.includes('paradise')) {
          // Paradise: 1.50% + R$ 1.49
          fee = (venda.total_amount * 0.015) + 1.49;
        } else if (gateway.includes('ggcheckout')) {
          // GGCheckout: Add fee structure when known
          fee = 0; // TODO: Add GGCheckout fee structure
        }

        totalFees += fee;
      } else if (isGenerated) {
        generatedCount++;
        pendingRevenue += venda.total_amount;
      }
    });

    const totalGenerated = generatedCount + paidCount;
    const conversionRate = totalGenerated > 0 ? (paidCount / totalGenerated) * 100 : 0;
    const netRevenue = totalRevenue - totalFees;
    const arpu = paidCount > 0 ? totalRevenue / paidCount : 0;

    return {
      paidCount,
      generatedCount: totalGenerated,
      conversionRate,
      totalRevenue,
      pendingRevenue,
      totalFees,
      netRevenue,
      arpu
    }

  }, [filteredVendas]);

  // Analytics por fonte, campanha, gateway, produto e horário
  const trackingAnalytics = useMemo(() => {
    if (!filteredVendas) return { bySource: {}, byCampaign: {}, byGateway: {}, byProduct: {}, byHour: {} };

    const bySource: Record<string, { count: number; revenue: number }> = {};
    const byCampaign: Record<string, { count: number; revenue: number }> = {};
    const byGateway: Record<string, { count: number; revenue: number }> = {};
    const byProduct: Record<string, { count: number; revenue: number }> = {};
    const byHour: Record<string, { count: number; revenue: number }> = {};

    filteredVendas.forEach(venda => {
      const lowerCaseStatus = venda.status.toLowerCase();
      const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');

      if (isPaid) {
        // Gateway
        const gateway = venda.gateway || 'N/A';
        if (!byGateway[gateway]) {
          byGateway[gateway] = { count: 0, revenue: 0 };
        }
        byGateway[gateway].count++;
        byGateway[gateway].revenue += venda.total_amount;

        // Produto
        const product = venda.offer?.name || 'N/A';
        if (!byProduct[product]) {
          byProduct[product] = { count: 0, revenue: 0 };
        }
        byProduct[product].count++;
        byProduct[product].revenue += venda.total_amount;

        // Horário
        const date = venda.created_at?.toDate();
        if (date) {
          const hour = date.getHours().toString().padStart(2, '0') + 'h';
          if (!byHour[hour]) {
            byHour[hour] = { count: 0, revenue: 0 };
          }
          byHour[hour].count++;
          byHour[hour].revenue += venda.total_amount;
        }

        if (venda.tracking) {
          // Source (utm_source ou src)
          const source = venda.tracking.utm_source || venda.tracking.src || 'N/A';
          if (!bySource[source]) {
            bySource[source] = { count: 0, revenue: 0 };
          }
          bySource[source].count++;
          bySource[source].revenue += venda.total_amount;

          // Campaign (utm_campaign)
          const campaign = venda.tracking.utm_campaign || 'N/A';
          if (!byCampaign[campaign]) {
            byCampaign[campaign] = { count: 0, revenue: 0 };
          }
          byCampaign[campaign].count++;
          byCampaign[campaign].revenue += venda.total_amount;
        }
      }
    });

    return { bySource, byCampaign, byGateway, byProduct, byHour };
  }, [filteredVendas]);

  // Dados para o gráfico de evolução
  const chartData = useMemo(() => {
    if (!filteredVendas) return [];

    const dataMap: Record<string, number> = {};

    // Ordenar vendas por data (antigas primeiro)
    const sortedVendas = [...filteredVendas].sort((a, b) => {
      const dateA = a.created_at?.toDate().getTime() || 0;
      const dateB = b.created_at?.toDate().getTime() || 0;
      return dateA - dateB;
    });

    sortedVendas.forEach(venda => {
      const lowerCaseStatus = venda.status.toLowerCase();
      const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');

      if (isPaid && venda.created_at) {
        const date = venda.created_at.toDate();
        // Formato: DD/MM HH:00
        const key = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}h`;

        if (!dataMap[key]) {
          dataMap[key] = 0;
        }
        dataMap[key] += venda.total_amount;
      }
    });

    return Object.entries(dataMap).map(([name, value]) => ({
      name,
      value
    }));
  }, [filteredVendas]);

  const copyToClipboard = (text: string | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${fieldName} copiado para a área de transferência.`,
    });
  };

  const getStatusBadge = (status: string) => {
    const lowerCaseStatus = status.toLowerCase();
    const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');
    const isGenerated = lowerCaseStatus.includes('gerado') || lowerCaseStatus.includes('created') || lowerCaseStatus.includes('pending');

    if (isPaid) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><PackageCheck className="w-3 h-3 mr-1" /> Pago</Badge>;
    }
    if (isGenerated) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><PackagePlus className="w-3 h-3 mr-1" /> Gerado</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  }

  const handleClearSales = async () => {
    if (!firestore) {
      toast({ variant: "destructive", title: "Erro", description: "O serviço de banco de dados não está disponível." });
      return;
    }

    try {
      const vendasRef = collection(firestore, 'vendas');
      const querySnapshot = await getDocs(vendasRef);

      if (querySnapshot.empty) {
        toast({ title: "Tudo limpo!", description: "Não há vendas para apagar." });
        return;
      }

      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      toast({ title: "Sucesso!", description: "Todos os registros de vendas foram apagados." });
    } catch (error) {
      console.error("Erro ao limpar as vendas:", error);
      toast({ variant: "destructive", title: "Erro ao limpar", description: "Não foi possível apagar os registros de vendas." });
    } finally {
      setIsClearAlertOpen(false);
    }
  }

  const handleDeleteSale = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'vendas', id));
    toast({
      title: "Venda excluída",
      description: "O registro da venda foi removido.",
    });
  };

  const handleOpenDetails = (venda: Venda) => {
    setSelectedVenda(venda);
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className="bg-transparent border-neutral-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Feed de Vendas em Tempo Real</CardTitle>
            <div className="flex items-center gap-2">
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              <Button variant="outline" size="icon" onClick={() => setIsClearAlertOpen(true)} disabled={isLoading || !vendas || vendas.length === 0}>
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Limpar Vendas</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <StatCard
              title="Faturamento"
              value={formatCurrencyBRL(salesMetrics.totalRevenue)}
              icon={TrendingUp}
            />
            <StatCard
              title="Fat. Líquido"
              value={formatCurrencyBRL(salesMetrics.netRevenue)}
              icon={TrendingUp}
            />
            <StatCard
              title="Fat. Pendente"
              value={formatCurrencyBRL(salesMetrics.pendingRevenue)}
              icon={Clock}
            />
            <StatCard
              title="Ticket Médio"
              value={formatCurrencyBRL(salesMetrics.arpu)}
              icon={Wallet}
            />
            <StatCard
              title="PIX Gerado"
              value={salesMetrics.generatedCount.toString()}
              icon={FileText}
            />
            <StatCard
              title="PIX Pago"
              value={salesMetrics.paidCount.toString()}
              icon={PackageCheck}
            />
            <StatCard
              title="Conversão"
              value={`${salesMetrics.conversionRate.toFixed(1)}%`}
              icon={Percent}
            />
          </div>

          {/* Gráfico de Evolução */}
          <Card className="bg-transparent border-neutral-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Evolução do Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [formatCurrencyBRL(value), 'Faturamento']}
                    labelStyle={{ color: '#999', marginBottom: '4px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="border border-neutral-800 rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-800">
                  <TableHead>Horário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24"><div className="flex justify-center items-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando vendas...</div></TableCell></TableRow>
                ) : vendas && vendas.length > 0 ? (
                  vendas.map((venda) => (
                    <TableRow key={venda.id} className="border-neutral-800">
                      <TableCell className="text-muted-foreground text-xs">
                        <TimeAgo date={venda.created_at?.toDate()} />
                      </TableCell>
                      <TableCell>{getStatusBadge(venda.status)}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-bold">{venda.buyer?.name || 'Desconhecido'}</span>
                          {venda.buyer?.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {venda.buyer.email}
                              <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => copyToClipboard(venda.buyer.email, 'Email')}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold text-lg",
                        (venda.status.toLowerCase().includes('pago') || venda.status.toLowerCase().includes('paid') || venda.status.toLowerCase().includes('approved')) && 'text-green-400'
                      )}>
                        {formatCurrencyBRL(venda.total_amount)}
                      </TableCell>
                      <TableCell className="text-center flex justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDetails(venda)}>
                          <Eye className="w-4 h-4 mr-1" /> Detalhes
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(venda.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Aguardando novos eventos de venda...</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Analytics por Fonte, Campanha e Gateway */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vendas por Gateway */}
        <Card className="bg-transparent border-neutral-800">
          <CardHeader>
            <CardTitle className="text-base">Vendas por Gateway</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(trackingAnalytics.byGateway)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([gateway, data]) => (
                  <div key={gateway} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{gateway}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrencyBRL(data.revenue)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{data.count}</Badge>
                      <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(data.count / salesMetrics.paidCount) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              {Object.keys(trackingAnalytics.byGateway).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado de gateway disponível</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vendas por Fonte */}
        <Card className="bg-transparent border-neutral-800">
          <CardHeader>
            <CardTitle className="text-base">Vendas por Fonte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(trackingAnalytics.bySource)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map(([source, data]) => (
                  <div key={source} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{source}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrencyBRL(data.revenue)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{data.count}</Badge>
                      <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(data.count / salesMetrics.paidCount) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              {Object.keys(trackingAnalytics.bySource).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado de fonte disponível</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vendas por Campanha */}
        <Card className="bg-transparent border-neutral-800">
          <CardHeader>
            <CardTitle className="text-base">Vendas por Campanha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(trackingAnalytics.byCampaign)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map(([campaign, data]) => (
                  <div key={campaign} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{campaign}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrencyBRL(data.revenue)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{data.count}</Badge>
                      <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(data.count / salesMetrics.paidCount) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              {Object.keys(trackingAnalytics.byCampaign).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado de campanha disponível</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics por Produto e Horário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendas por Produto */}
        <Card className="bg-transparent border-neutral-800">
          <CardHeader>
            <CardTitle className="text-base">Vendas por Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(trackingAnalytics.byProduct)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map(([product, data]) => (
                  <div key={product} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{product}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrencyBRL(data.revenue)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{data.count}</Badge>
                      <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(data.count / salesMetrics.paidCount) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              {Object.keys(trackingAnalytics.byProduct).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado de produto disponível</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vendas por Horário */}
        <Card className="bg-transparent border-neutral-800">
          <CardHeader>
            <CardTitle className="text-base">Vendas por Horário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(trackingAnalytics.byHour)
                .sort((a, b) => a[0].localeCompare(b[0])) // Sort by hour
                .map(([hour, data]) => (
                  <div key={hour} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{hour}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrencyBRL(data.revenue)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{data.count}</Badge>
                      <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(data.count / salesMetrics.paidCount) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              {Object.keys(trackingAnalytics.byHour).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado de horário disponível</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><span>Você tem certeza absoluta?</span></AlertDialogTitle>
            <AlertDialogDescription>
              <span>Esta ação não pode ser desfeita e excluirá permanentemente **todos** os registros de vendas.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel><span>Cancelar</span></AlertDialogCancel>
            <AlertDialogAction onClick={handleClearSales} className="bg-red-600 hover:bg-red-700"><span>Sim, Limpar Tudo</span></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen: boolean) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><span>Você tem certeza?</span></AlertDialogTitle>
            <AlertDialogDescription>
              <span>Esta ação não pode ser desfeita e excluirá permanentemente este registro de venda.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}><span>Cancelar</span></AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (itemToDelete) {
                handleDeleteSale(itemToDelete);
              }
              setItemToDelete(null);
            }} className="bg-red-600 hover:bg-red-700"><span>Excluir</span></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DetalhesVendaModal
        venda={selectedVenda}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default VendasBoard;
