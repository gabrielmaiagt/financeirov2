"use client";
import { useUI } from "@/components/ThemeProvider";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export const TopBar = () => {
    const { settings } = useUI();

    if (settings.layout !== "topbar") return null;

    return (
        <div className="w-full mb-6 sticky top-4 z-30">
            <div className="bg-neutral-950/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl">
                <TabsList className="h-auto w-full flex flex-wrap justify-center bg-transparent p-0 gap-1">
                    {NAV_ITEMS.map((item) => (
                        <TabsTrigger
                            key={item.value}
                            value={item.value}
                            className={cn(
                                "group flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 border border-transparent",
                                "text-muted-foreground hover:text-foreground hover:bg-white/5",
                                "data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/20 data-[state=active]:shadow-[0_0_10px_hsl(var(--primary)/0.2)]"
                            )}
                        >
                            <item.icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-data-[state=active]:scale-110" />
                            {item.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </div>
    );
};
