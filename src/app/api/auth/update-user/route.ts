import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { userId, currentOrgId, updates } = await request.json();

        if (!userId || !currentOrgId || !updates) {
            return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
        }

        if (updates.role && !['admin', 'user'].includes(updates.role)) {
            return NextResponse.json({ error: 'Função inválida' }, { status: 400 });
        }

        const { firestore: db } = initializeFirebase();
        const userRef = db.collection('organizations').doc(currentOrgId).collection('users').doc(userId);

        // Pre-calculate password hash if needed
        let newPasswordHash: string | undefined;
        if (updates.password) {
            if (updates.password.length < 6) {
                return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
            }
            newPasswordHash = await bcrypt.hash(updates.password, 12);
        }

        // Handle Organization Move
        if (updates.newOrgId && updates.newOrgId !== currentOrgId) {
            await db.runTransaction(async (t) => {
                // 1. Get old doc
                const oldDoc = await t.get(userRef);
                if (!oldDoc.exists) throw new Error('Usuário não encontrado');

                // 2. Check new Org exists
                const newOrgRef = db.collection('organizations').doc(updates.newOrgId);
                const newOrgDoc = await t.get(newOrgRef);
                if (!newOrgDoc.exists) throw new Error('Organização de destino não encontrada');

                const data = oldDoc.data()!;

                // 3. Prepare new data
                const newData: any = {
                    ...data, // Copy all existing fields
                    name: updates.name || data.name,
                    email: updates.email || data.email,
                    role: updates.role || data.role,
                };

                if (newPasswordHash) {
                    newData.passwordHash = newPasswordHash;
                    newData.passwordChangedAt = new Date();
                }

                // 4. Check email uniqueness in NEW Org
                const newUsersRef = newOrgRef.collection('users');
                const emailQuery = newUsersRef.where('email', '==', newData.email).limit(1);
                const existing = await t.get(emailQuery);

                if (!existing.empty) {
                    if (existing.docs[0].id !== userId) {
                        throw new Error('Email já existe na organização de destino');
                    }
                }

                // 5. Write to new location (preserving ID)
                const newDocRef = newUsersRef.doc(userId);
                t.set(newDocRef, newData);

                // 6. Delete old
                t.delete(userRef);
            });
        } else {
            // Simple Update
            await db.runTransaction(async (t) => {
                const doc = await t.get(userRef);
                if (!doc.exists) throw new Error('Usuário não encontrado');
                const data = doc.data()!;

                const updateData: any = {};
                if (updates.name) updateData.name = updates.name;
                if (updates.role) updateData.role = updates.role;

                // If email changed, check uniqueness
                if (updates.email && updates.email !== data.email) {
                    const emailQuery = userRef.parent.where('email', '==', updates.email).limit(1);
                    const existing = await t.get(emailQuery);
                    if (!existing.empty) throw new Error('Email já em uso nesta organização');
                    updateData.email = updates.email;
                }

                if (newPasswordHash) {
                    updateData.passwordHash = newPasswordHash;
                    updateData.passwordChangedAt = new Date();
                }

                if (Object.keys(updateData).length > 0) {
                    t.update(userRef, updateData);
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: error.message || 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
