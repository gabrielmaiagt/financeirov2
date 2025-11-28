'use client';

import { useEffect, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatCurrencyBRL } from '@/lib/formatters';
import type { Meta } from './GoalsBoard';

const GoalWidget = () => {
    const firestore = useFirestore();
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    // Fetch Sales
    const vendasQuery = useMemoFirebase(
        () => {
            if (!firestore) return null;
            return query(
                collection(firestore, 'vendas'),
                where('created_at', '>=', Timestamp.fromDate(start)),
                where('created_at', '<=', Timestamp.fromDate(end))
            );
        },
        [firestore]
    );

    const { data: vendas, isLoading: isLoadingVendas } = useCollection(vendasQuery);

    // Fetch Active Goals
    const goalsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'metas'), where('completed', '==', false)) : null),
        [firestore]
    );
    const { data: goals } = useCollection<Meta>(goalsQuery);

    // Find the most relevant goal (e.g., one with 10k target or the first one)
    const activeGoal = useMemo(() => {
        if (!goals || goals.length === 0) return null;
        // Try to find a goal with 10k target first, otherwise take the first one
        return goals.find(g => g.targetValue === 10000) || goals[0];
    }, [goals]);

    const metrics = useMemo(() => {
        if (!vendas) return { revenue: 0 };

        const revenue = vendas.reduce((acc: number, venda: any) => {
            const lowerCaseStatus = venda.status?.toLowerCase() || '';
            const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');

            // Filter by gateway if goal title specifies one
            if (activeGoal) {
                const title = activeGoal.title.toLowerCase();
                const gateway = venda.gateway?.toLowerCase() || '';

                if (title.includes('paradise') && !gateway.includes('paradise')) return acc;
                if (title.includes('buck') && !gateway.includes('buck')) return acc;
                if (title.includes('gg') && !gateway.includes('gg')) return acc;
            }

            if (isPaid) {
                return acc + (venda.net_amount || venda.netAmount || venda.value || venda.total_amount || 0);
            }
            return acc;
        }, 0);

        return { revenue };
    }, [vendas, activeGoal]);

    // Sync Goal with Revenue
    useEffect(() => {
        if (!firestore || !activeGoal || metrics.revenue === 0) return;

        // Only update if the difference is significant (to avoid loops with floating point)
        if (Math.abs(activeGoal.currentValue - metrics.revenue) > 0.1) {
            const goalRef = doc(firestore, 'metas', activeGoal.id);
            updateDoc(goalRef, { currentValue: metrics.revenue });
        }
    }, [firestore, activeGoal, metrics.revenue]);

    const GOAL = activeGoal ? activeGoal.targetValue : 10000;
    const currentRevenue = metrics.revenue;
    const progress = Math.min((currentRevenue / GOAL) * 100, 100);
    const title = activeGoal ? activeGoal.title : 'Prêmios';

    if (isLoadingVendas) return null;

    return (
        <div className="flex flex-col w-[240px] gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-medium text-foreground">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="truncate max-w-[150px]" title={title}>{title}</span>
                </div>
                <div className="text-xs font-bold text-muted-foreground">
                    {Math.round(progress)}%
                </div>
            </div>

            <Progress value={progress} className="h-2 bg-secondary/50" indicatorClassName="bg-gradient-to-r from-blue-600 to-cyan-400" />

            <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                <span>{formatCurrencyBRL(currentRevenue)}</span>
                <span>{formatCurrencyBRL(GOAL)}</span>
            </div>
        </div>
    );
};

export default GoalWidget;
