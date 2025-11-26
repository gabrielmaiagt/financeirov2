'use client';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp, writeBatch, getDocs, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, PackageCheck, PackagePlus, Server, Copy, Trash2, TrendingUp, Percent, FileText, Eye, Clock, Wallet, MessageCircle, Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface RecoveryScript {
  id: string;
  title: string;
  text: string;
  category: string;
}

interface Reminder {
  id: string;
  title: string;
  date: Timestamp;
  completed: boolean;
}
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

  // Script Management State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<RecoveryScript | null>(null);
  const [scriptForm, setScriptForm] = useState({ title: '', text: '', category: 'WhatsApp' });

  // Novos estados para filtros avançados
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterGateway, setFilterGateway] = useState('all');

  // Reminder State
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState<string>(''); // Using string for datetime-local input

  // Query atualizada para ordenar por created_at (novo padrão) ou receivedAt (legado)
  // Como não dá para ordenar por dois campos diferentes facilmente sem índice composto, vamos ordenar no cliente se necessário ou assumir created_at
  const vendasQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'vendas'), orderBy('created_at', 'desc')) : null),
    [firestore]
  );

  const { data: vendasRaw, isLoading } = useCollection<any>(vendasQuery);

  // Carregar scripts do Firestore
  const scriptsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'scripts'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: scriptsRaw } = useCollection<any>(scriptsQuery);

  const scripts: RecoveryScript[] = useMemo(() => {
    if (!scriptsRaw) return [];
    return scriptsRaw.map(s => ({
      id: s.id,
      title: s.title,
      text: s.text,
      category: s.category
    }));
  }, [scriptsRaw]);

  // Lembretes Logic
  const remindersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'reminders'), orderBy('date', 'asc')) : null),
    [firestore]
  );
  const { data: remindersRaw } = useCollection<any>(remindersQuery);

  const reminders: Reminder[] = useMemo(() => {
    if (!remindersRaw) return [];
    return remindersRaw.map(r => ({
      id: r.id,
      title: r.title,
      date: r.date,
      completed: r.completed
    }));
  }, [remindersRaw]);

  const handleAddReminder = async () => {
    if (!firestore || !reminderTitle || !reminderDate) return;
    try {
      await addDoc(collection(firestore, 'reminders'), {
        title: reminderTitle,
        date: Timestamp.fromDate(new Date(reminderDate)),
        completed: false,
        createdAt: Timestamp.now()
      });
      setReminderTitle('');
      setReminderDate('');
      toast({ title: 'Lembrete adicionado!' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao adicionar lembrete', variant: 'destructive' });
    }
  };

  const toggleReminder = async (id: string, currentStatus: boolean) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'reminders', id), { completed: !currentStatus });
  };

  const deleteReminder = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'reminders', id));
  };

  const handleSaveScript = async () => {
    if (!firestore || !scriptForm.title || !scriptForm.text) return;

    try {
      if (editingScript) {
        await updateDoc(doc(firestore, 'scripts', editingScript.id), {
          ...scriptForm,
          updatedAt: Timestamp.now()
        });
        toast({ title: 'Script atualizado!' });
      } else {
        await addDoc(collection(firestore, 'scripts'), {
          ...scriptForm,
          createdAt: Timestamp.now()
        });
        toast({ title: 'Script criado!' });
      }
      setIsScriptModalOpen(false);
      setEditingScript(null);
      setScriptForm({ title: '', text: '', category: 'WhatsApp' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar script', variant: 'destructive' });
    }
  };

  const handleDeleteScript = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'scripts', id));
      toast({ title: 'Script removido' });
    } catch (error) {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const openScriptModal = (script?: RecoveryScript) => {
    if (script) {
      setEditingScript(script);
      setScriptForm({ title: script.title, text: script.text, category: script.category });
    } else {
      setEditingScript(null);
      setScriptForm({ title: '', text: '', category: 'WhatsApp' });
    }
    setIsScriptModalOpen(true);
  };

  // Normalizar dados e aplicar filtros
  const vendas: Venda[] = useMemo(() => {
    if (!vendasRaw) return [];

    let processed = vendasRaw.map((v: any) => ({
      ...v,
      // Fallbacks para campos antigos
      total_amount: typeof v.total_amount === 'string' ? parseFloat(v.total_amount) : (v.total_amount ?? v.value ?? 0),
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
    })).sort((a: Venda, b: Venda) => {
      const dateA = a.created_at?.toDate() || new Date(0);
      const dateB = b.created_at?.toDate() || new Date(0);
      return dateB.getTime() - dateA.getTime(); // Mais recentes primeiro
    });

    // Filtro de Data
    if (dateRange?.from) {
      processed = processed.filter((v: Venda) => {
        const date = v.created_at?.toDate();
        if (!date) return false;

        const start = startOfDay(dateRange.from!);
        const end = endOfDay(dateRange.to || dateRange.from!);

        return isWithinInterval(date, { start, end });
      });
    }

    // Filtro de Pesquisa (Nome, Email, Produto, ID)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      processed = processed.filter((v: Venda) =>
        (v.buyer?.name?.toLowerCase() || '').includes(lowerTerm) ||
        (v.buyer?.email?.toLowerCase() || '').includes(lowerTerm) ||
        (v.offer?.name?.toLowerCase() || '').includes(lowerTerm) ||
        (v.id || '').toLowerCase().includes(lowerTerm)
      );
    }

    // Filtro de Produto
    if (filterProduct !== 'all') {
      processed = processed.filter((v: Venda) => v.offer?.name === filterProduct);
    }

    // Filtro de Gateway
    if (filterGateway !== 'all') {
      processed = processed.filter((v: Venda) => v.gateway === filterGateway);
    }

    return processed;
  }, [vendasRaw, dateRange, searchTerm, filterProduct, filterGateway]);

  // Extrair listas únicas para os selects de filtro
  const uniqueProducts = useMemo(() => {
    if (!vendasRaw) return [];
    const products = new Set(vendasRaw.map((v: any) => v.offer?.name).filter(Boolean));
    return Array.from(products);
  }, [vendasRaw]);

  const uniqueGateways = useMemo(() => {
    if (!vendasRaw) return [];
    const gateways = new Set(vendasRaw.map((v: any) => v.gateway).filter(Boolean));
    return Array.from(gateways);
  }, [vendasRaw]);

  const salesMetrics = useMemo(() => {
    if (!vendas) return { paidCount: 0, generatedCount: 0, conversionRate: 0, totalRevenue: 0, pendingRevenue: 0, totalFees: 0, netRevenue: 0, arpu: 0 };

    let paidCount = 0;
    let generatedCount = 0;
    let totalRevenue = 0;
    let pendingRevenue = 0;
    let totalFees = 0;

    vendas.forEach(venda => {
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

  }, [vendas]);

  // Analytics por fonte, campanha, gateway, produto e horário
  const trackingAnalytics = useMemo(() => {
    if (!vendas) return { bySource: {}, byCampaign: {}, byGateway: {}, byProduct: {}, byHour: {} };

    const initMetric = () => ({ count: 0, generated: 0, revenue: 0 });

    const bySource: Record<string, { count: number; generated: number; revenue: number }> = {};
    const byCampaign: Record<string, { count: number; generated: number; revenue: number }> = {};
    const byGateway: Record<string, { count: number; generated: number; revenue: number }> = {};
    const byProduct: Record<string, { count: number; generated: number; revenue: number }> = {};
    const byHour: Record<string, { count: number; generated: number; revenue: number }> = {};

    vendas.forEach(venda => {
      const lowerCaseStatus = venda.status.toLowerCase();
      const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');
      const isGenerated = true; // Consideramos toda venda como "gerada" inicialmente para fins de funil

      // Helper
      const processMetric = (dict: any, key: string, amount: number) => {
        if (!dict[key]) dict[key] = initMetric();
        dict[key].generated++;
        if (isPaid) {
          dict[key].count++;
          dict[key].revenue += amount;
        }
      };

      // Gateway
      const gateway = venda.gateway || 'N/A';
      processMetric(byGateway, gateway, venda.total_amount);

      // Produto
      const product = venda.offer?.name || 'N/A';
      processMetric(byProduct, product, venda.total_amount);

      // Horário
      const date = venda.created_at?.toDate();
      if (date) {
        const hour = date.getHours().toString().padStart(2, '0') + 'h';
        processMetric(byHour, hour, venda.total_amount);
      }

      if (venda.tracking) {
        // Source
        const source = venda.tracking.utm_source || venda.tracking.src || 'N/A';
        processMetric(bySource, source, venda.total_amount);

        // Campaign
        const campaign = venda.tracking.utm_campaign || 'N/A';
        processMetric(byCampaign, campaign, venda.total_amount);
      }
    });

    return { bySource, byCampaign, byGateway, byProduct, byHour };
  }, [vendas]);

  // Dados para o gráfico de evolução
  const chartData = useMemo(() => {
    if (!vendas) return [];

    const dataMap: Record<string, number> = {};

    // Ordenar vendas por data (antigas primeiro)
    const sortedVendas = [...vendas].sort((a, b) => {
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
  }, [vendas]);

  // Vendas para recuperação (não pagas)
  const recoveryVendas = useMemo(() => {
    if (!vendas) return [];
    return vendas.filter(venda => {
      const lowerCaseStatus = venda.status.toLowerCase();
      return lowerCaseStatus.includes('gerado') || lowerCaseStatus.includes('created') || lowerCaseStatus.includes('pending') || lowerCaseStatus.includes('waiting');
    });
  }, [vendas]);

  const handleWhatsAppClick = (venda: Venda) => {
    if (!venda.buyer?.phone) {
      toast({ title: 'Erro', description: 'Telefone não disponível', variant: 'destructive' });
      return;
    }
    // Limpar telefone (apenas números)
    const phone = venda.buyer.phone.replace(/\D/g, '');
    const message = `Olá ${venda.buyer.name}, vi que seu pedido de ${formatCurrencyBRL(venda.total_amount)} está pendente. Posso ajudar?`;
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

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
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="recovery">Recuperação</TabsTrigger>
            <TabsTrigger value="reminders">Lembretes</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            <Button variant="outline" size="icon" onClick={() => setIsClearAlertOpen(true)} disabled={isLoading || !vendas || vendas.length === 0}>
              <Trash2 className="w-4 h-4" />
              <span className="sr-only">Limpar Vendas</span>
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-transparent border-neutral-800">
            <CardHeader>
              <CardTitle>Feed de Vendas em Tempo Real</CardTitle>
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

              {/* Analytics de Conversão por Campanha */}
              <Card className="bg-transparent border-neutral-800">
                <CardHeader>
                  <CardTitle className="text-base">Conversão por Campanha/Criativo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-neutral-800 rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-neutral-800 bg-neutral-900">
                          <TableHead>Campanha/Criativo</TableHead>
                          <TableHead className="text-center">Gerados</TableHead>
                          <TableHead className="text-center">Pagos</TableHead>
                          <TableHead className="text-right">Receita</TableHead>
                          <TableHead className="text-center">Conversão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(trackingAnalytics.byCampaign).length > 0 ? (
                          Object.entries(trackingAnalytics.byCampaign)
                            .sort(([, a], [, b]) => b.revenue - a.revenue)
                            .map(([campaign, data]) => (
                              <TableRow key={campaign} className="border-neutral-800">
                                <TableCell>{campaign}</TableCell>
                                <TableCell className="text-center">{data.generated}</TableCell>
                                <TableCell className="text-center">{data.count}</TableCell>
                                <TableCell className="text-right">{formatCurrencyBRL(data.revenue)}</TableCell>
                                <TableCell className="text-center">
                                  {data.generated > 0 ? ((data.count / data.generated) * 100).toFixed(1) : 0}%
                                </TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Sem dados de campanha.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Filtros e Tabela */}
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Pesquisar por nome, email, produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-neutral-900 border-neutral-800"
                    />
                  </div>
                  <div className="w-full md:w-[200px]">
                    <Select value={filterProduct} onValueChange={setFilterProduct}>
                      <SelectTrigger className="bg-neutral-900 border-neutral-800">
                        <SelectValue placeholder="Produto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Produtos</SelectItem>
                        {uniqueProducts.map((p: any) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-[200px]">
                    <Select value={filterGateway} onValueChange={setFilterGateway}>
                      <SelectTrigger className="bg-neutral-900 border-neutral-800">
                        <SelectValue placeholder="Gateway" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Gateways</SelectItem>
                        {uniqueGateways.map((g: any) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border border-neutral-800 rounded-md overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="sticky top-0 bg-neutral-900 z-10">
                        <TableRow className="border-neutral-800 hover:bg-neutral-900">
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
                          <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nenhuma venda encontrada com os filtros atuais.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
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
                    .sort((a, b) => a[0].localeCompare(b[0]))
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
        </TabsContent>

        <TabsContent value="recovery" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna da Esquerda: Lista de Pendências */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Vendas Pendentes
              </h3>
              <div className="border border-neutral-800 rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-800">
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recoveryVendas.length > 0 ? (
                      recoveryVendas.map((venda) => (
                        <TableRow key={venda.id} className="border-neutral-800">
                          <TableCell className="text-muted-foreground text-xs">
                            <TimeAgo date={venda.created_at?.toDate()} />
                          </TableCell>
                          <TableCell className="font-medium">{venda.buyer?.name || 'Desconhecido'}</TableCell>
                          <TableCell>{venda.buyer?.phone || '-'}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrencyBRL(venda.total_amount)}</TableCell>
                          <TableCell className="text-center flex justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleWhatsAppClick(venda)} disabled={!venda.buyer?.phone}>
                              <MessageCircle className="w-4 h-4 mr-2 text-green-500" /> WhatsApp
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nenhuma venda pendente para recuperação.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Coluna da Direita: Scripts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Scripts de Recuperação
                </h3>
                <Button size="sm" onClick={() => openScriptModal()}>
                  <Plus className="w-4 h-4 mr-1" /> Novo
                </Button>
              </div>

              <div className="grid gap-4">
                {scripts.map(script => (
                  <Card key={script.id} className="bg-neutral-900 border-neutral-800 group relative">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openScriptModal(script)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteScript(script.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start pr-12">
                        <CardTitle className="text-sm font-medium">{script.title}</CardTitle>
                        <Badge variant="outline" className="text-xs">{script.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-neutral-950 p-2 rounded border border-neutral-800">
                        {script.text}
                      </p>
                      <Button variant="secondary" size="sm" className="w-full h-8" onClick={() => copyToClipboard(script.text, 'Script')}>
                        <Copy className="w-3 h-3 mr-2" /> Copiar Script
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {scripts.length === 0 && (
                  <div className="text-center p-8 border border-dashed border-neutral-800 rounded-lg text-muted-foreground text-sm">
                    Nenhum script cadastrado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <Card className="bg-transparent border-neutral-800">
            <CardHeader>
              <CardTitle>Lembretes e Tarefas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2 w-full">
                  <Label>Título do Lembrete</Label>
                  <Input
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    placeholder="Ex: Ligar para cliente X"
                    className="bg-neutral-900 border-neutral-800"
                  />
                </div>
                <div className="w-full md:w-[250px] space-y-2">
                  <Label>Data e Hora</Label>
                  <Input
                    type="datetime-local"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="bg-neutral-900 border-neutral-800"
                  />
                </div>
                <Button onClick={handleAddReminder} className="w-full md:w-auto">Adicionar</Button>
              </div>

              <div className="space-y-2">
                {reminders.map(reminder => (
                  <div key={reminder.id} className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={reminder.completed}
                        onChange={() => toggleReminder(reminder.id, reminder.completed)}
                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 accent-primary"
                      />
                      <div className={cn("flex flex-col", reminder.completed && "opacity-50 line-through")}>
                        <span className="font-medium">{reminder.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {reminder.date?.toDate().toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/20" onClick={() => deleteReminder(reminder.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {reminders.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground border border-dashed border-neutral-800 rounded-lg">
                    Nenhum lembrete pendente.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Script */}
      <Dialog open={isScriptModalOpen} onOpenChange={setIsScriptModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingScript ? 'Editar Script' : 'Novo Script'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={scriptForm.title}
                onChange={e => setScriptForm({ ...scriptForm, title: e.target.value })}
                placeholder="Ex: Cobrança PIX #1"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={scriptForm.category}
                onValueChange={v => setScriptForm({ ...scriptForm, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="Áudio">Áudio</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo do Script</Label>
              <Textarea
                value={scriptForm.text}
                onChange={e => setScriptForm({ ...scriptForm, text: e.target.value })}
                placeholder="Digite o texto ou link aqui..."
                className="h-32"
              />
              <p className="text-xs text-muted-foreground">Use {'{nome}'}, {'{produto}'} e {'{link}'} como variáveis.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScriptModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveScript}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
