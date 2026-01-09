import { useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { doc } from 'firebase/firestore';
import { NAV_ITEMS } from '@/lib/navigation';

export interface TabSettings {
    hiddenTabs?: string[];
    mobileNavStyle?: 'floating' | 'hamburger';
}

export function useTabSettings() {
    const firestore = useFirestore();
    const { orgId } = useOrganization();

    const docRef = useMemo(() => {
        return (firestore && orgId) ? doc(firestore, 'organizations', orgId, 'settings', 'ui') : null;
    }, [firestore, orgId]);
    const { data: settings, isLoading } = useDoc<TabSettings>(docRef);

    const isTabVisible = (tabValue: string) => {
        if (!settings || !settings.hiddenTabs) return true;
        return !settings.hiddenTabs.includes(tabValue);
    };

    const visibleTabs = NAV_ITEMS.filter(item => isTabVisible(item.value));

    return {
        settings,
        isLoading,
        isTabVisible,
        visibleTabs
    };
}
