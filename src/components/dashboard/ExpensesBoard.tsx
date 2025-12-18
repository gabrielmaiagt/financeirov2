'use client';
import { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import ExpenseForm from './ExpenseForm';
import { useOrganization } from '@/contexts/OrganizationContext';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  data: Timestamp;
  categoria: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const ExpensesBoard = () => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const expensesQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'despesas'), orderBy('data', 'desc')) : null),
    [firestore, orgId]
  );

  const { data: expenses, isLoading } = useCollection<Despesa>(expensesQuery);

  const handleSaveExpense = (expenseData: Omit<Despesa, 'id'>) => {
    if (!firestore || !orgId) return;
    const expensesRef = collection(firestore, 'organizations', orgId, 'despesas');
    addDocumentNonBlocking(expensesRef, expenseData);
    setIsDialogOpen(false);
  };

  const handleDeleteExpense = (id: string) => {
    if (!firestore || !orgId) return;
    deleteDocumentNonBlocking(doc(firestore, 'organizations', orgId, 'despesas', id));
  };

  const totalExpenses = expenses?.reduce((acc, expense) => acc + expense.valor, 0) || 0;

  return (
    <Card className="bg-transparent border-neutral-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Controle de Despesas</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg p-0 flex flex-col">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle>Adicionar Nova Despesa</DialogTitle>
                <DialogDescription>
                  Registre um novo gasto da operação.
                </DialogDescription>
              </DialogHeader>
              <ExpenseForm onSave={handleSaveExpense as any} onClose={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border border-neutral-800 rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-800">
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center w-[50px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">Carregando despesas...</TableCell></TableRow>
              ) : expenses && expenses.length > 0 ? (
                expenses.map((expense) => (
                  <TableRow key={expense.id} className="border-neutral-800">
                    <TableCell>{format(expense.data.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="font-medium">{expense.descricao}</TableCell>
                    <TableCell>{expense.categoria}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.valor)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(expense.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center h-24">Nenhuma despesa registrada.</TableCell></TableRow>
              )}
            </TableBody>
            <TableFooter className="border-neutral-800">
              <TableRow>
                <TableCell colSpan={3} className="font-bold text-lg">Total de Despesas</TableCell>
                <TableCell className="text-right font-bold text-lg text-red-500">{formatCurrency(totalExpenses)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita e excluirá permanentemente esta despesa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (itemToDelete) {
                handleDeleteExpense(itemToDelete);
              }
              setItemToDelete(null);
            }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ExpensesBoard;
