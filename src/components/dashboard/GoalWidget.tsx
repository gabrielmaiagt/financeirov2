'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Trophy, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrencyBRL } from '@/lib/formatters';

const GoalWidget = () => {
    const firestore = useFirestore();
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const vendasQuery = useMemoFirebase(
        () => {
            if (!firestore) return null;
            return query(
                collection(firestore, 'vendas'),
                where('created_at', '>=', Timestamp.fromDate(start)),
                where('created_at', '<=', Timestamp.fromDate(end))
            );
        },
        [firestore] // Dependencies for useMemoFirebase
    );

    const { data: vendas, isLoading } = useCollection(vendasQuery);

    const metrics = useMemo(() => {
        if (!vendas) return { revenue: 0 };

        const revenue = vendas.reduce((acc: number, venda: any) => {
            if (venda.status === 'paid') {
                return acc + (venda.value || venda.total_amount || 0);
            }
            return acc;
        }, 0);

        return { revenue };
    }, [vendas]);

    const GOAL = 10000; // 10k goal
    const progress = Math.min((metrics.revenue / GOAL) * 100, 100);

    if (isLoading) return null;

    return (
        <div className="flex flex-col w-[200px] gap-1">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-blue-500 font-semibold">
                    <Trophy className="w-4 h-4" />
                    <span>Prêmios</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Meta mensal de faturamento: {formatCurrencyBRL(GOAL)}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                    <span className="text-foreground">{formatCurrencyBRL(metrics.revenue)}</span> / {formatCurrencyBRL(GOAL)}
                </div>
            </div>
            <Progress value={progress} className="h-2 bg-neutral-800" indicatorClassName="bg-blue-500" />
        </div>
    );
};

export default GoalWidget;
