import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { email, orgId } = await request.json();

        if (!email || !orgId) {
            return NextResponse.json(
                { error: 'Email e organização são obrigatórios' },
                { status: 400 }
            );
        }

        // Initialize Firebase Admin and get firestore
        const { firestore: db } = initializeFirebase();

        // Find user by email
        const usersRef = db.collection('organizations').doc(orgId).collection('users');
        const snapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();

        if (snapshot.empty) {
            // Don't reveal if user exists or not for security
            return NextResponse.json({
                success: true,
                message: 'Se o email existir, você receberá instruções de recuperação',
            });
        }

        const userDoc = snapshot.docs[0];

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

        // Store token in user document
        await userDoc.ref.update({
            passwordResetToken: resetToken,
            passwordResetExpires: resetTokenExpires,
        });

        // TODO: Send email with reset link
        // For now, log the token (in production, send email)
        console.log(`Password reset token for ${email}: ${resetToken}`);
        console.log(`Reset link: /reset-password?token=${resetToken}&orgId=${orgId}`);

        return NextResponse.json({
            success: true,
            message: 'Se o email existir, você receberá instruções de recuperação',
            // Only for development - remove in production
            _dev_token: process.env.NODE_ENV === 'development' ? resetToken : undefined,
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
