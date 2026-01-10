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
            <div className="space-y-1">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60 px-3 mb-2">
                    {title}
                </h3>
                {tabs.map((item) => {
                    const Icon = item.icon;

                    return (
                        <TabsTrigger
                            key={item.value}
                            value={item.value}
                            className={cn(
                                "group relative w-full justify-start gap-3 px-3 py-2.5 h-auto text-sm font-medium transition-all duration-200 rounded-lg overflow-hidden ring-offset-0 focus-visible:ring-0",
                                "text-muted-foreground hover:text-foreground hover:bg-white/5",
                                "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-l-2 data-[state=active]:border-primary"
                            )}
                        >
                            <Icon className={cn(
                                "w-4 h-4 shrink-0 transition-all duration-200",
                                "group-hover:scale-110",
                                "group-data-[state=active]:scale-110 group-data-[state=active]:text-primary"
                            )} />
                            <span className="relative z-10">{item.label}</span>
                        </TabsTrigger>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="hidden md:flex flex-col w-64 shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-r border-white/5">
            <div className="flex flex-col h-full bg-neutral-950/60 backdrop-blur-sm">

                {/* Content - Navigation with sections */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                    <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-6 w-full justify-start">
                        {renderSection("Principal", mainTabs)}
                        {renderSection("Gestão", managementTabs)}
                        {renderSection("Conteúdo", contentTabs)}
                        {renderSection("Outros", otherTabs)}
                    </TabsList>
                </div>

                {/* Footer - Version only */}
                <div className="p-4 border-t border-white/5">
                    <p className="text-[10px] text-muted-foreground/50 text-center uppercase tracking-wider">
                        v 2.0
                    </p>
                </div>
            </div>
        </div>
    );
};
