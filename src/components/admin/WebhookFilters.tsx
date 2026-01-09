'use client';

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface WebhookFiltersProps {
    settings: any;
    onToggle: (field: string, value: boolean) => void;
    isSaving: boolean;
}

export function WebhookFilters({ settings, onToggle, isSaving }: WebhookFiltersProps) {
    return (
        <div className="space-y-4 border-t border-neutral-800 pt-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">🔔 Filtros de Webhook</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Controle quais eventos de pagamento enviam notificações
                </p>
            </div>

            <div className="grid gap-3">
                {/* PIX Gerado */}
                <div
                    onClick={() => onToggle('notifyPending', !(settings.notifyPending ?? true))}
                    className={cn(
                        "flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer hover:bg-neutral-900 border-neutral-800",
                        (settings.notifyPending ?? true) ? "bg-yellow-500/5 border-yellow-500/20" : "bg-neutral-950/50"
                    )}
                >
                    <div className="flex items-center space-x-3">
                        <span className="text-xl">⏳</span>
                        <div>
                            <Label className="font-medium cursor-pointer pointer-events-none text-sm">PIX Gerado</Label>
                            <p className="text-xs text-muted-foreground">Notifica quando PIX é gerado</p>
                        </div>
                    </div>
                    <Switch checked={settings.notifyPending ?? true} disabled={isSaving} className="pointer-events-none" />
                </div>

                {/* PIX Pago */}
                <div
                    onClick={() => onToggle('notifyApproved', !(settings.notifyApproved ?? true))}
                    className={cn(
                        "flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer hover:bg-neutral-900 border-neutral-800",
                        (settings.notifyApproved ?? true) ? "bg-green-500/5 border-green-500/20" : "bg-neutral-950/50"
                    )}
                >
                    <div className="flex items-center space-x-3">
                        <span className="text-xl">✅</span>
                        <div>
                            <Label className="font-medium cursor-pointer pointer-events-none text-sm">PIX Pago</Label>
                            <p className="text-xs text-muted-foreground">Notifica quando pagamento é confirmado</p>
                        </div>
                    </div>
                    <Switch checked={settings.notifyApproved ?? true} disabled={isSaving} className="pointer-events-none" />
                </div>

                {/* Reembolsos */}
                <div
                    onClick={() => onToggle('notifyRefunded', !(settings.notifyRefunded ?? false))}
                    className={cn(
                        "flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer hover:bg-neutral-900 border-neutral-800",
                        settings.notifyRefunded ? "bg-red-500/5 border-red-500/20" : "bg-neutral-950/50"
                    )}
                >
                    <div className="flex items-center space-x-3">
                        <span className="text-xl">↩️</span>
                        <div>
                            <Label className="font-medium cursor-pointer pointer-events-none text-sm">Reembolsos</Label>
                            <p className="text-xs text-muted-foreground">Notifica quando há reembolso</p>
                        </div>
                    </div>
                    <Switch checked={settings.notifyRefunded ?? false} disabled={isSaving} className="pointer-events-none" />
                </div>

                {/* Som */}
                <div
                    onClick={() => onToggle('playSound', !(settings.playSound ?? true))}
                    className={cn(
                        "flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer hover:bg-neutral-900 border-neutral-800",
                        (settings.playSound ?? true) ? "bg-blue-500/5 border-blue-500/20" : "bg-neutral-950/50"
                    )}
                >
                    <div className="flex items-center space-x-3">
                        <span className="text-xl">🔊</span>
                        <div>
                            <Label className="font-medium cursor-pointer pointer-events-none text-sm">Som de Notificação</Label>
                            <p className="text-xs text-muted-foreground">Reproduz som nas notificações</p>
                        </div>
                    </div>
                    <Switch checked={settings.playSound ?? true} disabled={isSaving} className="pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
