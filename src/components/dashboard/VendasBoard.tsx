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
import { Loader2, PackageCheck, PackagePlus, Server, Copy, Trash2, TrendingUp, Percent, FileText, Eye, Clock, Wallet, MessageCircle, Pencil, Plus, RefreshCcw } from 'lucide-react';
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

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { SortableCard } from './SortableCard';
import { Settings2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";

// Utility function to clean campaign names by removing long ID patterns like "|123456789"
const cleanCampaignName = (name: string): string => {
  if (!name) return name;
  // Remove patterns like |123456789 (pipe followed by 8+ digits) or space + pipe + digits
  return name.replace(/\s*\|[\d]{8,}/g, '').trim();
};

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterGateway, setFilterGateway] = useState('all');

  // Drag and Drop State
  const defaultItems = [
    'gateway_sales',
    'source_sales',
    'campaign_sales',
    'product_sales',
    'hourly_sales',
    'hourly_conversion',
    'weekday_sales',
    'campaign_conversion_table'
  ];

  const [items, setItems] = useState(defaultItems);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set(defaultItems));
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const savedItems = localStorage.getItem('vendas_dashboard_items');
    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems);
        // Merge with default to ensure new items appear
        const merged = [...new Set([...parsed, ...defaultItems])];
        setItems(merged);
      } catch (e) {
        console.error("Failed to parse saved items", e);
      }
    }
    const savedVisible = localStorage.getItem('vendas_dashboard_visible');
    if (savedVisible) {
      try {
        setVisibleItems(new Set(JSON.parse(savedVisible)));
      } catch (e) {
        console.error("Failed to parse saved visible items", e);
      }
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('vendas_dashboard_items', JSON.stringify(newItems));
        return newItems;
      });
    }
  };

  const toggleMetric = (id: string) => {
    const newVisible = new Set(visibleItems);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleItems(newVisible);
    localStorage.setItem('vendas_dashboard_visible', JSON.stringify(Array.from(newVisible)));
  };

  // Script Management State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<RecoveryScript | null>(null);
  const [scriptForm, setScriptForm] = useState({ title: '', text: '', category: 'WhatsApp' });

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
      processed = processed.filter((v: Venda) => {
        const productName = v.offer?.name || (v as any).offerName;
        return productName === filterProduct;
      });
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
    const products = new Set(vendasRaw.map((v: any) => v.offer?.name || v.offerName).filter(Boolean));
    return Array.from(products);
  }, [vendasRaw]);

  const uniqueGateways = useMemo(() => {
    if (!vendasRaw) return [];
    const gateways = new Set(vendasRaw.map((v: any) => v.gateway).filter(Boolean));
    return Array.from(gateways);
  }, [vendasRaw]);

  const salesMetrics = useMemo(() => {
    if (!vendas) return { paidCount: 0, generatedCount: 0, conversionRate: 0, totalRevenue: 0, pendingRevenue: 0, totalFees: 0, netRevenue: 0, arpu: 0, pendingNetRevenue: 0 };

    let paidCount = 0;
    let generatedCount = 0;
    let totalRevenue = 0;
    let pendingRevenue = 0;
    let pendingNetRevenue = 0;
    let totalFees = 0;

    vendas.forEach(venda => {
      const lowerCaseStatus = venda.status.toLowerCase();
      const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');
      const isGenerated = lowerCaseStatus.includes('gerado') || lowerCaseStatus.includes('created') || lowerCaseStatus.includes('pending');

      // Calculate gateway fees
      const gateway = venda.gateway?.toLowerCase() || '';
      let fee = 0;
      if (gateway.includes('buckpay')) {
        fee = (venda.total_amount * 0.0449) + 1.49;
      } else if (gateway.includes('paradise')) {
        fee = (venda.total_amount * 0.015) + 1.49;
      } else if (gateway.includes('ggcheckout')) {
        fee = 0; // TODO: Add GGCheckout fee structure
      }

      if (isPaid) {
        paidCount++;
        totalRevenue += venda.total_amount;
        totalFees += fee;
      } else if (isGenerated) {
        generatedCount++;
        pendingRevenue += venda.total_amount;
        pendingNetRevenue += (venda.total_amount - fee); // Faturamento pendente líquido
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
      pendingNetRevenue,
      totalFees,
      netRevenue,
      arpu
    }

  }, [vendas]);

  // Analytics por fonte, campanha, gateway, produto e horário
  const trackingAnalytics = useMemo(() => {
    if (!vendas) return { bySource: {}, byCampaign: {}, byGateway: {}, byProduct: {}, byHour: {} };

    const initMetric = () => ({ count: 0, generated: 0, revenue: 0, netRevenue: 0 });

    const bySource: Record<string, { count: number; generated: number; revenue: number; netRevenue: number }> = {};
    const byCampaign: Record<string, { count: number; generated: number; revenue: number; netRevenue: number }> = {};
    const byGateway: Record<string, { count: number; generated: number; revenue: number; netRevenue: number }> = {};
    const byProduct: Record<string, { count: number; generated: number; revenue: number; netRevenue: number }> = {};
    const byHour: Record<string, { count: number; generated: number; revenue: number; netRevenue: number }> = {};

    vendas.forEach(venda => {
      const lowerCaseStatus = venda.status.toLowerCase();
      const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');
      const isGenerated = true; // Consideramos toda venda como "gerada" inicialmente para fins de funil

      // Calculate net amount (with fee deduction)
      const gateway = venda.gateway?.toLowerCase() || '';
      let fee = 0;
      if (gateway.includes('buckpay')) {
        fee = (venda.total_amount * 0.0449) + 1.49;
      } else if (gateway.includes('paradise')) {
        fee = (venda.total_amount * 0.015) + 1.49;
      }
      const netAmount = venda.total_amount - fee;

      // Helper
      const processMetric = (dict: any, key: string, amount: number, net: number) => {
        if (!dict[key]) dict[key] = initMetric();
        dict[key].generated++;
        if (isPaid) {
          dict[key].count++;
          dict[key].revenue += amount;
          dict[key].netRevenue += net;
        }
      };

      // Gateway
      const gw = venda.gateway || 'N/A';
      processMetric(byGateway, gw, venda.total_amount, netAmount);

      // Produto
      const product = venda.offer?.name || 'N/A';
      processMetric(byProduct, product, venda.total_amount, netAmount);

      // Horário
      const date = venda.created_at?.toDate();
      if (date) {
        const hour = date.getHours().toString().padStart(2, '0') + 'h';
        processMetric(byHour, hour, venda.total_amount, netAmount);
      }

      if (venda.tracking) {
        // Source
        const source = venda.tracking.utm_source || venda.tracking.src || 'N/A';
        processMetric(bySource, source, venda.total_amount, netAmount);

        // Campaign
        const campaign = venda.tracking.utm_campaign || 'N/A';
        processMetric(byCampaign, campaign, venda.total_amount, netAmount);
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

  // Dados para gráfico de vendas por horário (APENAS PIX PAGOS)
  const hourlyChartData = useMemo(() => {
    if (!vendas) return [];

    const hourlyData: Record<string, { hour: string; sales: number; revenue: number }> = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + 'h';
      hourlyData[hour] = { hour, sales: 0, revenue: 0 };
    }

    vendas.forEach(venda => {
      const lowerCaseStatus = venda.status.toLowerCase();
      const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');

      if (isPaid) {
        const date = venda.created_at?.toDate();
        if (date) {
          const hour = date.getHours().toString().padStart(2, '0') + 'h';
          hourlyData[hour].sales++;
          hourlyData[hour].revenue += venda.total_amount;
        }
      }
    });

    return Object.values(hourlyData).sort((a, b) => a.hour.localeCompare(b.hour));
  }, [vendas]);

  // Dados para gráfico de conversão por horário
  const hourlyConversionData = useMemo(() => {
    if (!vendas) return [];

    const hourlyData: Record<string, { hour: string; generated: number; paid: number }> = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + 'h';
      hourlyData[hour] = { hour, generated: 0, paid: 0 };
    }

    vendas.forEach(venda => {
      const date = venda.created_at?.toDate();
      if (date) {
        const hour = date.getHours().toString().padStart(2, '0') + 'h';
        hourlyData[hour].generated++;

        const lowerCaseStatus = venda.status.toLowerCase();
        const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');
        if (isPaid) {
          hourlyData[hour].paid++;
        }
      }
    });

    return Object.values(hourlyData).map(d => ({
      hour: d.hour,
      conversion: d.generated > 0 ? ((d.paid / d.generated) * 100) : 0
    })).sort((a, b) => a.hour.localeCompare(b.hour));
  }, [vendas]);

  // Dados para gráfico de vendas por dia da semana (APENAS PIX PAGOS)
  const weekdayChartData = useMemo(() => {
    if (!vendas) return [];

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdayData = weekdays.map((day, index) => ({
      day,
      sales: 0,
      revenue: 0,
      index
    }));

    vendas.forEach(venda => {
      const lowerCaseStatus = venda.status.toLowerCase();
      const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');

      if (isPaid) {
        const dayIndex = venda.created_at?.toDate().getDay();
        if (dayIndex !== undefined) {
          weekdayData[dayIndex].sales++;
          weekdayData[dayIndex].revenue += venda.total_amount;
        }
      }
    });

    return weekdayData;
  }, [vendas]);

  // Calculate max values for progress bars
  const maxValues = useMemo(() => {
    const maxGateway = Math.max(...Object.values(trackingAnalytics.byGateway).map(d => d.count), 1);
    const maxSource = Math.max(...Object.values(trackingAnalytics.bySource).map(d => d.count), 1);
    const maxCampaign = Math.max(...Object.values(trackingAnalytics.byCampaign).map(d => d.count), 1);
    const maxProduct = Math.max(...Object.values(trackingAnalytics.byProduct).map(d => d.count), 1);

    return {
      gateway: maxGateway,
      source: maxSource,
      campaign: maxCampaign,
      product: maxProduct
    };
  }, [trackingAnalytics]);

  // Lógica de leads duplicados: detectar quando um lead gera PIX do mesmo produto várias vezes
  const uniqueLeadsAnalytics = useMemo(() => {
    if (!vendas) return { uniqueLeadsGenerated: 0, uniqueLeadsPaid: 0, realConversion: 0, duplicates: [] };

    // Map: email+produto => array de vendas
    const leadProductMap: Record<string, Venda[]> = {};

    vendas.forEach(venda => {
      const email = venda.buyer?.email?.toLowerCase() || 'sem-email';
      const product = venda.offer?.name || 'N/A';
      const key = `${email}|${product}`;

      if (!leadProductMap[key]) {
        leadProductMap[key] = [];
      }
      leadProductMap[key].push(venda);
    });

    let uniqueLeadsGenerated = 0;
    let uniqueLeadsPaid = 0;
    const duplicates: { email: string; product: string; count: number; paid: number }[] = [];

    Object.entries(leadProductMap).forEach(([key, sales]) => {
      uniqueLeadsGenerated++; // Conta como 1 lead único, independente de quantas vezes gerou

      const paidSales = sales.filter(v => {
        const status = v.status.toLowerCase();
        return status.includes('pago') || status.includes('paid') || status.includes('approved');
      });

      if (paidSales.length > 0) {
        uniqueLeadsPaid++; // Conta como 1 conversão, mesmo que tenha pago várias vezes
      }

      if (sales.length > 1) {
        const [email, product] = key.split('|');
        duplicates.push({
          email,
          product,
          count: sales.length,
          paid: paidSales.length
        });
      }
    });

    const realConversion = uniqueLeadsGenerated > 0 ? (uniqueLeadsPaid / uniqueLeadsGenerated) * 100 : 0;

    return {
      uniqueLeadsGenerated,
      uniqueLeadsPaid,
      realConversion,
      duplicates: duplicates.sort((a, b) => b.count - a.count) // Ordenar por quantidade de duplicatas
    };
  }, [vendas]);

  // Vendas para recuperação (não pagas)
  const recoveryVendas = useMemo(() => {
    if (!vendas) return [];
    return vendas.filter(venda => {
      const lowerCaseStatus = venda.status.toLowerCase();
      return lowerCaseStatus.includes('gerado') || lowerCaseStatus.includes('created') || lowerCaseStatus.includes('pending') || lowerCaseStatus.includes('waiting');
    });
  }, [vendas]);

  // Helper function to detect recovery sales
  const isRecoveryVenda = (venda: Venda): boolean => {
    if (venda.isRecovery === true) return true;

    const utmCampaign = venda.tracking?.utm_campaign?.toLowerCase() || '';
    const utmSource = venda.tracking?.utm_source?.toLowerCase() || '';

    return utmCampaign.includes('rec') ||
      utmSource.includes('rec') ||
      utmCampaign.includes('recuperacao') ||
      utmCampaign.includes('recuperação') ||
      utmSource.includes('recuperacao') ||
      utmSource.includes('recuperação');
  };

  // Receita de recuperação
  const recoveryMetrics = useMemo(() => {
    if (!vendas) return { revenue: 0, count: 0, percentage: 0 };

    const recoveryVendas = vendas.filter(v => {
      const lowerCaseStatus = v.status.toLowerCase();
      const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');
      return isPaid && isRecoveryVenda(v);
    });

    const revenue = recoveryVendas.reduce((sum, v) => sum + v.total_amount, 0);
    const percentage = salesMetrics.totalRevenue > 0 ? (revenue / salesMetrics.totalRevenue) * 100 : 0;

    return {
      revenue,
      count: recoveryVendas.length,
      percentage
    };
  }, [vendas, salesMetrics.totalRevenue]);

  // Ticket médio líquido (usando net_amount se disponível)
  const ticketMedioLiquido = useMemo(() => {
    if (!vendas) return 0;

    const pagas = vendas.filter(v => {
      const lowerCaseStatus = v.status.toLowerCase();
      return lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');
    });

    if (pagas.length === 0) return 0;

    const totalLiquido = pagas.reduce((sum, v) => {
      // Use net_amount if available, otherwise estimate by subtracting fees
      if (v.net_amount) return sum + v.net_amount;

      const gateway = v.gateway?.toLowerCase() || '';
      let fee = 0;

      if (gateway.includes('buckpay')) {
        fee = (v.total_amount * 0.0449) + 1.49;
      } else if (gateway.includes('paradise')) {
        fee = (v.total_amount * 0.015) + 1.49;
      }

      return sum + (v.total_amount - fee);
    }, 0);

    return totalLiquido / pagas.length;
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
            <div className="flex items-center gap-2">
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              <Button variant="outline" size="icon" onClick={() => setIsCustomizeOpen(true)} title="Personalizar Dashboard">
                <Settings2 className="w-4 h-4" />
              </Button>
            </div>

            <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Personalizar Dashboard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {defaultItems.map(id => (
                    <div key={id} className="flex items-center space-x-2">
                      <Checkbox
                        id={id}
                        checked={visibleItems.has(id)}
                        onCheckedChange={() => toggleMetric(id)}
                      />
                      <Label htmlFor={id} className="capitalize">
                        {(() => {
                          const translations: Record<string, string> = {
                            'gateway_sales': 'Gateway Vendas',
                            'source_sales': 'Source Vendas',
                            'campaign_sales': 'Campanha Vendas',
                            'product_sales': 'Produto Vendas',
                            'hourly_sales': 'Vendas por Hora',
                            'hourly_conversion': 'Conversão por Hora',
                            'weekday_sales': 'Vendas por Dia da Semana',
                            'campaign_conversion_table': 'Tabela de Conversão por Campanha'
                          };
                          return translations[id] || id;
                        })()}
                      </Label>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
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
                  title="Fat. Pend. Líquido"
                  value={formatCurrencyBRL(salesMetrics.pendingNetRevenue)}
                  icon={Clock}
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
                <StatCard
                  title="Conversão Real"
                  value={`${uniqueLeadsAnalytics.realConversion.toFixed(1)}%`}
                  icon={Percent}
                  subtitle={`${uniqueLeadsAnalytics.uniqueLeadsPaid}/${uniqueLeadsAnalytics.uniqueLeadsGenerated} leads únicos`}
                />
                <StatCard
                  title="Ticket Médio Líquido"
                  value={formatCurrencyBRL(ticketMedioLiquido)}
                  icon={Wallet}
                />
                <StatCard
                  title="Receita Recuperação"
                  value={formatCurrencyBRL(recoveryMetrics.revenue)}
                  icon={RefreshCcw}
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

              {/* Analytics com Drag and Drop */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                    {items.map((id) => {
                      if (!visibleItems.has(id)) return null;

                      let content = null;
                      let className = "h-full";

                      switch (id) {
                        case 'gateway_sales':
                          content = (
                            <Card className="bg-transparent border-neutral-800 h-full">
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
                                          <p className="text-xs text-muted-foreground">{formatCurrencyBRL(data.netRevenue)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary">{data.count}</Badge>
                                          <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                                              style={{
                                                width: `${(data.count / maxValues.gateway) * 100}%`
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
                          );
                          break;
                        case 'source_sales':
                          content = (
                            <Card className="bg-transparent border-neutral-800 h-full">
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
                                          <p className="text-sm font-medium">{cleanCampaignName(source)}</p>
                                          <p className="text-xs text-muted-foreground">{formatCurrencyBRL(data.netRevenue)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary">{data.count}</Badge>
                                          <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                                              style={{
                                                width: `${(data.count / maxValues.source) * 100}%`
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
                          );
                          break;
                        case 'campaign_sales':
                          content = (
                            <Card className="bg-transparent border-neutral-800 h-full">
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
                                          <p className="text-sm font-medium">{cleanCampaignName(campaign)}</p>
                                          <p className="text-xs text-muted-foreground">{formatCurrencyBRL(data.netRevenue)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary">{data.count}</Badge>
                                          <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                                              style={{
                                                width: `${(data.count / maxValues.campaign) * 100}%`
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
                          );
                          break;
                        case 'product_sales':
                          content = (
                            <Card className="bg-transparent border-neutral-800 h-full">
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
                                          <p className="text-xs text-muted-foreground">{formatCurrencyBRL(data.netRevenue)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary">{data.count}</Badge>
                                          <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
                                              style={{
                                                width: `${(data.count / maxValues.product) * 100}%`
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
                          );
                          break;
                        case 'hourly_sales':
                          content = (
                            <Card className="bg-transparent border-neutral-800 h-full">
                              <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-primary" />
                                  Vendas por Horário
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={hourlyChartData}>
                                    <defs>
                                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis
                                      dataKey="hour"
                                      stroke="#888"
                                      fontSize={11}
                                    />
                                    <YAxis stroke="#888" fontSize={11} />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: '#1f1f1f',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                      }}
                                      labelStyle={{ color: '#fff' }}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="sales"
                                      stroke="#8b5cf6"
                                      strokeWidth={2}
                                      fillOpacity={1}
                                      fill="url(#colorSales)"
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          );
                          break;
                        case 'hourly_conversion':
                          content = (
                            <Card className="bg-transparent border-neutral-800 h-full">
                              <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Percent className="w-4 h-4 text-green-500" />
                                  Conversão Pix por Horário
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={hourlyConversionData}>
                                    <defs>
                                      <linearGradient id="colorConversion" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis
                                      dataKey="hour"
                                      stroke="#888"
                                      fontSize={11}
                                    />
                                    <YAxis
                                      stroke="#888"
                                      fontSize={11}
                                      tickFormatter={(value) => `${value}%`}
                                    />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: '#1f1f1f',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                      }}
                                      labelStyle={{ color: '#fff' }}
                                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Conversão']}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="conversion"
                                      stroke="#10b981"
                                      strokeWidth={2}
                                      fillOpacity={1}
                                      fill="url(#colorConversion)"
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          );
                          break;
                        case 'weekday_sales':
                          content = (
                            <Card className="bg-transparent border-neutral-800 h-full">
                              <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-blue-500" />
                                  Vendas por Dia da Semana
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={weekdayChartData}>
                                    <defs>
                                      <linearGradient id="colorWeekday" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis
                                      dataKey="day"
                                      stroke="#888"
                                      fontSize={11}
                                    />
                                    <YAxis stroke="#888" fontSize={11} />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: '#1f1f1f',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                      }}
                                      labelStyle={{ color: '#fff' }}
                                      formatter={(value: number, name: string) => {
                                        if (name === 'revenue') return [formatCurrencyBRL(value), 'Receita'];
                                        return [value, 'Vendas'];
                                      }}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="sales"
                                      stroke="#3b82f6"
                                      strokeWidth={2}
                                      fillOpacity={1}
                                      fill="url(#colorWeekday)"
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          );
                          break;
                        case 'campaign_conversion_table':
                          className = "md:col-span-2 xl:col-span-2 h-full";
                          content = (
                            <Card className="bg-transparent border-neutral-800 h-full flex flex-col">
                              <CardHeader>
                                <CardTitle className="text-base">Conversão por Campanha/Criativo</CardTitle>
                              </CardHeader>
                              <CardContent className="flex-1 overflow-hidden">
                                <div className="border border-neutral-800 rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
                                  <Table>
                                    <TableHeader className="sticky top-0 bg-neutral-900 z-10">
                                      <TableRow className="border-neutral-800">
                                        <TableHead>Campanha</TableHead>
                                        <TableHead className="text-center">Gerados</TableHead>
                                        <TableHead className="text-center">Pagos</TableHead>
                                        <TableHead className="text-right">Receita</TableHead>
                                        <TableHead className="text-center">Conv.</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {Object.entries(trackingAnalytics.byCampaign).length > 0 ? (
                                        Object.entries(trackingAnalytics.byCampaign)
                                          .sort(([, a], [, b]) => b.revenue - a.revenue)
                                          .map(([campaign, data]) => {
                                            const convRate = data.generated > 0 ? ((data.count / data.generated) * 100) : 0;
                                            return (
                                              <TableRow key={campaign} className="border-neutral-800">
                                                <TableCell className="font-medium max-w-[200px] truncate" title={cleanCampaignName(campaign)}>
                                                  {cleanCampaignName(campaign)}
                                                </TableCell>
                                                <TableCell className="text-center">{data.generated}</TableCell>
                                                <TableCell className="text-center">
                                                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                                    {data.count}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrencyBRL(data.revenue)}</TableCell>
                                                <TableCell className="text-center">
                                                  <Badge
                                                    variant="outline"
                                                    className={cn(
                                                      convRate >= 50 ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                        convRate >= 25 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                                          "bg-red-500/10 text-red-500 border-red-500/20"
                                                    )}
                                                  >
                                                    {convRate.toFixed(1)}%
                                                  </Badge>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })
                                      ) : (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Sem dados de campanha.</TableCell></TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CardContent>
                            </Card>
                          );
                          break;
                      }

                      return (
                        <SortableCard key={id} id={id} className={className}>
                          {content}
                        </SortableCard>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

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
