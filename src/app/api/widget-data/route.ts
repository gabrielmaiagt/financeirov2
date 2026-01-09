import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/widget-data?token={token}
 * 
 * Endpoint público para widgets iOS (Scriptable)
 * Retorna métricas financeiras do mês atual
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.nextUrl.searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token não fornecido' },
                { status: 400 }
            );
        }

        // Validar token e buscar userId e orgId
        const tokenData = await validateToken(token);
        if (!tokenData) {
            return NextResponse.json(
                { success: false, error: 'Token inválido ou expirado' },
                { status: 401 }
            );
        }

        const { userId, orgId } = tokenData;

        // Atualizar lastUsedAt
        const { firestore } = initializeFirebase();
        await firestore
            .collection('organizations')
            .doc(orgId)
            .collection('widget_tokens')
            .doc(tokenData.tokenId)
            .update({
                lastUsedAt: FieldValue.serverTimestamp(),
            });

        // Calcular métricas do mês atual
        const metrics = await calculateMonthlyMetrics(orgId);

        return NextResponse.json({
            success: true,
            data: metrics,
        });
    } catch (error: any) {
        console.error('Error in widget-data endpoint:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao buscar dados' },
            { status: 500 }
        );
    }
}

/**
 * Valida token e retorna dados associados
 */
async function validateToken(token: string): Promise<{
    tokenId: string;
    userId: string;
    orgId: string;
} | null> {
    try {
        const { firestore } = initializeFirebase();

        console.log('=== WIDGET TOKEN VALIDATION ===');
        console.log('Token length:', token?.length);
        console.log('Token preview:', token?.substring(0, 15) + '...');

        // Buscar em todas as organizações (otimizar com collection group query)
        const tokensSnapshot = await firestore
            .collectionGroup('widget_tokens')
            .where('token', '==', token)
            .where('active', '==', true)
            .limit(1)
            .get();

        console.log('Tokens found:', tokensSnapshot.size);

        if (tokensSnapshot.empty) {
            console.log('❌ No active tokens found for this value');

            // Debug: Check if token exists but inactive
            const allTokensSnapshot = await firestore
                .collectionGroup('widget_tokens')
                .where('token', '==', token)
                .get();

            console.log('Total tokens (including inactive):', allTokensSnapshot.size);
            if (!allTokensSnapshot.empty) {
                const doc = allTokensSnapshot.docs[0];
                console.log('Token exists but active =', doc.data().active);
            }

            return null;
        }

        const tokenDoc = tokensSnapshot.docs[0];
        const data = tokenDoc.data();

        console.log('✅ Token found!');
        console.log('Token path:', tokenDoc.ref.path);
        console.log('Token data:', { userId: data.userId, active: data.active });

        // Extrair orgId do path
        const pathParts = tokenDoc.ref.path.split('/');
        const orgId = pathParts[1]; // organizations/{orgId}/widget_tokens/{tokenId}

        console.log('Extracted orgId:', orgId);
        console.log('=== END VALIDATION ===');

        return {
            tokenId: tokenDoc.id,
            userId: data.userId,
            orgId: orgId,
        };
    } catch (error) {
        console.error('❌ Error validating token:', error);
        return null;
    }
}

/**
 * Calcula métricas de vendas do dia atual (webhooks)
 */
async function calculateMonthlyMetrics(orgId: string) {
    const { firestore } = initializeFirebase();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Buscar vendas do dia (vindas dos webhooks)
    const salesSnapshot = await firestore
        .collection('organizations')
        .doc(orgId)
        .collection('vendas')
        .where('created_at', '>=', startOfDay)
        .where('created_at', '<=', endOfDay)
        .get();

    let totalRevenue = 0;
    let totalNetRevenue = 0;
    let approvedSales = 0;
    let pendingSales = 0;
    let totalSales = 0;

    salesSnapshot.forEach((doc) => {
        const data = doc.data();
        totalSales++;

        // Contar vendas aprovadas
        if (data.status === 'approved') {
            approvedSales++;
            totalRevenue += data.value || 0;
            totalNetRevenue += data.netValue || data.value || 0;
        } else if (data.status === 'pending') {
            pendingSales++;
        }
    });

    // Ticket médio
    const avgTicket = approvedSales > 0 ? totalRevenue / approvedSales : 0;

    // Formatar valores
    const formatBRL = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return {
        revenue: totalRevenue,
        revenue_formatted: formatBRL(totalRevenue),
        net_revenue: totalNetRevenue,
        net_revenue_formatted: formatBRL(totalNetRevenue),
        approved_sales: approvedSales,
        pending_sales: pendingSales,
        total_sales: totalSales,
        avg_ticket: avgTicket,
        avg_ticket_formatted: formatBRL(avgTicket),
        period: `Hoje, ${now.getDate()}/${now.getMonth() + 1}`,
    };
}

