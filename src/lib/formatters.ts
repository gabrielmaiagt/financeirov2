export function formatCurrencyBRL(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'R$ 0,00';

    // Se o valor vier em centavos (comum em gateways de pagamento), divide por 100
    // Assumindo que o valor no banco já está em centavos baseado no código anterior
    const amount = value / 100;

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(amount);
}
