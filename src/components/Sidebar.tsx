"use client";
import { useUI } from "@/components/ThemeProvider";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useTabSettings } from "@/hooks/use-tab-settings";
import { Wallet } from 'lucide-react';

export const Sidebar = () => {
    const { settings } = useUI();
    const { visibleTabs } = useTabSettings();

    if (settings.layout !== "sidebar") return null;

    return (
        <div className="hidden md:flex flex-col w-64 shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-r border-white/5">
            <div className="flex flex-col h-full bg-neutral-950/60 backdrop-blur-sm">

                {/* Header - Brand */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-xl shrink-0">
                            <Wallet className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-foreground">Painel</h2>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Financeiro</span>
                        </div>
                    </div>
                </div>

                {/* Content - Navigation using TabsList/TabsTrigger */}
                <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                    <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1 w-full justify-start">
                        {visibleTabs.map((item) => {
                            const Icon = item.icon;

                            return (
                                <TabsTrigger
                                    key={item.value}
                                    value={item.value}
                                    className={cn(
                                        "group relative w-full justify-start gap-3 px-3 py-2.5 h-auto text-sm font-medium transition-all duration-200 rounded-lg overflow-hidden ring-offset-0 focus-visible:ring-0",
                                        "text-muted-foreground hover:text-foreground hover:bg-white/5",
                                        "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
                                    )}
                                >
                                    {/* Active indicator - left border */}
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full transition-all duration-200 opacity-0 group-data-[state=active]:opacity-100 group-data-[state=active]:h-8" />

                                    <Icon className={cn(
                                        "w-4 h-4 shrink-0 transition-all duration-200",
                                        "group-hover:scale-110",
                                        "group-data-[state=active]:scale-110 group-data-[state=active]:text-primary"
                                    )} />
                                    <span className="relative z-10">{item.label}</span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </div>

                {/* Footer - Simple */}
                <div className="p-4 border-t border-white/5">
                    <p className="text-xs text-muted-foreground text-center">
                        Painel Financeiro v2.0
                    </p>
                </div>
            </div>
        </div>
    );
};
