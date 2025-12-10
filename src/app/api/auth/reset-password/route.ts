import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { token, newPassword, orgId } = await request.json();

        if (!token || !newPassword || !orgId) {
            return NextResponse.json(
                { error: 'Token, nova senha e organização são obrigatórios' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'A senha deve ter pelo menos 6 caracteres' },
                { status: 400 }
            );
        }

        // Initialize Firebase Admin and get firestore
        const { firestore: db } = initializeFirebase();

        // Find user by reset token
        const usersRef = db.collection('organizations').doc(orgId).collection('users');
        const snapshot = await usersRef.where('passwordResetToken', '==', token).limit(1).get();

        if (snapshot.empty) {
            return NextResponse.json(
                { error: 'Token inválido ou expirado' },
                { status: 400 }
            );
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Check if token is expired
        const expiresAt = userData.passwordResetExpires?.toDate?.() || userData.passwordResetExpires;
        if (new Date() > new Date(expiresAt)) {
            return NextResponse.json(
                { error: 'Token expirado. Solicite um novo link de recuperação.' },
                { status: 400 }
            );
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 12);

        // Update password and clear reset token
        await userDoc.ref.update({
            passwordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
            passwordChangedAt: new Date(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
