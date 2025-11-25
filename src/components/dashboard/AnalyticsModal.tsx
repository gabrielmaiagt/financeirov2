'use client';
import { useMemo } from 'react';
import { Operacao } from '@/app/page';
import { DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, PieChart, Pie, Cell, Sector } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

interface AnalyticsModalProps {
  operacoes: Operacao[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/80 backdrop-blur-sm border border-neutral-800 p-4 rounded-lg shadow-lg">
          <p className="label font-bold">{label}</p>
          {payload.map((pld: any) => (
            <p key={pld.dataKey} style={{ color: pld.color }}>
              {`${pld.name}: ${formatCurrency(pld.value)}`}
            </p>
          ))}
        </div>
      );
    }
  
    return null;
};

const AnalyticsModal = ({ operacoes }: AnalyticsModalProps) => {
  const lineChartData = useMemo(() => {
    const sortedOps = [...operacoes].sort((a, b) => a.data.toDate().getTime() - b.data.toDate().getTime());

    const groupedByDay = sortedOps.reduce((acc, op) => {
      const date = format(op.data.toDate(), 'dd/MM');
      if (!acc[date]) {
        acc[date] = { date, faturamentoLiquido: 0, gastoAnuncio: 0, lucroLiquido: 0 };
      }
      acc[date].faturamentoLiquido += op.faturamentoLiquido;
      acc[date].gastoAnuncio += op.gastoAnuncio;
      acc[date].lucroLiquido += op.lucroLiquido;
      return acc;
    }, {} as { [key: string]: { date: string; faturamentoLiquido: number; gastoAnuncio: number; lucroLiquido: number } });

    return Object.values(groupedByDay);
  }, [operacoes]);

  const pieChartData = useMemo(() => {
    const totals = operacoes.reduce(
      (acc, op) => {
        acc.valorCabral += op.valorCabral > 0 ? op.valorCabral : 0;
        acc.valorBiel += op.valorBiel > 0 ? op.valorBiel : 0;
        acc.valorSoares += op.valorSoares > 0 ? op.valorSoares : 0;
        return acc;
      },
      { valorCabral: 0, valorBiel: 0, valorSoares: 0 }
    );

    return [
      { name: 'Biel', value: totals.valorBiel },
      { name: 'Soares', value: totals.valorSoares },
      { name: 'Cabral (Lucro)', value: totals.valorCabral },
    ];
  }, [operacoes]);

  const COLORS = ['#34D399', '#FBBF24', '#60A5FA'];

  return (
    <div className="flex flex-col h-[85vh]">
      <DialogHeader className="p-6 pb-4">
        <DialogTitle className="text-2xl">Análise Financeira</DialogTitle>
        <DialogDescription>
          Gráficos de desempenho baseados no período selecionado.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="flex-1">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2 border-neutral-800 bg-transparent">
                <CardHeader>
                    <CardTitle>Evolução Financeira Diária</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer>
                            <LineChart data={lineChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value as number)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line type="monotone" dataKey="faturamentoLiquido" name="Faturamento" stroke="#38bdf8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="gastoAnuncio" name="Gasto" stroke="#f472b6" strokeWidth={2} />
                                <Line type="monotone" dataKey="lucroLiquido" name="Lucro" stroke="#4ade80" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-neutral-800 bg-transparent">
                <CardHeader>
                    <CardTitle>Divisão do Lucro (Positivo)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                        const RADIAN = Math.PI / 180;
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                        return (
                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                        );
                                    }}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default AnalyticsModal;

    