'use client';

import { Operacao } from '@/app/page';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp, PiggyBank, Briefcase, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/animated-number';


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const MetricCard = ({ title, value, icon: Icon, colorClass, rawValue }: { title: string, value: string, icon: React.ElementType, colorClass?: string, rawValue?: number }) => (
  <Card className={cn("bg-neutral-900/50 border-neutral-800 w-full card-hover", colorClass)}>
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
    </CardContent>
  </Card>
);


const SummaryCards = ({ operacoes, totalCashReserve }: { operacoes: Operacao[], totalCashReserve?: number }) => {
  const totals = useMemo(() => {
    return operacoes.reduce(
      (acc, op) => {
        acc.faturamentoLiquido += op.faturamentoLiquido || 0;
        acc.gastoAnuncio += op.gastoAnuncio || 0;
        acc.lucroLiquido += op.lucroLiquido || 0;
        acc.totalCabral += op.totalCabral || 0;
        acc.valorBiel += op.valorBiel || 0;
        acc.valorSoares += op.valorSoares || 0;
        acc.cashReserve += op.cashReserveValue || 0;
        return acc;
      },
      {
        faturamentoLiquido: 0,
        gastoAnuncio: 0,
        lucroLiquido: 0,
        totalCabral: 0,
        valorBiel: 0,
        valorSoares: 0,
        cashReserve: 0,
      }
    );
  }, [operacoes]);

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
      <MetricCard
        title="Caixa da Empresa (Acumulado)"
        value={formatCurrency(totalCashReserve ?? totals.cashReserve)}
        rawValue={totalCashReserve ?? totals.cashReserve}
        icon={PiggyBank}
        colorClass="stat-card-indigo"
      />
    </div>
  );
};

export default SummaryCards;
