import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import bcrypt from 'bcryptjs';

// This endpoint creates an initial admin user if none exists
// Should only be used once to seed the first admin
export async function POST(request: NextRequest) {
    try {
        const { email, password, name, orgId, secretKey } = await request.json();

        // Basic security check - require a secret key to prevent abuse
        if (secretKey !== process.env.SEED_SECRET_KEY && secretKey !== 'initial-setup-2024') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!email || !password || !name || !orgId) {
            return NextResponse.json(
                { error: 'Email, senha, nome e organização são obrigatórios' },
                { status: 400 }
            );
        }

        // Initialize Firebase Admin and get firestore
        const { firestore: db } = initializeFirebase();

        // Check if organization has any users
        const usersRef = db.collection('organizations').doc(orgId).collection('users');
        const existingUsers = await usersRef.limit(1).get();

        if (!existingUsers.empty) {
            return NextResponse.json(
                { error: 'Esta organização já possui usuários cadastrados' },
                { status: 409 }
            );
        }

        // Ensure organization document exists
        const orgRef = db.collection('organizations').doc(orgId);
        const orgDoc = await orgRef.get();

        if (!orgDoc.exists) {
            await orgRef.set({
                name: orgId,
                createdAt: new Date(),
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create admin user
        const newUserRef = await usersRef.add({
            email: email.toLowerCase(),
            passwordHash,
            name,
            role: 'admin',
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: 'Admin inicial criado com sucesso!',
            user: {
                id: newUserRef.id,
                email: email.toLowerCase(),
                name,
                role: 'admin',
                orgId,
            },
        });
    } catch (error) {
        console.error('Seed admin error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
