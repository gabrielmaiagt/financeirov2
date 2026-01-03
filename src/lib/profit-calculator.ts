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
    operation: Operation,
    cashReserveOverride?: number // Allow override of operation's default cash reserve percentage
): ProfitCalculationResult {
    const { netRevenue, adCost, gatewayFee } = input;

    // Net profit = Revenue - Ad Cost - Gateway Fee
    const netProfit = netRevenue - adCost - gatewayFee;

    // Calculate company cash reserve (from operation or override)
    const cashReservePercentage = cashReserveOverride ?? operation.cashReservePercentage ?? 0;
    const cashReserve = netProfit * (cashReservePercentage / 100);

    // Profit to distribute among partners (after cash reserve)
    const distributedProfit = netProfit - cashReserve;

    const partnerProfits: PartnerProfit[] = [];

    switch (operation.adCostMode) {
        case 'reimburse_payer': {
            // Mode 1: Reimburse the payer first, then distribute net profit
            // Example: Cabral paid R$1000 in ads
            // 1. Return R$1000 to Cabral
            // 2. Distribute remaining profit by percentages (after cash reserve)

            operation.partners.forEach((partner) => {
                const profitShare = distributedProfit * (partner.percentage / 100);
                const isAdPayer = partner.name === operation.adPayer;
                const adReimbursement = isAdPayer ? adCost : 0;

                partnerProfits.push({
                    name: partner.name,
                    percentage: partner.percentage,
                    value: profitShare,
                    adReimbursement,
                    total: profitShare + adReimbursement,
                });
            });
            break;
        }

        case 'split_among_partners': {
            // Mode 2: Ad cost is already deducted from net profit, just distribute (after cash reserve)
            operation.partners.forEach((partner) => {
                const profitShare = distributedProfit * (partner.percentage / 100);

                partnerProfits.push({
                    name: partner.name,
                    percentage: partner.percentage,
                    value: profitShare,
                    total: profitShare,
                });
            });
            break;
        }

        case 'solo': {
            // Mode 3: Single owner gets everything (after cash reserve)
            const owner = operation.partners[0];

            partnerProfits.push({
                name: owner.name,
                percentage: 100,
                value: distributedProfit,
                total: distributedProfit,
            });
            break;
        }
    }

    return {
        netProfit,
        cashReserve,
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
