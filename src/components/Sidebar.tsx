"use client";
import { useUI } from "@/components/ThemeProvider";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
    const { settings } = useUI();

    if (settings.layout !== "sidebar") return null;

    return (
        <div className="hidden md:flex flex-col w-64 shrink-0 h-[calc(100vh-8rem)] sticky top-24 mr-6">
            <div className="bg-neutral-950/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 h-full overflow-y-auto no-scrollbar shadow-xl">
                <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1.5 w-full justify-start">
                    {NAV_ITEMS.map((item) => (
                        <TabsTrigger
                            key={item.value}
                            value={item.value}
                            className={cn(
                                "group relative w-full justify-start gap-3 px-4 py-3 h-auto text-sm font-medium transition-all duration-300 rounded-xl overflow-hidden ring-offset-0 focus-visible:ring-0",
                                "text-muted-foreground hover:text-foreground hover:bg-white/5",
                                "data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-sm"
                            )}
                        >
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full transition-all duration-300 opacity-0 group-data-[state=active]:opacity-100 group-data-[state=active]:h-1/2 shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />

                            <item.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-data-[state=active]:scale-110 group-data-[state=active]:text-primary" />
                            <span className="relative z-10">{item.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </div>
    );
};
