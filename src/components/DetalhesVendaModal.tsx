'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { formatCurrencyBRL } from '@/lib/formatters';
import { Venda } from '@/types/venda';
import { Switch } from '@/components/ui/switch';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface Props {
    venda?: Venda | null;
    open: boolean;
    onClose: () => void;
}

export default function DetalhesVendaModal({ venda, open, onClose }: Props) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);

    if (!venda) return null;

    const handleRecoveryToggle = async (checked: boolean) => {
        if (!firestore || !venda) return;

        setIsUpdating(true);
        try {
            await updateDoc(doc(firestore, 'vendas', venda.id), {
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
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="scale-95 opacity-0"
                        enterTo="scale-100 opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="scale-100 opacity-100"
                        leaveTo="scale-95 opacity-0"
                    >
                        <Dialog.Panel className="max-w-xl w-full bg-neutral-900 text-foreground rounded-xl shadow-xl p-6 overflow-y-auto border border-neutral-800">
                            <div className="flex justify-between items-start mb-4">
                                <Dialog.Title className="text-xl font-semibold text-foreground">
                                    Detalhes da Venda – {venda.id}
                                </Dialog.Title>
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
                                <p className="text-muted-foreground">{venda.offer.name} – {formatCurrencyBRL(venda.offer.discount_price)} (x{venda.offer.quantity})</p>

                                <h4 className="font-medium mt-4 text-foreground">Comprador</h4>
                                <div className="text-muted-foreground space-y-1">
                                    <p>{venda.buyer.name}</p>
                                    <p>{venda.buyer.email}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="font-mono text-foreground">{venda.buyer.phone}</p>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(venda.buyer.phone);
                                                    // You could add a toast here
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
                                    <p>{venda.buyer.document}</p>
                                </div>

                                <h4 className="font-medium mt-4 text-foreground">Tracking</h4>
                                {venda.tracking && Object.keys(venda.tracking).length > 0 ? (
                                    <div className="bg-neutral-800 p-3 rounded space-y-2 text-xs">
                                        {venda.tracking.utm_source && (
                                            <p><span className="text-muted-foreground">UTM Source:</span> <span className="text-foreground">{venda.tracking.utm_source}</span></p>
                                        )}
                                        {venda.tracking.utm_medium && (
                                            <p><span className="text-muted-foreground">UTM Medium:</span> <span className="text-foreground">{venda.tracking.utm_medium}</span></p>
                                        )}
                                        {venda.tracking.utm_campaign && (
                                            <p><span className="text-muted-foreground">UTM Campaign:</span> <span className="text-foreground">{venda.tracking.utm_campaign}</span></p>
                                        )}
                                        {venda.tracking.utm_content && (
                                            <p><span className="text-muted-foreground">UTM Content:</span> <span className="text-foreground">{venda.tracking.utm_content}</span></p>
                                        )}
                                        {venda.tracking.utm_term && (
                                            <p><span className="text-muted-foreground">UTM Term:</span> <span className="text-foreground">{venda.tracking.utm_term}</span></p>
                                        )}
                                        {venda.tracking.src && (
                                            <p><span className="text-muted-foreground">Source:</span> <span className="text-foreground">{venda.tracking.src}</span></p>
                                        )}
                                        {venda.tracking.sck && (
                                            <p><span className="text-muted-foreground">SCK:</span> <span className="text-foreground">{venda.tracking.sck}</span></p>
                                        )}
                                        {venda.tracking.ref && (
                                            <p><span className="text-muted-foreground">Ref:</span> <span className="text-foreground">{venda.tracking.ref}</span></p>
                                        )}
                                        {/* Show full JSON if there are other fields */}
                                        {Object.keys(venda.tracking).some(key => !['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck', 'ref'].includes(key)) && (
                                            <details className="mt-2">
                                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver JSON completo</summary>
                                                <pre className="mt-2 text-neutral-300 overflow-x-auto">{JSON.stringify(venda.tracking, null, 2)}</pre>
                                            </details>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-xs">Sem dados de tracking</p>
                                )}
                            </section>

                            <div className="mt-6 flex justify-end">
                                <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition" onClick={onClose}>
                                    Fechar
                                </button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
