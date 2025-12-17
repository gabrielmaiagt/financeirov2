'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Organization } from '@/types/organization';

interface OrganizationContextType {
    orgId: string;
    organization: Organization | null;
    isLoading: boolean;
    error: Error | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const [orgId, setOrgId] = React.useState<string | null>(null);
    const firestore = useFirestore();

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');

            // Subdomain to OrgId mapping (for custom domains or aliases)
            // Add your subdomain mappings here
            const subdomainMappings: Record<string, string> = {
                'financeiro': 'interno-fluxo', // financeiro.fluxodeoferta.site -> interno-fluxo
                // Add more mappings as needed:
                // 'cliente1': 'org-cliente1',
                // 'empresa': 'org-empresa',
            };

            let detectedOrgId: string;

            if (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('127.0.0.1')) {
                // Dev environment root
                detectedOrgId = 'interno-fluxo';
            } else if (parts.length > 1 && parts[0] !== 'www') {
                // Subdomain detected - check if there's a mapping
                const subdomain = parts[0];
                detectedOrgId = subdomainMappings[subdomain] || subdomain;
            } else {
                // Production root (e.g. app.com) -> Default org
                detectedOrgId = 'interno-fluxo';
            }

            setOrgId(detectedOrgId);
        }
    }, []);

    const orgRef = useMemo(() => {
        return (firestore && orgId) ? doc(firestore, 'organizations', orgId) : null;
    }, [firestore, orgId]);

    const { data: organization, isLoading: isDocLoading, error: docError } = useDoc<Organization>(orgRef);

    // Combined loading state: waiting for orgId resolution OR doc fetching
    const isLoading = orgId === null || isDocLoading;

    // Error state: Doc fetch error OR Doc missing (if not loading)
    const isNotFound = !isLoading && orgId && !organization;
    const error = docError || (isNotFound ? new Error(`Organization '${orgId}' not found`) : null);

    const value = {
        orgId: orgId || '',
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
