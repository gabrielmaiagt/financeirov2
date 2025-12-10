import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { email, password, orgId } = await request.json();

        if (!email || !password || !orgId) {
            return NextResponse.json(
                { error: 'Email, senha e organização são obrigatórios' },
                { status: 400 }
            );
        }

        // Initialize Firebase Admin and get firestore
        const { firestore: db } = initializeFirebase();

        // Find user by email in the organization
        const usersRef = db.collection('organizations').doc(orgId).collection('users');
        const snapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();

        if (snapshot.empty) {
            return NextResponse.json(
                { error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Verify password
        const isValidPassword = await bcrypt.compare(password, userData.passwordHash);

        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        // Update last login
        await userDoc.ref.update({
            lastLoginAt: new Date(),
        });

        // Return user data (without password hash)
        return NextResponse.json({
            success: true,
            user: {
                id: userDoc.id,
                email: userData.email,
                username: userData.username,
                name: userData.name,
                role: userData.role,
                orgId: orgId,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
