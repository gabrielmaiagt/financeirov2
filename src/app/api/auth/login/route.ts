import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email e senha são obrigatórios' },
                { status: 400 }
            );
        }

        // Initialize Firebase Admin
        const { firestore: db, auth } = initializeFirebase();

        // 1. Intelligent Login: Find user across ALL organizations
        // Using Collection Group Query to search all 'users' collections
        const usersSnapshot = await db.collectionGroup('users')
            .where('email', '==', email.toLowerCase())
            .get();

        if (usersSnapshot.empty) {
            return NextResponse.json(
                { error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        // In case multiple users with same email exist (shouldn't happen ideally, but possible in multi-tenant without unique constraint)
        // We pick the first one, or we could ask user to invoke a specific org login if needed.
        // For now, let's assume one main user or pick first.
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

        // Use userDoc.ref.parent.parent to find the organization document
        const orgDocRef = userDoc.ref.parent.parent;

        if (!orgDocRef) {
            return NextResponse.json(
                { error: 'Erro de integridade: Usuário sem organização' },
                { status: 500 }
            );
        }

        const orgId = orgDocRef.id;

        // 2. Verify Password
        const isValidPassword = await bcrypt.compare(password, userData.passwordHash);

        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        // 3. Generate Firebase Custom Token
        // If the user already has a Firebase Auth UID stored, use it. Otherwise use the doc ID.
        // It's safer to always use the Doc ID as the UID for consistency if not linked yet.
        const userId = userDoc.id;

        // Add custom claims for RBAC and Multi-tenancy
        const additionalClaims = {
            orgId: orgId,
            role: userData.role
        };

        const customToken = await auth.createCustomToken(userId, additionalClaims);

        // 4. Update last login
        await userDoc.ref.update({
            lastLoginAt: new Date(),
        });

        // 5. Return success with token and context data
        return NextResponse.json({
            success: true,
            token: customToken,
            user: {
                id: userId,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                orgId: orgId,
            },
        });
    } catch (error: any) {
        console.error('Login error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        return NextResponse.json(
            {
                error: 'Erro interno do servidor',
                debug: error.message // Temporarily exposing error for debugging
            },
            { status: 500 }
        );
    }
}
