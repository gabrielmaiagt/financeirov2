'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { db } from '@/firebase/api-client'; // cliente já configurado
import { formatCurrencyBRL } from '@/lib/formatters';
import { AnimatedNumber } from './ui/animated-number';

interface Totais {
    totalFaturado: number;
    pixGerado: number;
    pixPago: number;
    totalVendas: number;
}

export default function ResumoFinanceiro() {
    const [totais, setTotais] = useState<Totais>({
        totalFaturado: 0,
        pixGerado: 0,
        pixPago: 0,
        totalVendas: 0,
    });

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'vendas'), (snap: QuerySnapshot) => {
            let faturado = 0;
            let gerado = 0;
            let pago = 0;
            let qtd = 0;

            snap.forEach((doc) => {
                const v = doc.data() as any;
                const amount = v.total_amount ?? 0;
                faturado += amount;
                qtd += 1;

                if (v.payment_method === 'pix') {
                    if (v.status === 'pending') gerado += amount;
                    if (v.status === 'paid') pago += amount;
                }
            });

            setTotais({
                totalFaturado: faturado,
                pixGerado: gerado,
                pixPago: pago,
                totalVendas: qtd,
            });
        });

        return () => unsub();
    }, []);

    return (
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
                { label: 'Faturamento Total', value: totais.totalFaturado, format: formatCurrencyBRL },
                { label: 'PIX Gerado (pendente)', value: totais.pixGerado, format: formatCurrencyBRL },
                { label: 'PIX Pago', value: totais.pixPago, format: formatCurrencyBRL },
                { label: 'Total de Vendas', value: totais.totalVendas, format: (v: number) => v.toString() },
            ].map((c) => (
                <div
                    key={c.label}
                    className="p-5 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg hover:scale-105 transition-transform"
                >
                    <h3 className="text-sm font-medium opacity-80">{c.label}</h3>
                    <div className="text-2xl font-bold mt-2">
                        <AnimatedNumber value={c.value} formatter={c.format} />
                    </div>
                </div>
            ))}
        </section>
    );
}
