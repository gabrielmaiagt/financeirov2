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
import { Loader2, PackageCheck, PackagePlus, Server, Copy, Trash2, TrendingUp, Percent, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
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
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export interface Venda {
  id: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  value?: number;
  gateway?: string;
  receivedAt: Timestamp;
  payload: any;
}

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


const formatCurrency = (value: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

  const vendasQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'vendas'), orderBy('receivedAt', 'desc')) : null),
    [firestore]
  );

  const { data: vendas, isLoading } = useCollection<Venda>(vendasQuery);
  
  const salesMetrics = useMemo(() => {
    if (!vendas) return { paidCount: 0, generatedCount: 0, conversionRate: 0 };

    let paidCount = 0;
    let generatedCount = 0;

    vendas.forEach(venda => {
        const lowerCaseStatus = venda.status.toLowerCase();
        const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');
        const isGenerated = lowerCaseStatus.includes('gerado') || lowerCaseStatus.includes('created') || lowerCaseStatus.includes('pending');

        if (isPaid) {
            paidCount++;
        }
        if (isGenerated) {
            generatedCount++;
        }
    });
    
    // To avoid double counting when a transaction moves from 'pending' to 'paid', we make an assumption
    // that a paid transaction was once generated. So we add paid to generated.
    // A better approach would require transaction IDs to de-duplicate, but this is a good approximation.
    const totalGenerated = generatedCount + paidCount;
    const conversionRate = totalGenerated > 0 ? (paidCount / totalGenerated) * 100 : 0;

    return {
        paidCount,
        generatedCount: totalGenerated,
        conversionRate,
    }

  }, [vendas]);

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
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><PackageCheck className="w-3 h-3 mr-1"/> PIX Pago</Badge>;
    }
    if (isGenerated) {
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><PackagePlus className="w-3 h-3 mr-1"/> PIX Gerado</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  }
  
  const handleClearSales = async () => {
    if (!firestore) {
      toast({ variant: "destructive", title: "Erro", description: "O serviço de banco de dados não está disponível."});
      return;
    }
    
    try {
      const vendasRef = collection(firestore, 'vendas');
      const querySnapshot = await getDocs(vendasRef);
      
      if (querySnapshot.empty) {
        toast({ title: "Tudo limpo!", description: "Não há vendas para apagar."});
        return;
      }

      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();

      toast({ title: "Sucesso!", description: "Todos os registros de vendas foram apagados."});
    } catch (error) {
      console.error("Erro ao limpar as vendas:", error);
      toast({ variant: "destructive", title: "Erro ao limpar", description: "Não foi possível apagar os registros de vendas."});
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

  return (
    <>
      <Card className="bg-transparent border-neutral-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Feed de Vendas em Tempo Real</CardTitle>
            <Button variant="outline" size="icon" onClick={() => setIsClearAlertOpen(true)} disabled={isLoading || !vendas || vendas.length === 0}>
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Limpar Vendas</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                    title="Total PIX Gerado"
                    value={salesMetrics.generatedCount.toString()}
                    icon={FileText}
                />
                <StatCard 
                    title="Total PIX Pago"
                    value={salesMetrics.paidCount.toString()}
                    icon={TrendingUp}
                />
                 <StatCard 
                    title="Taxa de Conversão"
                    value={`${salesMetrics.conversionRate.toFixed(1)}%`}
                    icon={Percent}
                />
            </div>
          <div className="border border-neutral-800 rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-800">
                  <TableHead>Horário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24"><div className="flex justify-center items-center"><Loader2 className="w-5 h-5 animate-spin mr-2"/> Carregando vendas...</div></TableCell></TableRow>
                ) : vendas && vendas.length > 0 ? (
                  vendas.map((venda) => (
                    <TableRow key={venda.id} className="border-neutral-800">
                      <TableCell className="text-muted-foreground text-xs">
                         <TimeAgo date={venda.receivedAt?.toDate()} />
                      </TableCell>
                      <TableCell>{getStatusBadge(venda.status)}</TableCell>
                      <TableCell>
                          <Badge variant="outline"><Server className="w-3 h-3 mr-1"/> {venda.gateway || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                          <div className="flex flex-col">
                              <span className="font-bold">{venda.customerName || 'N/A'}</span>
                              {venda.customerEmail && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      {venda.customerEmail}
                                      <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => copyToClipboard(venda.customerEmail, 'Email')}>
                                          <Copy className="w-3 h-3" />
                                      </Button>
                                  </div>
                              )}
                              {venda.customerPhone && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      {venda.customerPhone}
                                      <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => copyToClipboard(venda.customerPhone, 'Telefone')}>
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
                          {formatCurrency(venda.value || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(venda.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Aguardando novos eventos de venda...</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita e excluirá permanentemente **todos** os registros de vendas.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearSales} className="bg-red-600 hover:bg-red-700">Sim, Limpar Tudo</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    
      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação não pode ser desfeita e excluirá permanentemente este registro de venda.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                if (itemToDelete) {
                    handleDeleteSale(itemToDelete);
                }
                setItemToDelete(null);
            }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default VendasBoard;
