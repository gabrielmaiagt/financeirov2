'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Organization } from '@/types/organization';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
    orgId: string;
    organization: Organization | null;
    isLoading: boolean;
    error: Error | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: isAuthLoading } = useAuth();
    // Get orgId from authenticated user's custom claims
    const orgId = user?.orgId || 'interno-fluxo';
    const firestore = useFirestore();

    const orgRef = useMemo(() => {
        // Only attempt to fetch if user is logged in
        return (firestore && orgId && user) ? doc(firestore, 'organizations', orgId) : null;
    }, [firestore, orgId, user]);

    const { data: organization, isLoading: isDocLoading, error: docError } = useDoc<Organization>(orgRef);

    const isLoading = isAuthLoading || isDocLoading;

    // Only show "Not Found" if we actually tried to fetch (user is logged in) and failed
    const isNotFound = user && !isLoading && orgId && !organization;
    const error = docError || (isNotFound ? new Error(`Organization '${orgId}' not found`) : null);

    const value = {
        orgId: orgId,
        organization: organization || null,
        isLoading,
        error: error || null
    };

    if (isNotFound) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-xl mb-8">Organização não encontrada: <span className="font-mono bg-muted px-2 py-1 rounded">{orgId}</span></p>
                <p className="text-muted-foreground">Verifique a URL ou entre em contato com o suporte.</p>
            </div>
        );
    }

    return (
        <OrganizationContext.Provider value={value}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
}
