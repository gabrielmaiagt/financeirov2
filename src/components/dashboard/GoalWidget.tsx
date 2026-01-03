'use client';

import { useEffect, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { collection, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatCurrencyBRL } from '@/lib/formatters';
import type { Meta } from './GoalsBoard';

import { Operacao } from '@/app/page';

interface GoalWidgetProps {
    variant?: 'default' | 'header';
}

const GoalWidget = ({ variant = 'default' }: GoalWidgetProps) => {
    const firestore = useFirestore();
    const { orgId } = useOrganization();
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    // Fetch Active Goals
    const goalsQuery = useMemoFirebase(
        () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'metas'), where('completed', '==', false)) : null),
        [firestore, orgId]
    );
    const { data: goals } = useCollection<Meta>(goalsQuery);

    // Find the most relevant goal
    const activeGoal = useMemo(() => {
        if (!goals || goals.length === 0) return null;
        return goals.find(g => g.targetValue === 10000) || goals[0];
    }, [goals]);

    // Fetch Sales (Webhooks) - Only if needed
    const shouldFetchWebhooks = activeGoal?.sourceType === 'webhooks' || (!activeGoal?.sourceType && !activeGoal?.title.includes('manual'));
    const vendasQuery = useMemoFirebase(
        () => {
            if (!firestore || !orgId || !shouldFetchWebhooks) return null;
            return query(
                collection(firestore, 'organizations', orgId, 'vendas'),
                where('created_at', '>=', Timestamp.fromDate(start)),
                where('created_at', '<=', Timestamp.fromDate(end))
            );
        },
        [firestore, orgId, shouldFetchWebhooks, start, end]
    );
    const { data: vendas, isLoading: isLoadingVendas } = useCollection(vendasQuery);

    // Fetch Transactions (Operacoes) - Only if needed
    const shouldFetchTransactions = activeGoal?.sourceType === 'transactions';
    const opsQuery = useMemoFirebase(
        () => {
            if (!firestore || !orgId || !shouldFetchTransactions) return null;
            return query(
                collection(firestore, 'organizations', orgId, 'operacoesSocios'),
                where('data', '>=', Timestamp.fromDate(start)),
                where('data', '<=', Timestamp.fromDate(end))
            );
        },
        [firestore, orgId, shouldFetchTransactions, start, end]
    );
    const { data: transactions } = useCollection<Operacao>(opsQuery);

    const calculatedRevenue = useMemo(() => {
        if (!activeGoal) return 0;

        // Manual mode: return current value from DB (no calculation needed)
        // If sourceType is undefined, fallback to legacy behavior (check title or manual)
        // Legacy: previously it always fetched sales. Now we default to manual if not specified? 
        // Actually the legacy code was fetching sales. Let's assume 'manual' is explicit.
        // If undefined, we try to mimic old behavior: filter by title keywords.

        const type = activeGoal.sourceType;

        if (type === 'manual') {
            return activeGoal.currentValue;
        }

        if (type === 'transactions') {
            if (!transactions) return 0;
            return transactions.reduce((acc, op) => acc + (op.lucroLiquido || 0), 0);
        }

        // Webhooks (default legacy behavior or explicit)
        if (type === 'webhooks' || !type) {
            if (!vendas) return 0; // or activeGoal.currentValue to avoid flicker? 

            return vendas.reduce((acc: number, venda: any) => {
                const lowerCaseStatus = venda.status?.toLowerCase() || '';
                const isPaid = lowerCaseStatus.includes('pago') || lowerCaseStatus.includes('paid') || lowerCaseStatus.includes('approved');

                if (!isPaid) return acc;

                // Legacy Title Filter (backwards compatibility)
                if (!type) {
                    const title = activeGoal.title.toLowerCase();
                    const gateway = venda.gateway?.toLowerCase() || '';
                    if (title.includes('paradise') && !gateway.includes('paradise')) return acc;
                    if (title.includes('buck') && !gateway.includes('buck')) return acc;
                    if (title.includes('gg') && !gateway.includes('gg')) return acc;
                }

                // Explicit Gateway Filter
                if (type === 'webhooks' && activeGoal.webhookGateway && activeGoal.webhookGateway !== 'all') {
                    const gateway = venda.gateway?.toLowerCase() || '';
                    if (!gateway.includes(activeGoal.webhookGateway.toLowerCase())) return acc;
                }

                return acc + (venda.net_amount || venda.netAmount || venda.value || venda.total_amount || 0);
            }, 0);
        }

        return activeGoal.currentValue;
    }, [activeGoal, transactions, vendas]);

    // Sync Goal with Revenue
    useEffect(() => {
        if (!firestore || !activeGoal || !orgId) return;

        // Don't auto-update if manual
        if (activeGoal.sourceType === 'manual') return;

        // Only update if the difference is significant
        if (Math.abs(activeGoal.currentValue - calculatedRevenue) > 0.1) {
            const goalRef = doc(firestore, 'organizations', orgId, 'metas', activeGoal.id);
            updateDoc(goalRef, { currentValue: calculatedRevenue });
        }
    }, [firestore, activeGoal, calculatedRevenue, orgId]);

    const GOAL = activeGoal ? activeGoal.targetValue : 10000;
    // Use calculated revenue for display to feel "instant", even if DB update lags slightly
    const currentRevenue = calculatedRevenue;
    const progress = Math.min((currentRevenue / GOAL) * 100, 100);
    const title = activeGoal ? activeGoal.title : 'Prêmios';

    if (isLoadingVendas && (activeGoal?.sourceType === 'webhooks' || !activeGoal?.sourceType)) return null;

    if (variant === 'header') {
        return (
            <div className="hidden lg:flex items-center gap-3 bg-neutral-900/50 backdrop-blur-sm border border-white/5 px-4 py-1.5 rounded-full hover:bg-neutral-800/80 hover:border-primary/20 hover:shadow-[0_0_15px_rgba(0,0,0,0.3)] transition-all duration-300 w-auto group cursor-default">
                {/* Icon & Title */}
                <div className="flex items-center gap-2">
                    <div className="bg-yellow-500/10 p-1 rounded-full">
                        <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors max-w-[100px] truncate">
                        {title}
                    </span>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-3 bg-white/10" />

                {/* Progress & Value */}
                <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5 min-w-[100px]">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground font-medium">{Math.round(progress)}%</span>
                            <span className="text-primary font-bold">{formatCurrencyBRL(currentRevenue)}</span>
                        </div>
                        <Progress value={progress} className="h-1 bg-white/5" indicatorClassName="bg-gradient-to-r from-yellow-600 to-yellow-400" />
                    </div>
                </div>
            </div>
        );
    }

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
