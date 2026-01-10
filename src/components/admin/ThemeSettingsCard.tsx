'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts/ThemeContext";
import { Sparkles, Palette } from "lucide-react";

export function ThemeSettingsCard() {
    const { theme, toggleTheme } = useTheme();
    const isPremium = theme === 'premium';

    return (
        <Card className="border-neutral-800">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <CardTitle>Tema Visual</CardTitle>
                </div>
                <CardDescription>
                    Personalize a aparência do painel financeiro
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div
                    onClick={toggleTheme}
                    className={`
                        flex items-center justify-between p-4 border-2 rounded-lg transition-all cursor-pointer
                        ${isPremium
                            ? 'bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-violet-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                            : 'bg-neutral-950/50 border-neutral-800 hover:border-neutral-700'
                        }
                    `}
                >
                    <div className="flex items-center space-x-3">
                        <div className={`
                            p-2 rounded-md transition-colors
                            ${isPremium
                                ? 'bg-gradient-to-br from-cyan-500 to-purple-500'
                                : 'bg-neutral-800'
                            }
                        `}>
                            <Sparkles className={`w-5 h-5 ${isPremium ? 'text-white' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                            <Label className="font-medium cursor-pointer pointer-events-none">
                                Tema Premium
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {isPremium
                                    ? 'Visual cyberpunk com gradientes azul-roxo'
                                    : 'Ative para visual analytics premium'
                                }
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={isPremium}
                        className="pointer-events-none"
                    />
                </div>

                {isPremium && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-lg">
                        <p className="text-xs text-cyan-200">
                            ✨ <strong>Tema Premium Ativado!</strong> Gradientes cyan-purple, glassmorphism e glow effects aplicados em todo o painel.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
