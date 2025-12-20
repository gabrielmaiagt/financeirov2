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
    );
}
