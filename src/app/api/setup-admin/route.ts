import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/setup-admin
 * Adiciona o usuário atual como admin na organização
 * 
 * Headers: Authorization: Bearer {idToken}
 * Body: { orgId: string }
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
        const { auth, firestore } = initializeFirebase();
        const decodedToken = await auth.verifyIdToken(idToken);

        const userId = decodedToken.uid;
        const email = decodedToken.email || 'email@nao.informado';
        const name = decodedToken.name || email.split('@')[0];

        const body = await request.json();
        const { orgId } = body;

        if (!orgId) {
            return NextResponse.json(
                { success: false, error: 'orgId é obrigatório' },
                { status: 400 }
            );
        }

        // Verificar se usuário já existe
        const userRef = firestore
            .collection('organizations')
            .doc(orgId)
            .collection('users')
            .doc(userId);

        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();

            // Atualizar para admin se não for
            if (userData?.role !== 'admin') {
                await userRef.update({
                    role: 'admin',
                    updatedAt: FieldValue.serverTimestamp(),
                });

                return NextResponse.json({
                    success: true,
                    message: 'Usuário atualizado para admin',
                    user: {
                        uid: userId,
                        email,
                        name,
                        role: 'admin',
                    },
                });
            }

            return NextResponse.json({
                success: true,
                message: 'Usuário já é admin',
                user: {
                    uid: userId,
                    email,
                    name: userData.name || name,
                    role: userData.role,
                },
            });
        }

        // Criar novo usuário admin
        await userRef.set({
            email,
            name,
            role: 'admin',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            message: 'Usuário criado como admin',
            user: {
                uid: userId,
                email,
                name,
                role: 'admin',
            },
        });
    } catch (error: any) {
        console.error('Error in setup-admin endpoint:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao criar usuário admin' },
            { status: 500 }
        );
    }
}
