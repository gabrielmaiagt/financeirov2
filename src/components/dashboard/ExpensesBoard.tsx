'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, where, limit, QueryConstraint } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Edit, Search, X, Download, Filter, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import ExpenseForm from './ExpenseForm';
import { useOrganization } from '@/contexts/OrganizationContext';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange as DayPickerDateRange } from 'react-day-picker';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  data: Timestamp;
  categoria: string;
  recorrente?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const CATEGORIAS = ['Ferramenta', 'Assinatura', 'Infraestrutura', 'Outros'];

const CATEGORIA_COLORS: Record<string, string> = {
  'Ferramenta': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Assinatura': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Infraestrutura': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Outros': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const CHART_COLORS = ['#3b82f6', '#a855f7', '#f97316', '#6b7280'];

const ExpensesBoard = () => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Despesa | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DayPickerDateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });
  const [sortBy, setSortBy] = useState<'data' | 'valor' | 'categoria'>('data');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !orgId) return null;
    const colRef = collection(firestore, 'organizations', orgId, 'despesas');

    const constraints: QueryConstraint[] = [orderBy('data', 'desc')];

    if (dateRange?.from) {
      constraints.push(where('data', '>=', Timestamp.fromDate(dateRange.from)));
      // dateRange.to pode ser undefined se o usuário selecionar só start
      const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      constraints.push(where('data', '<=', Timestamp.fromDate(end)));
    } else {
      constraints.push(limit(50));
    }

    return query(colRef, ...constraints);
  }, [firestore, orgId, dateRange]);

  const { data: allExpenses, isLoading } = useCollection<Despesa>(expensesQuery);

  // Aplicar filtros
  const filteredExpenses = useMemo(() => {
    if (!allExpenses) return [];

    let filtered = allExpenses;

    // Filtro por data
    if (dateRange?.from) {
      const startDate = dateRange.from;
      const endDate = dateRange.to || dateRange.from;
      filtered = filtered.filter(expense => {
        const expenseDate = expense.data.toDate();
        const start = new Date(startDate.setHours(0, 0, 0, 0));
        const end = new Date(endDate.setHours(23, 59, 59, 999));
        return expenseDate >= start && expenseDate <= end;
      });
    }

    // Filtro por categoria
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(expense => expense.categoria === selectedCategory);
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenação
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'data':
          comparison = a.data.toMillis() - b.data.toMillis();
          break;
        case 'valor':
          comparison = a.valor - b.valor;
          break;
        case 'categoria':
          comparison = a.categoria.localeCompare(b.categoria);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allExpenses, dateRange, selectedCategory, searchTerm, sortBy, sortOrder]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((acc, expense) => acc + expense.valor, 0);
    const count = filteredExpenses.length;
    const average = count > 0 ? total / count : 0;
    const max = count > 0 ? Math.max(...filteredExpenses.map(e => e.valor)) : 0;

    // Gastos por categoria
    const byCategory = filteredExpenses.reduce((acc, expense) => {
      acc[expense.categoria] = (acc[expense.categoria] || 0) + expense.valor;
      return acc;
    }, {} as Record<string, number>);

    return { total, count, average, max, byCategory };
  }, [filteredExpenses]);

  // Dados para o gráfico
  const chartData = useMemo(() => {
    return Object.entries(stats.byCategory).map(([name, value], index) => ({
      name,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [stats.byCategory]);

  const handleSaveExpense = (expenseData: Omit<Despesa, 'id'>) => {
    if (!firestore || !orgId) return;

    if (editingExpense) {
      // Atualizar
      const docRef = doc(firestore, 'organizations', orgId, 'despesas', editingExpense.id);
      updateDocumentNonBlocking(docRef, expenseData);
      setEditingExpense(null);
    } else {
      // Criar novo
      const expensesRef = collection(firestore, 'organizations', orgId, 'despesas');
      addDocumentNonBlocking(expensesRef, expenseData);
    }

    setIsDialogOpen(false);
  };

  const handleDeleteExpense = (id: string) => {
    if (!firestore || !orgId) return;
    deleteDocumentNonBlocking(doc(firestore, 'organizations', orgId, 'despesas', id));
  };

  const handleEditExpense = (expense: Despesa) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingExpense(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfDay(new Date()),
    });
  };

  const exportToCSV = () => {
    if (!filteredExpenses.length) return;

    const headers = ['Data', 'Descrição', 'Categoria', 'Valor'];
    const rows = filteredExpenses.map(expense => [
      format(expense.data.toDate(), 'dd/MM/yyyy'),
      expense.descricao,
      expense.categoria,
      expense.valor.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `despesas_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  const hasActiveFilters = searchTerm || selectedCategory !== 'all';

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(stats.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.count} despesa(s) no período</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.average)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valor médio</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maior Despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.max)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valor mais alto</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Categorias ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Despesas por Categoria */}
      {chartData.length > 0 && (
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Lista de Despesas */}
      <Card className="bg-transparent border-neutral-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Controle de Despesas</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!filteredExpenses.length}>
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nova Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingExpense ? 'Editar Despesa' : 'Adicionar Nova Despesa'}</DialogTitle>
                    <DialogDescription>
                      {editingExpense ? 'Modifique os dados da despesa.' : 'Registre um novo gasto da operação.'}
                    </DialogDescription>
                  </DialogHeader>
                  <ExpenseForm
                    onSave={handleSaveExpense as any}
                    onClose={() => handleOpenChange(false)}
                    existingExpense={editingExpense}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Filtros</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2">
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Categoria */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {CATEGORIAS.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Ordenação */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [by, order] = value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(by);
                setSortOrder(order);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data-desc">Data (mais recente)</SelectItem>
                  <SelectItem value="data-asc">Data (mais antiga)</SelectItem>
                  <SelectItem value="valor-desc">Valor (maior)</SelectItem>
                  <SelectItem value="valor-asc">Valor (menor)</SelectItem>
                  <SelectItem value="categoria-asc">Categoria (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full"
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="border border-neutral-800 rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-800">
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">Carregando despesas...</TableCell></TableRow>
                ) : filteredExpenses && filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="border-neutral-800">
                      <TableCell>{format(expense.data.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell className="font-medium">{expense.descricao}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CATEGORIA_COLORS[expense.categoria] || CATEGORIA_COLORS['Outros']}>
                          {expense.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(expense.valor)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setItemToDelete(expense.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      {hasActiveFilters ? 'Nenhuma despesa encontrada com os filtros aplicados.' : 'Nenhuma despesa registrada.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default ExpensesBoard;
