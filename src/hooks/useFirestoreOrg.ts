import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, CollectionReference, DocumentReference } from 'firebase/firestore';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Returns a CollectionReference scoped to the current organization.
 * Path: organizations/{orgId}/{collectionName}
 */
export function useOrgCollection<T = any>(collectionName: string): CollectionReference<T> | null {
    const { orgId } = useOrganization();
    const firestore = useFirestore();

    return useMemoFirebase(() => {
        if (!firestore || !orgId) return null;
        return collection(firestore, 'organizations', orgId, collectionName) as CollectionReference<T>;
    }, [firestore, orgId, collectionName]);
}

/**
 * Returns a DocumentReference scoped to the current organization.
 * Path: organizations/{orgId}/{collectionName}/{docId}
 */
export function useOrgDoc<T = any>(collectionName: string, docId: string): DocumentReference<T> | null {
    const { orgId } = useOrganization();
    const firestore = useFirestore();

    return useMemoFirebase(() => {
        if (!firestore || !orgId || !docId) return null;
        return doc(firestore, 'organizations', orgId, collectionName, docId) as DocumentReference<T>;
    }, [firestore, orgId, collectionName, docId]);
}

/**
 * Returns the base path for the current organization's data.
 * Useful for constructing paths manually if needed.
 */
export function useOrgPath(subPath?: string): string {
    const { orgId } = useOrganization();
    if (!subPath) return `organizations/${orgId}`;
    return `organizations/${orgId}/${subPath}`;
}
