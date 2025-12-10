import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { userId, orgId, currentPassword, newPassword } = await request.json();

        if (!userId || !orgId || !currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Todos os campos são obrigatórios' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'A nova senha deve ter pelo menos 6 caracteres' },
                { status: 400 }
            );
        }

        // Initialize Firebase Admin and get firestore
        const { firestore: db } = initializeFirebase();

        // Get user
        const userRef = db.collection('organizations').doc(orgId).collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { error: 'Usuário não encontrado' },
                { status: 404 }
            );
        }

        const userData = userDoc.data()!;

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, userData.passwordHash);

        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Senha atual incorreta' },
                { status: 401 }
            );
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update password
        await userRef.update({
            passwordHash: newPasswordHash,
            passwordChangedAt: new Date(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
