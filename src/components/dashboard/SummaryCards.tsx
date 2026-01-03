'use client';

import { Operacao } from '@/app/page';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp, PiggyBank, Briefcase, User, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useFirestore, useCollection } from '@/firebase';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import { Despesa } from './ExpensesBoard';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ReimbursementManager } from './ReimbursementManager';
import { Button } from '@/components/ui/button';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const MetricCard = ({ title, value, icon: Icon, colorClass, rawValue, subValue, action }: { title: string, value: string, icon: React.ElementType, colorClass?: string, rawValue?: number, subValue?: React.ReactNode, action?: React.ReactNode }) => (
  <Card className={cn("bg-neutral-900/50 border-neutral-800 w-full card-hover relative overflow-hidden", colorClass)}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-neutral-400">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold sensitive-data number-animate">
        {rawValue !== undefined ? (
          <AnimatedNumber value={rawValue} formatter={formatCurrency} />
        ) : (
          value
        )}
      </div>
      {subValue && (
        <div className="mt-2 text-xs">
          {subValue}
        </div>
      )}
      {action && (
        <div className="absolute bottom-2 right-2">
          {action}
        </div>
      )}
    </CardContent>
  </Card>
);


const SummaryCards = ({ operacoes, totalCashReserve }: { operacoes: Operacao[], totalCashReserve?: number }) => {
  const { orgId } = useOrganization();
  const firestore = useFirestore();

  // Fetch all expenses to calculate real balance
  // In a large app, this should be an aggregate query or a separate stats document.
  // For now, fetching list is acceptable for typical usage scale.
  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !orgId) return null;
    return collection(firestore, 'organizations', orgId, 'despesas');
  }, [firestore, orgId]);

  const { data: allExpenses } = useCollection<Despesa>(expensesQuery);

  const financialStats = useMemo(() => {
    if (!allExpenses) return { totalPaid: 0, totalPending: 0, pendingList: [] };

    let totalPaid = 0;
    let totalPending = 0;
    const pendingList: Despesa[] = [];

    allExpenses.forEach(exp => {
      if (exp.reimbursementStatus === 'pending') {
        totalPending += exp.valor;
        pendingList.push(exp);
      } else {
        // Paid by company OR Reimbursed (which means paid by company)
        totalPaid += exp.valor;
      }
    });

    return { totalPaid, totalPending, pendingList };
  }, [allExpenses]);


  const totals = useMemo(() => {
    return operacoes.reduce(
      (acc, op) => {
        acc.faturamentoLiquido += op.faturamentoLiquido || 0;
        acc.gastoAnuncio += op.gastoAnuncio || 0;
        acc.lucroLiquido += op.lucroLiquido || 0;
        acc.totalCabral += op.totalCabral || 0;
        acc.valorBiel += op.valorBiel || 0;
        acc.valorSoares += op.valorSoares || 0;
        // cashReserve from operations is just INPUT flow.
        // We use totalCashReserve prop (aggregate) as the source of truth for Inputs.
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
  }, [operacoes]);

  // Real Cash Balance = Total Inputs (Reserve) - Total Outputs (Expenses paid by company)
  const realCashBalance = (totalCashReserve || 0) - financialStats.totalPaid;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        title="Total Faturado (Líquido)"
        value={formatCurrency(totals.faturamentoLiquido)}
        rawValue={totals.faturamentoLiquido}
        icon={DollarSign}
        colorClass="stat-card-green"
      />
      <MetricCard
        title="Total Gasto em Anúncios"
        value={formatCurrency(totals.gastoAnuncio)}
        rawValue={totals.gastoAnuncio}
        icon={TrendingDown}
        colorClass="stat-card-orange"
      />
      <MetricCard
        title="Lucro Líquido Total"
        value={formatCurrency(totals.lucroLiquido)}
        rawValue={totals.lucroLiquido}
        icon={TrendingUp}
        colorClass="stat-card-blue"
      />
      <MetricCard
        title="Cabral – Total a Receber"
        value={formatCurrency(totals.totalCabral)}
        rawValue={totals.totalCabral}
        icon={Briefcase}
        colorClass="stat-card-purple"
      />

      {/* Cards de Sócios removidos ou mantidos? User não falou sobre eles, vou manter mas reduzir se precisar de espaço. 
          Vou manter pois o user gosta de ver.
      */}
      <MetricCard
        title="Biel – Lucro Total"
        value={formatCurrency(totals.valorBiel)}
        rawValue={totals.valorBiel}
        icon={User}
        colorClass="stat-card-red"
      />
      <MetricCard
        title="Soares – Lucro Total"
        value={formatCurrency(totals.valorSoares)}
        rawValue={totals.valorSoares}
        icon={User}
        colorClass="stat-card-green"
      />

      {/* NOVO CARD DE CAIXA */}
      <Card className="bg-neutral-900/50 border-neutral-800 w-full card-hover stat-card-indigo col-span-1 md:col-span-2 lg:col-span-1 relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-neutral-400">Caixa da Empresa (Real)</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold sensitive-data number-animate mb-2">
            <AnimatedNumber value={realCashBalance} formatter={formatCurrency} />
          </div>

          {financialStats.totalPending > 0 && (
            <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded p-2 text-xs text-red-400">
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Reembolsos: {formatCurrency(financialStats.totalPending)}</span>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 px-2 text-xs hover:bg-red-500/20 text-red-400">
                    Quitar <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Reembolsos Pendentes</DialogTitle>
                    <DialogDescription>
                      Selecione as despesas pagas pelos sócios que você deseja quitar usando o caixa da empresa.
                    </DialogDescription>
                  </DialogHeader>
                  <ReimbursementManager pendingExpenses={financialStats.pendingList} />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {financialStats.totalPending === 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Tudo em dia
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryCards;
