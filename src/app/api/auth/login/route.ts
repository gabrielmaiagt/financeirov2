import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();
        const orgId = 'interno-fluxo'; // Hardcoded orgId

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email e senha são obrigatórios' },
                { status: 400 }
            );
        }

        const { firestore: db, auth } = initializeFirebase();

        // Direct lookup in the specific organization
        const usersRef = db.collection('organizations').doc(orgId).collection('users');
        const usersSnapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();

        if (usersSnapshot.empty) {
            console.log(`Login failed: User with email ${email} not found in org ${orgId}.`);
            return NextResponse.json(
                { error: 'Usuário não encontrado.' },
                { status: 401 }
            );
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

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
                { error: 'Senha incorreta.' },
                { status: 401 }
            );
        }

        const userId = userDoc.id;
        const additionalClaims = { orgId, role: userData.role };
        const customToken = await auth.createCustomToken(userId, additionalClaims);

        await userDoc.ref.update({ lastLoginAt: new Date() });

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
                debug: error.message
            },
            { status: 500 }
        );
    }
}
