'use client';

import { useState } from 'react';
import { Operacao } from '@/app/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, MoreHorizontal, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import OperationForm from './OperationForm';
import AnalyticsModal from './AnalyticsModal';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useSound } from '@/hooks/use-sound';
import { UserProfile } from './ProfileCard';
import { useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { cn } from '@/lib/utils';
import { usePrivacy } from '@/providers/PrivacyProvider';
import { sendPushNotification } from '@/lib/client-utils';

interface OperationsTableProps {
  operacoes: Operacao[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const RECORD_FATURAMENTO = 828.40;

const OperationsTable = ({
  operacoes,
  isLoading,
  onDelete,
  searchTerm,
  setSearchTerm,
}: OperationsTableProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const firestore = useFirestore();
  const { play } = useSound();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingOperation, setEditingOperation] = useState<Operacao | null>(null);

  const profilesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'perfis') : null),
    [firestore]
  );
  const { data: profiles } = useCollection<UserProfile>(profilesQuery);
  const { isBlurred } = usePrivacy();


  const handleSaveOperation = (operation: Omit<Operacao, 'id'>) => {
    if (!firestore) return;

    if (operation.faturamentoLiquido > RECORD_FATURAMENTO) {
      // Since auth is removed, we can't tie sound to a specific user.
      // We'll just check if a general record-breaking sound is set on any profile.
      const recordSound = profiles?.find(p => p.sounds?.recordBroken)?.sounds?.recordBroken;
      if (recordSound) {
        play(recordSound);
      }
      const notificationsRef = collection(firestore, 'notificacoes');
      const notificationMessage = `Novo valor: ${formatCurrency(operation.faturamentoLiquido)}`;
      const notificationTitle = `🎉 Recorde de faturamento quebrado!`;

      addDocumentNonBlocking(notificationsRef, {
        message: notificationMessage,
        createdAt: Timestamp.now(),
        read: false,
        type: 'record_broken'
      });

      // Send push notification
      sendPushNotification(notificationTitle, notificationMessage, '/');
    }

    if (editingOperation) {
      const docRef = doc(firestore, 'operacoesSocios', editingOperation.id!);
      updateDocumentNonBlocking(docRef, operation);
    } else {
      const operacoesRef = collection(firestore, 'operacoesSocios');
      addDocumentNonBlocking(operacoesRef, operation);
    }

    handleFormDialogChange(false);
  };

  const handleEdit = (op: Operacao) => {
    setEditingOperation(op);
    setIsFormOpen(true);
  };

  const handleOpenNew = () => {
    setEditingOperation(null);
    setIsFormOpen(true);
  }

  const handleFormDialogChange = (open: boolean) => {
    if (!open) {
      setEditingOperation(null);
    }
    setIsFormOpen(open);
  }


  const summary = operacoes.reduce(
    (acc, op) => {
      acc.faturamentoLiquido += op.faturamentoLiquido;
      acc.gastoAnuncio += op.gastoAnuncio;
      acc.lucroLiquido += op.lucroLiquido;
      acc.totalCabral += op.totalCabral;
      acc.valorBiel += op.valorBiel;
      acc.valorSoares += op.valorSoares;
      return acc;
    },
    {
      faturamentoLiquido: 0,
      gastoAnuncio: 0,
      lucroLiquido: 0,
      totalCabral: 0,
      valorBiel: 0,
      valorSoares: 0,
    }
  );

  const sensitiveKeywords = ['Madames Online', 'Minha Coroa'];
  const getCellContent = (text: string) => {
    if (isBlurred && sensitiveKeywords.some(keyword => text.includes(keyword))) {
      return <span className="sensitive-data">{text}</span>
    }
    return text;
  }

  return (
    <Card className="bg-transparent border-neutral-800">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <CardTitle>Lançamentos Registrados</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[250px]"
            />
            <Button variant="outline" onClick={() => setIsAnalyticsOpen(true)}>
              <BarChart2 className="mr-2 h-4 w-4" /> Ver Gráficos
            </Button>
            <Dialog open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
              <DialogContent className="max-w-4xl p-0">
                <AnalyticsModal operacoes={operacoes} />
              </DialogContent>
            </Dialog>

            <Dialog open={isFormOpen} onOpenChange={handleFormDialogChange}>
              <Button onClick={handleOpenNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Novo Lançamento
              </Button>
              <DialogContent className="sm:max-w-3xl p-0 flex flex-col">
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle>{editingOperation ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
                  <DialogDescription>
                    {editingOperation ? 'Ajuste os dados da operação.' : 'Preencha os dados da operação para calcular a divisão.'}
                  </DialogDescription>
                </DialogHeader>
                <OperationForm onSave={handleSaveOperation} onClose={() => handleFormDialogChange(false)} existingOperation={editingOperation} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border border-neutral-800 rounded-md max-h-[500px] overflow-y-auto relative">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
              <TableRow className="border-neutral-800">
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Fat. Líquido</TableHead>
                <TableHead className="text-right">Gasto Anúncio</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Lucro Líquido</TableHead>
                <TableHead className="text-right">Cabral</TableHead>
                <TableHead className="text-right">Biel</TableHead>
                <TableHead className="text-right">Soares</TableHead>
                <TableHead className="text-right font-bold">Total Cabral</TableHead>
                <TableHead className="text-center w-[50px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center h-24">Carregando lançamentos...</TableCell></TableRow>
              ) : operacoes.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center h-24">Nenhum lançamento encontrado para o período.</TableCell></TableRow>
              ) : (
                operacoes.map((op) => (
                  <TableRow key={op.id} className="table-row-animate border-neutral-800">
                    <TableCell>{op.data?.toDate ? format(op.data.toDate(), 'dd/MM/yy') : 'N/A'}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{getCellContent(op.descricao)}</TableCell>
                    <TableCell className="text-right sensitive-data">{formatCurrency(op.faturamentoLiquido)}</TableCell>
                    <TableCell className="text-right sensitive-data">{formatCurrency(op.gastoAnuncio)}</TableCell>
                    <TableCell className="text-right sensitive-data">{formatCurrency(op.taxaGateway)}</TableCell>
                    <TableCell className={cn('text-right font-semibold sensitive-data', op.lucroLiquido < 0 ? 'text-red-500' : 'text-green-500')}>{formatCurrency(op.lucroLiquido)}</TableCell>
                    <TableCell className="text-right sensitive-data">{formatCurrency(op.valorCabral)}</TableCell>
                    <TableCell className="text-right sensitive-data">{formatCurrency(op.valorBiel)}</TableCell>
                    <TableCell className="text-right sensitive-data">{formatCurrency(op.valorSoares)}</TableCell>
                    <TableCell className="text-right font-bold text-blue-400 sensitive-data">{formatCurrency(op.totalCabral)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(op)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setItemToDelete(op.id!)} className="text-destructive">
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {operacoes.length > 0 && (
              <TableFooter className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-neutral-800">
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">Resumo do Período</TableCell>
                  <TableCell className="text-right font-bold sensitive-data">{formatCurrency(summary.faturamentoLiquido)}</TableCell>
                  <TableCell className="text-right font-bold sensitive-data">{formatCurrency(summary.gastoAnuncio)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className={cn('text-right font-bold sensitive-data', summary.lucroLiquido < 0 ? 'text-red-500' : 'text-green-500')}>{formatCurrency(summary.lucroLiquido)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-bold text-green-400 sensitive-data">{formatCurrency(summary.valorBiel)}</TableCell>
                  <TableCell className="text-right font-bold text-yellow-400 sensitive-data">{formatCurrency(summary.valorSoares)}</TableCell>
                  <TableCell className="text-right font-bold text-blue-400 sensitive-data">{formatCurrency(summary.totalCabral)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>

        <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso excluirá permanentemente o lançamento e removerá os dados de nossos servidores.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (itemToDelete) {
                  onDelete(itemToDelete);
                }
                setItemToDelete(null);
              }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default OperationsTable;
