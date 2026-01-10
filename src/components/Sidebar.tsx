"use client";
import { useUI } from "@/components/ThemeProvider";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useTabSettings } from "@/hooks/use-tab-settings";

export const Sidebar = () => {
    const { settings } = useUI();
    const { visibleTabs } = useTabSettings();

    if (settings.layout !== "sidebar") return null;

    // Group tabs by category
    const mainTabs = visibleTabs.filter(tab =>
        ['dashboard', 'lancamentos', 'vendas', 'despesas'].includes(tab.value)
    );

    const managementTabs = visibleTabs.filter(tab =>
        ['tarefas', 'calendario', 'metas'].includes(tab.value)
    );

    const contentTabs = visibleTabs.filter(tab =>
        ['criativos', 'anotacoes', 'frases', 'perfis'].includes(tab.value)
    );

    const otherTabs = visibleTabs.filter(tab =>
        !mainTabs.includes(tab) && !managementTabs.includes(tab) && !contentTabs.includes(tab)
    );

    const renderSection = (title: string, tabs: typeof visibleTabs) => {
        if (tabs.length === 0) return null;

        return (
            <div className="space-y-0.5">
                <h3 className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted-foreground/40 px-4 py-2 mb-1">
                    {title}
                </h3>
                {tabs.map((item) => {
                    const Icon = item.icon;

                    return (
                        <TabsTrigger
                            key={item.value}
                            value={item.value}
                            className={cn(
                                "group relative w-full justify-start gap-3.5 px-4 py-2.5 h-auto text-[13px] font-medium transition-all duration-150 rounded-none overflow-visible ring-offset-0 focus-visible:ring-0 border-l-[3px] border-transparent",
                                "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.02] hover:border-l-muted-foreground/20",
                                "data-[state=active]:bg-white/[0.04] data-[state=active]:text-foreground data-[state=active]:border-l-primary data-[state=active]:font-semibold"
                            )}
                        >
                            <Icon className={cn(
                                "w-[18px] h-[18px] shrink-0 transition-all duration-150",
                                "group-hover:text-foreground",
                                "group-data-[state=active]:text-primary"
                            )} />
                            <span className="relative z-10 tracking-wide">{item.label}</span>
                        </TabsTrigger>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="hidden md:flex flex-col w-[260px] shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-r border-white/[0.06]">
            <div className="flex flex-col h-full bg-[#0a0a0a]">

                {/* Content - Navigation with sections */}
                <div className="flex-1 overflow-y-auto py-6 space-y-5 no-scrollbar">
                    <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-5 w-full justify-start">
                        {renderSection("Geral", mainTabs)}
                        {renderSection("Gestão", managementTabs)}
                        {renderSection("Conteúdo", contentTabs)}
                        {renderSection("Outros", otherTabs)}
                    </TabsList>
                </div>

                {/* Footer */}
                <div className="px-4 py-4 border-t border-white/[0.06]">
                    <p className="text-[10px] text-muted-foreground/30 text-center uppercase tracking-widest font-semibold">
                        Versão 2.0
                    </p>
                </div>
            </div>
        </div>
    );
};
