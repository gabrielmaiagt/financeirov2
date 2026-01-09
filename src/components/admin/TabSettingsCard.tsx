'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useFirestore } from "@/firebase";
import { useOrganization } from "@/contexts/OrganizationContext";
import { doc, setDoc } from "firebase/firestore";
import { NAV_ITEMS } from "@/lib/navigation";
import { useTabSettings } from "@/hooks/use-tab-settings";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function TabSettingsCard() {
    const firestore = useFirestore();
    const { orgId } = useOrganization();
    const { settings, isLoading } = useTabSettings();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = async (tabValue: string, isVisible: boolean) => {
        if (!firestore || !orgId) return;

        setIsSaving(true);
        try {
            const currentHidden = settings?.hiddenTabs || [];
            let newHidden;

            if (isVisible) {
                // If making visible, remove from hidden list
                newHidden = currentHidden.filter(t => t !== tabValue);
            } else {
                // If hiding, add to hidden list
                newHidden = [...currentHidden, tabValue];
            }

            // Remove duplicates just in case
            newHidden = [...new Set(newHidden)];

            const docRef = doc(firestore, 'organizations', orgId, 'settings', 'ui');
            await setDoc(docRef, { hiddenTabs: newHidden }, { merge: true });

        } catch (error) {
            console.error("Error updating tabs:", error);
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível atualizar a visibilidade da aba.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleMobileNavToggle = async (style: 'floating' | 'hamburger') => {
        if (!firestore || !orgId) return;

        setIsSaving(true);
        try {
            const docRef = doc(firestore, 'organizations', orgId, 'settings', 'ui');
            await setDoc(docRef, { mobileNavStyle: style }, { merge: true });

            toast({
                title: "Navegação atualizada",
                description: `Modo ${style === 'floating' ? 'Botões Flutuantes' : 'Menu Hambúrguer'} ativado.`,
            });
        } catch (error) {
            console.error("Error updating mobile nav:", error);
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível atualizar o estilo de navegação.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="pt-6 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Visibilidade das Abas</CardTitle>
                    <CardDescription>
                        Escolha quais abas aparecem na barra lateral e no menu.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {NAV_ITEMS.map((item) => {
                            const isHidden = settings?.hiddenTabs?.includes(item.value);
                            const isVisible = !isHidden;

                            return (
                                <div
                                    key={item.value}
                                    onClick={() => handleToggle(item.value, !isVisible)}
                                    className={cn(
                                        "flex items-center justify-between space-x-2 border rounded-lg p-3 transition-all cursor-pointer hover:bg-neutral-900 border-neutral-800",
                                        isVisible ? "bg-primary/5 border-primary/20" : "bg-neutral-950/50 opacity-60"
                                    )}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={cn(
                                            "p-2 rounded-md transition-colors",
                                            isVisible ? "bg-primary/10 text-primary" : "bg-neutral-800 text-muted-foreground"
                                        )}>
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <Label className="font-medium cursor-pointer pointer-events-none">
                                            {item.label}
                                        </Label>
                                    </div>
                                    <Switch
                                        checked={isVisible}
                                        disabled={isSaving}
                                        className="pointer-events-none" // Let the parent div handle the click for bigger target
                                    />
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Navegação Mobile</CardTitle>
                    <CardDescription>
                        Configure como a navegação aparece em dispositivos móveis.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div
                            onClick={() => handleMobileNavToggle('floating')}
                            className={cn(
                                "flex items-center justify-between p-4 border rounded-lg transition-all cursor-pointer hover:bg-neutral-900 border-neutral-800",
                                (!settings?.mobileNavStyle || settings?.mobileNavStyle === 'floating') ? "bg-primary/5 border-primary/20" : "bg-neutral-950/50 opacity-60"
                            )}
                        >
                            <div className="flex items-center space-x-3">
                                <div className={cn("p-2 rounded-md", (!settings?.mobileNavStyle || settings?.mobileNavStyle === 'floating') ? "bg-primary/10 text-primary" : "bg-neutral-800 text-muted-foreground")}>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <Label className="font-medium cursor-pointer pointer-events-none">Botões Flutuantes</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">Navegação fixa na parte inferior (estilo iOS dock)</p>
                                </div>
                            </div>
                            <Switch checked={!settings?.mobileNavStyle || settings?.mobileNavStyle === 'floating'} disabled={isSaving} className="pointer-events-none" />
                        </div>

                        <div
                            onClick={() => handleMobileNavToggle('hamburger')}
                            className={cn(
                                "flex items-center justify-between p-4 border rounded-lg transition-all cursor-pointer hover:bg-neutral-900 border-neutral-800",
                                settings?.mobileNavStyle === 'hamburger' ? "bg-primary/5 border-primary/20" : "bg-neutral-950/50 opacity-60"
                            )}
                        >
                            <div className="flex items-center space-x-3">
                                <div className={cn("p-2 rounded-md", settings?.mobileNavStyle === 'hamburger' ? "bg-primary/10 text-primary" : "bg-neutral-800 text-muted-foreground")}>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </div>
                                <div>
                                    <Label className={cn("font-medium cursor-pointer pointer-events-none", settings?.mobileNavStyle !== 'hamburger' && "text-muted-foreground")}>Menu Hambúrguer</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">Menu lateral deslizante</p>
                                </div>
                            </div>
                            <Switch checked={settings?.mobileNavStyle === 'hamburger'} disabled={isSaving} className="pointer-events-none" />
                        </div>

                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-xs text-blue-200">
                                💡 <strong>Dica:</strong> O layout mobile sempre mostra apenas os ícones para economizar espaço. Você pode personalizar quais abas aparecem na seção "Visibilidade das Abas" acima.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
