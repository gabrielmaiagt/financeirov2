'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Palette, Image, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function BrandingSettings() {
    const { orgId, organization } = useOrganization();
    const firestore = useFirestore();

    const [primaryColor, setPrimaryColor] = useState('#6366f1');
    const [accentColor, setAccentColor] = useState('#f59e0b');
    const [logoUrl, setLogoUrl] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (organization?.branding) {
            setPrimaryColor(organization.branding.primaryColor || '#6366f1');
            setAccentColor(organization.branding.accentColor || '#f59e0b');
            setLogoUrl(organization.branding.logoUrl || '');
            setCompanyName(organization.branding.companyName || '');
        }
    }, [organization]);

    const handleSave = async () => {
        if (!firestore || !orgId) return;

        setLoading(true);
        setSaved(false);

        try {
            const orgRef = doc(firestore, 'organizations', orgId);
            await updateDoc(orgRef, {
                branding: {
                    primaryColor,
                    accentColor,
                    logoUrl: logoUrl || null,
                    companyName: companyName || null,
                },
                updatedAt: serverTimestamp(),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Error saving branding:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Palette className="h-6 w-6 text-primary" />
                    <div>
                        <CardTitle>Personalização Visual</CardTitle>
                        <CardDescription>Configure as cores e logo da sua organização</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Color Pickers */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="primaryColor">Cor Principal</Label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                id="primaryColor"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="w-12 h-10 rounded border cursor-pointer"
                            />
                            <Input
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                placeholder="#6366f1"
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="accentColor">Cor de Destaque</Label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                id="accentColor"
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="w-12 h-10 rounded border cursor-pointer"
                            />
                            <Input
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                placeholder="#f59e0b"
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>

                {/* Logo URL */}
                <div className="space-y-2">
                    <Label htmlFor="logoUrl">
                        <div className="flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            URL do Logo
                        </div>
                    </Label>
                    <Input
                        id="logoUrl"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://exemplo.com/logo.png"
                    />
                    {logoUrl && (
                        <div className="mt-2 p-4 bg-muted rounded-lg flex justify-center">
                            <img src={logoUrl} alt="Preview" className="max-h-16 object-contain" />
                        </div>
                    )}
                </div>

                {/* Company Name Override */}
                <div className="space-y-2">
                    <Label htmlFor="companyName">Nome de Exibição (opcional)</Label>
                    <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder={organization?.name || 'Nome da Empresa'}
                    />
                    <p className="text-xs text-muted-foreground">
                        Se preenchido, aparecerá no título da página e no header.
                    </p>
                </div>

                {/* Preview Bar */}
                <div className="p-4 rounded-lg border" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                    <p className="text-white font-medium text-center">Preview das Cores</p>
                </div>

                {saved && (
                    <Alert className="border-green-500 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>Configurações salvas com sucesso!</AlertDescription>
                    </Alert>
                )}

                <Button onClick={handleSave} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar Alterações
                </Button>
            </CardContent>
        </Card>
    );
}
