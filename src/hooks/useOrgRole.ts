import { useMemo } from 'react';
import { useUser } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { OrganizationMember } from '@/types/organization';
import { useMemoFirebase } from '@/firebase/provider';

export function useOrgRole() {
    const { user } = useUser();
    const { orgId } = useOrganization();
    const firestore = useFirestore();

    const membersRef = useMemoFirebase(
        () => (firestore && orgId && user)
            ? query(collection(firestore, 'organizations', orgId, 'members'), where('userId', '==', user.uid))
            : null,
        [firestore, orgId, user]
    );

    // We also might want to check by email if userId is not linked yet (e.g. first login after invite)
    // But for now let's assume valid members have userId linked or we handle email match separately.
    // Actually, to handle the "Invite accept" flow automatically, we might simply look for email.
    // But that's dangerous if emails are not verified.
    // Secure way: Only trust userId match. Logic to link email->userId should happen on backend or secure client flow.
    // For this MVP: we will check by userId.

    const { data: members, isLoading } = useCollection<OrganizationMember>(membersRef);
    const member = members?.[0];

    const role = member?.role;
    const isOwner = role === 'owner';
    const isAdmin = role === 'admin' || isOwner;

    return {
        member,
        role,
        isOwner,
        isAdmin,
        isLoading
    };
}
