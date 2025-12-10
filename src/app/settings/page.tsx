'use client';

import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { Separator } from '@/components/ui/separator';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="container mx-auto py-10 space-y-8">
            <div>
                <div className="flex items-center gap-3">
                    <Settings className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                </div>
                <p className="text-muted-foreground mt-1">Personalize sua organização.</p>
            </div>

            <Separator />

            <div className="grid gap-8 lg:grid-cols-2">
                <BrandingSettings />
            </div>
        </div>
    );
}
