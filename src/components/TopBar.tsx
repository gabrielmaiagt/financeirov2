"use client";
import { useUI } from "@/components/ThemeProvider";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export const TopBar = () => {
    const { settings } = useUI();

    if (settings.layout !== "topbar") return null;

    return (
        <div className="w-full mb-6 sticky top-20 z-30">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-2 shadow-sm">
                <TabsList className="h-auto w-full justify-start overflow-x-auto no-scrollbar bg-transparent p-0 gap-2">
                    {NAV_ITEMS.map((item) => (
                        <TabsTrigger
                            key={item.value}
                            value={item.value}
                            className={cn(
                                "flex-shrink-0 gap-2 px-4 py-2.5 h-auto text-sm font-medium transition-all duration-300",
                                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:scale-105",
                                "hover:bg-accent/50 hover:text-accent-foreground rounded-lg"
                            )}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </div>
    );
};
