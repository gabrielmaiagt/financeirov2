'use client';

import { useState } from 'react';
import { formatCurrencyBRL } from '@/lib/formatters';
import type { Venda } from '@/types/venda';
import { Switch } from '@/components/ui/switch';
import { useFirestore } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';

interface Props {
    venda?: Venda | null;
    open: boolean;
    onClose: () => void;
}

export default function DetalhesVendaModal({ venda, open, onClose }: Props) {
    const firestore = useFirestore();
    const { orgId } = useOrganization();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);

    if (!venda) return null;

    const handleRecoveryToggle = async (checked: boolean) => {
        if (!firestore || !venda) return;

        setIsUpdating(true);
        try {
            await updateDoc(doc(firestore, 'organizations', orgId, 'vendas', venda.id), {
                isRecovery: checked
            });
            toast({
                title: "Sucesso",
                description: `Venda marcada como ${checked ? 'recuperação' : 'normal'}.`,
            });
        } catch (error) {
            console.error("Erro ao atualizar venda:", error);
            toast({
                title: "Erro",
                description: "Falha ao atualizar status da venda.",
                variant: "destructive"
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        Detalhes da Venda – {venda.id.slice(0, 8)}...
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Recuperação?</span>
                            <Switch
                                checked={venda.isRecovery || false}
                                onCheckedChange={handleRecoveryToggle}
                                disabled={isUpdating}
                            />
                        </div>
                    </div>

                    <section className="space-y-3 text-sm">
                        <p><strong className="text-muted-foreground">Status:</strong> <span className="text-green-400">{venda.status}</span></p>
                        {venda.gateway && (
                            <p><strong className="text-muted-foreground">Adquirente:</strong> <span className="text-primary">{venda.gateway}</span></p>
                        )}
                        <p><strong className="text-muted-foreground">Forma de pagamento:</strong> {venda.payment_method}</p>
                        <p><strong className="text-muted-foreground">Valor total:</strong> {formatCurrencyBRL(venda.total_amount)}</p>
                        <p><strong className="text-muted-foreground">Valor líquido:</strong> {formatCurrencyBRL(venda.net_amount)}</p>

                        <h4 className="font-medium mt-4 text-foreground">Oferta</h4>
                        <p className="text-muted-foreground">{venda.offer?.name} – {formatCurrencyBRL(venda.offer?.discount_price)} (x{venda.offer?.quantity})</p>

                        <h4 className="font-medium mt-4 text-foreground">Comprador</h4>
                        <div className="text-muted-foreground space-y-1">
                            <p>{venda.buyer?.name}</p>
                            <p>{venda.buyer?.email}</p>
                            <div className="flex items-center gap-2">
                                <p className="font-mono text-foreground">{venda.buyer?.phone}</p>
                                <button
                                    onClick={async () => {
                                        if (!venda.buyer?.phone) return;
                                        try {
                                            await navigator.clipboard.writeText(venda.buyer.phone);
                                            toast({ title: 'Telefone copiado!' });
                                        } catch (err) {
                                            console.error('Failed to copy:', err);
                                        }
                                    }}
                                    className="p-1 hover:bg-neutral-800 rounded transition-colors"
                                    title="Copiar telefone"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                    </svg>
                                </button>
                            </div>
                            <p>{venda.buyer?.document}</p>
                        </div>

                        <h4 className="font-medium mt-4 text-foreground">Tracking</h4>
                        {venda.tracking && typeof venda.tracking === 'object' && Object.keys(venda.tracking).length > 0 ? (
                            <div className="bg-neutral-800 p-3 rounded space-y-2 text-xs">
                                {Object.entries(venda.tracking).map(([key, value]) => {
                                    if (!value) return null;
                                    return (
                                        <p key={key}>
                                            <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}:</span>{" "}
                                            <span className="text-foreground">{String(value)}</span>
                                        </p>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-xs">Sem dados de tracking</p>
                        )}
                    </section>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition">
                            Fechar
                        </button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
