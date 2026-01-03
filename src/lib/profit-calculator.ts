import { Operation, AdCostMode, Partner } from '@/types/organization';

export interface ProfitCalculationInput {
    netRevenue: number; // Faturamento Líquido
    adCost: number; // Gasto em Anúncios
    gatewayFee: number; // Taxa de Gateway
}

export interface PartnerProfit {
    name: string;
    percentage: number;
    value: number;
    adReimbursement?: number; // Only for reimburse_payer mode
    total: number;
}

export interface ProfitCalculationResult {
    netProfit: number; // Lucro Líquido
    cashReserve: number; // Company cash reserve amount
    distributedProfit: number; // Profit distributed among partners (netProfit - cashReserve)
    partnerProfits: PartnerProfit[];
}

/**
 * Calculate profit distribution based on operation's adCostMode
 */
export function calculateProfitDistribution(
    input: ProfitCalculationInput,
    operation: Operation
): ProfitCalculationResult {
    const { netRevenue, adCost, gatewayFee } = input;

    // Lucro Líquido da Operação = Faturamento - Anúncios - Taxas
    const netProfit = netRevenue - adCost - gatewayFee;

    let totalCashReserve = 0;
    const partnerProfits: PartnerProfit[] = [];

    // Helper para processar cada parceiro
    const processPartnerShare = (partner: any, grossProfitShare: number, adReimbursement: number = 0) => {
        // Calcula contribuição para o caixa baseada na PORCENTAGEM DO SÓCIO
        const cashContributionPct = partner.cashReservePercentage || 0;
        const cashContribution = grossProfitShare * (cashContributionPct / 100);

        // Lucro final do sócio descontando o caixa
        const netShare = grossProfitShare - cashContribution;

        // Acumula no total do caixa da empresa
        totalCashReserve += cashContribution;

        partnerProfits.push({
            name: partner.name,
            percentage: partner.percentage,
            value: netShare, // Valor final que o sócio recebe (lucro)
            adReimbursement,
            total: netShare + adReimbursement,
        });
    };

    switch (operation.adCostMode) {
        case 'reimburse_payer': {
            // Modo 1: Primeiro reembolsa quem pagou, depois divide o lucro
            // O lucro a ser dividido é o netProfit (que já descontou o adCost do total)
            // Mas matematicamente aqui: netProfit é o que sobrou.

            operation.partners.forEach((partner) => {
                const grossProfitShare = netProfit * (partner.percentage / 100);
                const isAdPayer = partner.name === operation.adPayer;
                const adReimbursement = isAdPayer ? adCost : 0;

                processPartnerShare(partner, grossProfitShare, adReimbursement);
            });
            break;
        }

        case 'split_among_partners': {
            // Modo 2: O custo já foi descontado do lucro, divide o restante
            operation.partners.forEach((partner) => {
                const grossProfitShare = netProfit * (partner.percentage / 100);
                processPartnerShare(partner, grossProfitShare, 0);
            });
            break;
        }

        case 'solo': {
            // Modo 3: Dono único
            const owner = operation.partners[0];
            processPartnerShare(owner, netProfit, 0);
            break;
        }
    }

    // Lucro distribuído total é o lucro líquido menos o que ficou no caixa
    const distributedProfit = netProfit - totalCashReserve;

    return {
        netProfit,
        cashReserve: totalCashReserve,
        distributedProfit,
        partnerProfits,
    };
}

/**
 * Helper to find a specific partner's profit
 */
export function getPartnerProfit(
    result: ProfitCalculationResult,
    partnerName: string
): PartnerProfit | undefined {
    return result.partnerProfits.find(p => p.name === partnerName);
}
