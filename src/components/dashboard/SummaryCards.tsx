'use client';

import { Operacao } from '@/app/page';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp, PiggyBank, Briefcase, User } from 'lucide-react';
import { cn } from '@/lib/utils';


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const MetricCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: string, icon: React.ElementType, colorClass?: string }) => (
  <Card className={cn("bg-neutral-900/50 border-neutral-800 w-full card-hover", colorClass)}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-neutral-400">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold sensitive-data number-animate">{value}</div>
    </CardContent>
  </Card>
);


const SummaryCards = ({ operacoes }: { operacoes: Operacao[] }) => {
  const totals = useMemo(() => {
    return operacoes.reduce(
      (acc, op) => {
        acc.faturamentoLiquido += op.faturamentoLiquido || 0;
        acc.gastoAnuncio += op.gastoAnuncio || 0;
        acc.lucroLiquido += op.lucroLiquido || 0;
        acc.totalCabral += op.totalCabral || 0;
        acc.valorBiel += op.valorBiel || 0;
        acc.valorSoares += op.valorSoares || 0;
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        title="Total Faturado (Líquido)"
        value={formatCurrency(totals.faturamentoLiquido)}
        icon={DollarSign}
        colorClass="stat-card-green"
      />
      <MetricCard
        title="Total Gasto em Anúncios"
        value={formatCurrency(totals.gastoAnuncio)}
        icon={TrendingDown}
        colorClass="stat-card-orange"
      />
      <MetricCard
        title="Lucro Líquido Total"
        value={formatCurrency(totals.lucroLiquido)}
        icon={TrendingUp}
        colorClass="stat-card-blue"
      />
      <MetricCard
        title="Cabral – Total a Receber"
        value={formatCurrency(totals.totalCabral)}
        icon={Briefcase}
        colorClass="stat-card-purple"
      />
      <MetricCard
        title="Biel – Lucro Total"
        value={formatCurrency(totals.valorBiel)}
        icon={User}
        colorClass="stat-card-red"
      />
      <MetricCard
        title="Soares – Lucro Total"
        value={formatCurrency(totals.valorSoares)}
        icon={User}
        colorClass="stat-card-green"
      />
    </div>
  );
};

export default SummaryCards;
