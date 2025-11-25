'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { db } from '@/firebase/api-client';
import { formatCurrencyBRL } from '@/lib/formatters';
import ResumoFinanceiro from '@/components/ResumoFinanceiro';
import DetalhesVendaModal from '@/components/DetalhesVendaModal';
import { Venda } from '@/types/venda';

export default function VendasPage() {
    const [vendas, setVendas] = useState<Venda[]>([]);
    const [selected, setSelected] = useState<Venda | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'vendas'), (snap: QuerySnapshot) => {
            const list: Venda[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...(doc.data() as any) }));
            list.sort((a, b) => b.created_at.seconds - a.created_at.seconds);
            setVendas(list);
        });
        return () => unsub();
    }, []);

    const openModal = (v: Venda) => {
        setSelected(v);
        setModalOpen(true);
    };

    return (
        <main className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">📊 Vendas</h1>
            <ResumoFinanceiro />
            <div className="overflow-x-auto bg-white rounded-xl shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">ID</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Cliente</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Valor</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Data</th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {vendas.map((v) => (
                            <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2 text-sm font-mono">{v.id.slice(0, 8)}…</td>
                                <td className="px-4 py-2 text-sm">{v.buyer?.name ?? '—'}</td>
                                <td className="px-4 py-2 text-sm">{formatCurrencyBRL(v.total_amount)}</td>
                                <td className="px-4 py-2 text-sm capitalize">{v.status}</td>
                                <td className="px-4 py-2 text-sm">
                                    {new Date(v.created_at?.seconds * 1000).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button
                                        className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                                        onClick={() => openModal(v)}
                                    >
                                        + Detalhes
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <DetalhesVendaModal venda={selected} open={modalOpen} onClose={() => setModalOpen(false)} />
        </main>
    );
}
