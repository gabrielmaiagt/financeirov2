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
        let usersSnapshot;
        try {
            usersSnapshot = await db.collectionGroup('users')
                .where('email', '==', email.toLowerCase())
                .limit(1)
                .get();
        } catch (cgError) {
            console.warn("Collection Group query failed, falling back to specific org", cgError);
            usersSnapshot = { empty: true, docs: [] } as any;
        }

        // Fallback: If not found globally (or query failed), try default 'interno-fluxo' explicitly
        if (usersSnapshot.empty) {
            console.log("User not found in CollectionGroup, checking 'interno-fluxo' directly...");
            const fallbackRef = db.collection('organizations').doc('interno-fluxo').collection('users');
            usersSnapshot = await fallbackRef.where('email', '==', email.toLowerCase()).limit(1).get();
        }

        if (usersSnapshot.empty) {
            console.log(`Login failed: User with email ${email} not found in any organization.`);
            return NextResponse.json(
                { error: 'Usuário não encontrado (Debug: Verifique o email ou se o usuário foi criado)' },
                { status: 401 }
            );
        }

        // ... existing code ...
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

        // Use userDoc.ref.parent.parent to find the organization document
        let orgId = 'interno-fluxo'; // Default safe value
        const orgDocRef = userDoc.ref.parent.parent;

        if (orgDocRef) {
            orgId = orgDocRef.id;
        }

        // 2. Verify Password
        // Check if passwordHash exists
        if (!userData.passwordHash) {
            console.error(`Login failed: User ${email} has no password hash set.`);
            return NextResponse.json(
                { error: 'Erro de cadastro: Senha não definida para este usuário.' },
                { status: 401 }
            );
        }

        const isValidPassword = await bcrypt.compare(password, userData.passwordHash);

        if (!isValidPassword) {
            console.log(`Login failed: Invalid password for user ${email}`);
            return NextResponse.json(
                { error: 'Senha incorreta (Debug: Verifique se a senha está correta)' },
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
