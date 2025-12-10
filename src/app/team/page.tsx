'use client';

import { MemberList } from '@/components/team/MemberList';
import { InviteMemberDialog } from '@/components/team/InviteMemberDialog';
import { Separator } from '@/components/ui/separator';
import { useOrgRole } from '@/hooks/useOrgRole';
import { Users } from 'lucide-react';

export default function TeamPage() {
    const { isAdmin } = useOrgRole();

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">Gerencie os membros da sua organização.</p>
                </div>

                {isAdmin && <InviteMemberDialog />}
            </div>

            <Separator />

            <MemberList />
        </div>
    );
}
