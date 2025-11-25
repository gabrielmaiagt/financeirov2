import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { formatCurrencyBRL } from '@/lib/formatters';
import { Venda } from '@/types/venda';

interface Props {
    venda?: Venda | null;
    open: boolean;
    onClose: () => void;
}

export default function DetalhesVendaModal({ venda, open, onClose }: Props) {
    if (!venda) return null;

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
                        <Dialog.Panel className="max-w-xl w-full bg-white rounded-xl shadow-xl p-6 overflow-y-auto">
                            <Dialog.Title className="text-xl font-semibold mb-4">
                                Detalhes da Venda – {venda.id}
                            </Dialog.Title>

                            <section className="space-y-3">
                                <p><strong>Status:</strong> {venda.status}</p>
                                <p><strong>Forma de pagamento:</strong> {venda.payment_method}</p>
                                <p><strong>Valor total:</strong> {formatCurrencyBRL(venda.total_amount)}</p>
                                <p><strong>Valor líquido:</strong> {formatCurrencyBRL(venda.net_amount)}</p>

                                <h4 className="font-medium mt-3">Oferta</h4>
                                <p>{venda.offer.name} – {formatCurrencyBRL(venda.offer.discount_price)} (x{venda.offer.quantity})</p>

                                <h4 className="font-medium mt-3">Comprador</h4>
                                <p>{venda.buyer.name}</p>
                                <p>{venda.buyer.email}</p>
                                <p>{venda.buyer.phone}</p>
                                <p>{venda.buyer.document}</p>

                                <h4 className="font-medium mt-3">Tracking</h4>
                                <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(venda.tracking, null, 2)}</pre>
                            </section>

                            <div className="mt-6 flex justify-end">
                                <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition" onClick={onClose}>
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
