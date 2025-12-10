'use client';

import { useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Organization } from '@/types/organization';

export function InitOrg() {
    const firestore = useFirestore();

    useEffect(() => {
        async function init() {
            if (!firestore) return;

            const orgId = 'interno-fluxo';
            const orgRef = doc(firestore, 'organizations', orgId);
            const orgSnap = await getDoc(orgRef);

            if (!orgSnap.exists()) {
                console.log('Creating organization:', orgId);
                const newOrg: Organization = {
                    id: orgId,
                    name: 'Interno Fluxo',
                    slug: 'interno-fluxo',
                    theme: 'cartoon',
                    features: {
                        financials: true,
                        crm: true,
                        tasks: true,
                        creatives: true,
                        goals: true,
                        insights: true,
                        profiles: true,
                        quotes: true,
                        expenses: true,
                        logins: true,
                        recovery: true,
                    },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };

                await setDoc(orgRef, newOrg);
                console.log('Organization created successfully!');
            } else {
                console.log('Organization already exists:', orgId);
            }
        }

        init();
    }, [firestore]);

    return null;
}
