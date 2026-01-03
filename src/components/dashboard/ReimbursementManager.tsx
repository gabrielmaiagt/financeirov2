'use client';

import { useState } from 'react';
import { Despesa } from './ExpensesBoard';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertCircle } from 'lucide-react';

import { format } from 'date-fns';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Badge } from '@/components/ui/badge';

interface ReimbursementManagerProps {
    pendingExpenses: Despesa[];
    onClose?: () => void;
}

const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function ReimbursementManager({ pendingExpenses, onClose }: ReimbursementManagerProps) {
    const { orgId } = useOrganization();
    const firestore = useFirestore();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isReimbursing, setIsReimbursing] = useState(false);

    // Group by partner
    const byPartner = pendingExpenses.reduce((acc, exp) => {
        const partner = exp.payerName || 'Desconhecido';
        if (!acc[partner]) acc[partner] = [];
        acc[partner].push(exp);
        return acc;
    }, {} as Record<string, Despesa[]>);

    const handleToggle = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSelectAllPartner = (partner: string) => {
        const ids = byPartner[partner].map(e => e.id);
        const allSelected = ids.every(id => selectedIds.includes(id));

        if (allSelected) {
            // Deselect all
            setSelectedIds(selectedIds.filter(id => !ids.includes(id)));
        } else {
            // Select all
            const newIds = [...selectedIds];
            ids.forEach(id => {
                if (!newIds.includes(id)) newIds.push(id);
            });
            setSelectedIds(newIds);
        }
    };

    const handleReimburse = async () => {
        if (!firestore || !orgId) return;
        setIsReimbursing(true);
        try {
            const batch = writeBatch(firestore);

            selectedIds.forEach(id => {
                const ref = doc(firestore, 'organizations', orgId, 'despesas', id);
                batch.update(ref, {
                    reimbursementStatus: 'paid',
                    paidAt: serverTimestamp(),
                });
            });

            await batch.commit();
            setSelectedIds([]);
            if (onClose) onClose();
        } catch (error) {
            console.error("Error reimbursing:", error);
            alert("Erro ao processar reembolsos.");
        } finally {
            setIsReimbursing(false);
        }
    };

    const totalSelected = pendingExpenses
        .filter(e => selectedIds.includes(e.id))
        .reduce((sum, e) => sum + e.valor, 0);

    if (pendingExpenses.length === 0) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500/50" />
                <p>Tudo certo! Nenhum reembolso pendente.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[500px]">
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                    {Object.entries(byPartner).map(([partner, expenses]) => (
                        <div key={partner} className="space-y-2">
                            <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                    {partner}
                                    <Badge variant="secondary">{expenses.length}</Badge>
                                </h4>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSelectAllPartner(partner)}
                                >
                                    {expenses.every(e => selectedIds.includes(e.id)) ? 'Desmarcar Todos' : 'Marcar Todos'}
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {expenses.map(expense => (
                                    <div
                                        key={expense.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedIds.includes(expense.id)
                                            ? 'bg-blue-500/10 border-blue-500/50'
                                            : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                                            }`}
                                        onClick={() => handleToggle(expense.id)}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{expense.descricao}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(expense.data.toDate(), 'dd/MM/yy')} • {expense.categoria}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold">{formatMoney(expense.valor)}</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="text-right text-sm text-muted-foreground pt-1 pr-2">
                                    Total {partner}: <span className="text-foreground">{formatMoney(expenses.reduce((s, e) => s + e.valor, 0))}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <div className="p-4 border-t border-neutral-800 bg-neutral-900/50">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-muted-foreground">Selecionado para pagamento:</span>
                    <span className="text-xl font-bold text-blue-400">{formatMoney(totalSelected)}</span>
                </div>
                <Button
                    className="w-full"
                    disabled={selectedIds.length === 0 || isReimbursing}
                    onClick={handleReimburse}
                >
                    {isReimbursing ? 'Processando...' : `Quitar Reembolsos (${selectedIds.length})`}
                </Button>
            </div>
        </div>
    );
}
