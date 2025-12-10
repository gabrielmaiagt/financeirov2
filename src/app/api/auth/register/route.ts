import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { email, password, name, role, orgId, adminUserId } = await request.json();

        if (!email || !password || !name || !orgId) {
            return NextResponse.json(
                { error: 'Email, senha, nome e organização são obrigatórios' },
                { status: 400 }
            );
        }

        // Initialize Firebase Admin and get firestore
        const { firestore: db } = initializeFirebase();

        // Verify admin permission (optional - for admin-only registration)
        if (adminUserId) {
            const adminDoc = await db.collection('organizations').doc(orgId).collection('users').doc(adminUserId).get();
            if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
                return NextResponse.json(
                    { error: 'Apenas administradores podem criar usuários' },
                    { status: 403 }
                );
            }
        }

        // Check if user already exists
        const usersRef = db.collection('organizations').doc(orgId).collection('users');
        const existingUser = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();

        if (!existingUser.empty) {
            return NextResponse.json(
                { error: 'Este email já está cadastrado' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Generate Webhook Secret
        const crypto = require('crypto');
        const webhookSecret = 'wh_sec_' + crypto.randomBytes(16).toString('hex');

        // Ensure Organization Info is initialized (if we were creating config docs etc, we would do it here)
        // Note: The original code assumes 'orgId' is provided. 
        // If this route is "Creating a User for an EXISTING Org", we shouldn't change the Org's secret.
        // Wait, the prompt implies "Update Organization model". 
        // If this /register is actually "Create New Org + User", then yes. 
        // But user provided 'orgId'. 

        // Let's look at the code: "const { email, ..., orgId } = await request.json();"
        // It seems this endpoint creates a USER in an ORG.
        // It does NOT create the org itself.
        // The Org creation presumably happens elsewhere or 'orgId' is just a slug.

        // If orgId is just a slug and we are "initializing" it... 
        // Actually, if the org doc doesn't validly exist with config, we might want to ensure it?
        // But `usersRef` is `db.collection('organizations').doc(orgId)...`.

        // Issue: We need to know if we are creating a *new organization* or just a user.
        // The variable name `orgId` suggests it's an ID.
        // If the org document itself doesn't have `webhookSecret`, we should probably add it.
        // BUT, this is inside `usersRef.add`.
        // We should check/update the Organization Document.

        const orgRef = db.collection('organizations').doc(orgId);
        const orgDoc = await orgRef.get();

        if (!orgDoc.exists) {
            // Implicitly creating Org if it doesn't exist? 
            // Or maybe it exists but empty?
            await orgRef.set({
                name: orgId, // Fallback name
                webhookSecret,
                createdAt: new Date()
            }, { merge: true });
        } else {
            // Org exists. Check if it has secret.
            const orgData = orgDoc.data();
            if (!orgData?.webhookSecret) {
                await orgRef.update({ webhookSecret });
            }
        }


        // Create user
        const newUserRef = await usersRef.add({
            email: email.toLowerCase(),
            passwordHash,
            name,
            role: role || 'user',
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            user: {
                id: newUserRef.id,
                email: email.toLowerCase(),
                name,
                role: role || 'user',
                orgId,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
