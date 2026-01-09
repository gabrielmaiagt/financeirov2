import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/widget-token
 * Gera ou revoga token do widget
 * 
 * Body: { action: 'generate' | 'revoke', orgId: string }
 * Headers: Authorization: Bearer {idToken}
 */
export async function POST(request: NextRequest) {
    try {
        // Verificar autenticação
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        const idToken = authHeader.split('Bearer ')[1];
        const { auth } = initializeFirebase();
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { action, orgId } = body;

        if (!orgId) {
            return NextResponse.json(
                { success: false, error: 'orgId é obrigatório' },
                { status: 400 }
            );
        }

        // Verificar se usuário pertence à org
        const { firestore } = initializeFirebase();
        const userDoc = await firestore
            .collection('organizations')
            .doc(orgId)
            .collection('users')
            .doc(userId)
            .get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Usuário não pertence a esta organização' },
                { status: 403 }
            );
        }

        if (action === 'generate') {
            // Revogar token existente
            const existingTokens = await firestore
                .collection('organizations')
                .doc(orgId)
                .collection('widget_tokens')
                .where('userId', '==', userId)
                .get();

            const batch = firestore.batch();
            existingTokens.forEach((doc) => {
                batch.update(doc.ref, { active: false });
            });
            await batch.commit();

            // Gerar novo token
            const newToken = generateSecureToken();
            const tokenRef = firestore
                .collection('organizations')
                .doc(orgId)
                .collection('widget_tokens')
                .doc();

            await tokenRef.set({
                token: newToken,
                userId: userId,
                active: true,
                createdAt: FieldValue.serverTimestamp(),
                lastUsedAt: null,
            });

            return NextResponse.json({
                success: true,
                token: newToken,
            });
        }

        if (action === 'revoke') {
            // Revogar todos os tokens do usuário
            const tokens = await firestore
                .collection('organizations')
                .doc(orgId)
                .collection('widget_tokens')
                .where('userId', '==', userId)
                .get();

            const batch = firestore.batch();
            tokens.forEach((doc) => {
                batch.update(doc.ref, { active: false });
            });
            await batch.commit();

            return NextResponse.json({
                success: true,
                message: 'Token revogado com sucesso',
            });
        }

        return NextResponse.json(
            { success: false, error: 'Ação inválida' },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('Error in widget-token endpoint:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao processar requisição' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/widget-token?orgId={orgId}
 * Retorna token atual do usuário
 */
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        const idToken = authHeader.split('Bearer ')[1];
        const { auth, firestore } = initializeFirebase();
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const orgId = request.nextUrl.searchParams.get('orgId');
        if (!orgId) {
            return NextResponse.json(
                { success: false, error: 'orgId é obrigatório' },
                { status: 400 }
            );
        }

        // Buscar token ativo do usuário
        const tokenSnapshot = await firestore
            .collection('organizations')
            .doc(orgId)
            .collection('widget_tokens')
            .where('userId', '==', userId)
            .where('active', '==', true)
            .limit(1)
            .get();

        if (tokenSnapshot.empty) {
            return NextResponse.json({
                success: true,
                token: null,
                lastUsedAt: null,
            });
        }

        const tokenDoc = tokenSnapshot.docs[0];
        const data = tokenDoc.data();

        return NextResponse.json({
            success: true,
            token: data.token,
            lastUsedAt: data.lastUsedAt?.toDate().toISOString() || null,
        });
    } catch (error: any) {
        console.error('Error getting widget token:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao buscar token' },
            { status: 500 }
        );
    }
}

/**
 * Gera token seguro de 32 caracteres
 */
function generateSecureToken(): string {
    return randomBytes(24).toString('base64url');
}
