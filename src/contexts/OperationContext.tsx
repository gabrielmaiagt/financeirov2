'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { query, collection, where } from 'firebase/firestore';
import { useOrganization } from './OrganizationContext';
import { useOrgCollection } from '@/hooks/useFirestoreOrg';
import { useAuth } from './AuthContext';
import { Operation } from '@/types/organization';

interface OperationContextType {
    selectedOperationId: string | null;
    setSelectedOperationId: (id: string | null) => void;
    selectedOperation: Operation | null;
    operations: Operation[];
    isLoading: boolean;
}

const OperationContext = createContext<OperationContextType | undefined>(undefined);

export function OperationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { orgId } = useOrganization();
    const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

    const operationsCollection = useOrgCollection<Operation>('operations');

    const operationsQuery = useMemoFirebase(
        () => (operationsCollection && user) ? query(operationsCollection, where('active', '==', true)) : null,
        [operationsCollection, user]
    );

    const { data: operations, isLoading: isCollLoading } = useCollection<Operation>(operationsQuery);

    const isLoading = isCollLoading;

    const selectedOperation = React.useMemo(() => {
        if (!selectedOperationId || !operations) return null;
        return operations.find(op => op.id === selectedOperationId) || null;
    }, [selectedOperationId, operations]);

    // Auto-select first operation if none selected - DISABLED to show all by default
    // useEffect(() => {
    //     if (!selectedOperationId && operations && operations.length > 0) {
    //         setSelectedOperationId(operations[0].id);
    //     }
    // }, [operations, selectedOperationId]);

    const value = {
        selectedOperationId,
        setSelectedOperationId,
        selectedOperation,
        operations: operations || [],
        isLoading
    };

    return (
        <OperationContext.Provider value={value}>
            {children}
        </OperationContext.Provider>
    );
}

export function useOperation() {
    const context = useContext(OperationContext);
    if (context === undefined) {
        throw new Error('useOperation must be used within an OperationProvider');
    }
    return context;
}
