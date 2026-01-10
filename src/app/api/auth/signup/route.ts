import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeFirebase } from '@/firebase/server-admin';
import { nanoid } from 'nanoid';

// Helper to slugify company name
function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, companyName } = body;

        // Validate input
        if (!name || !email || !password || !companyName) {
            return NextResponse.json(
                { error: 'Todos os campos são obrigatórios' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'A senha deve ter pelo menos 6 caracteres' },
                { status: 400 }
            );
        }

        // Initialize Firebase Admin
        const { auth, firestore } = initializeFirebase();

        // Check if user already exists
        try {
            await auth.getUserByEmail(email);
            return NextResponse.json(
                { error: 'Este email já está em uso' },
                { status: 400 }
            );
        } catch (error: any) {
            // User doesn't exist, proceed (this is what we want)
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }
        }

        // Create Firebase user
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
            emailVerified: false,
        });

        // Generate unique orgId
        const baseSlug = slugify(companyName);
        const uniqueId = nanoid(6).toLowerCase();
        const orgId = `${baseSlug}-${uniqueId}`;

        // Create organization document
        const orgRef = firestore.collection('organizations').doc(orgId);
        await orgRef.set({
            id: orgId,
            name: companyName,
            slug: orgId,
            theme: 'default',
            branding: {},
            features: {
                financials: true,
                analytics: true,
                notifications: true,
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            ownerId: userRecord.uid,
        });

        // Create user document in organization
        const userDocRef = orgRef.collection('users').doc(userRecord.uid);
        await userDocRef.set({
            uid: userRecord.uid,
            email,
            name,
            role: 'owner',
            permissions: ['admin', 'write', 'read'],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Set custom claims for the user
        await auth.setCustomUserClaims(userRecord.uid, {
            orgId: orgId,
            role: 'owner',
            admin: true,
        });

        // Create initial onboarding document
        const onboardingRef = orgRef.collection('settings').doc('onboarding');
        await onboardingRef.set({
            completed: false,
            currentStep: 0,
            steps: {
                welcome: false,
                operation: false,
                partners: false,
                tour: false,
            },
            startedAt: FieldValue.serverTimestamp(),
        });

        // Send verification email (Firebase handles this)
        try {
            const link = await auth.generateEmailVerificationLink(email);
            console.log('Email verification link generated:', link);
            // In production, you'd send this via email service
        } catch (emailError) {
            console.error('Error generating verification link:', emailError);
            // Don't fail the whole signup if email fails
        }

        return NextResponse.json({
            success: true,
            message: 'Conta criada com sucesso!',
            orgId,
            userId: userRecord.uid,
        });

    } catch (error: any) {
        console.error('Signup error:', error);

        // Handle specific Firebase errors
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json(
                { error: 'Este email já está em uso' },
                { status: 400 }
            );
        }

        if (error.code === 'auth/invalid-email') {
            return NextResponse.json(
                { error: 'Email inválido' },
                { status: 400 }
            );
        }

        if (error.code === 'auth/weak-password') {
            return NextResponse.json(
                { error: 'Senha muito fraca' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Erro ao criar conta. Tente novamente.' },
            { status: 500 }
        );
    }
}
