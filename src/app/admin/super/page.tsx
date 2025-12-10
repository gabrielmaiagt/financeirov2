'use client';

import { OrgList } from '@/components/admin/OrgList';
import { CreateOrgForm } from '@/components/admin/CreateOrgForm';
import { Separator } from '@/components/ui/separator';

export default function SuperAdminPage() {
    return (
        <div className="container mx-auto py-10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
                <p className="text-muted-foreground">Gerencie as organizações e configurações globais da plataforma.</p>
            </div>

            <Separator />

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <CreateOrgForm />
                </div>
                <div className="lg:col-span-2">
                    <OrgList />
                </div>
            </div>
        </div>
    );
}
