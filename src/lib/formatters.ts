export function formatCurrencyBRL(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'R$ 0,00';

    // Webhook já converte de centavos para reais, então não precisamos dividir
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}
