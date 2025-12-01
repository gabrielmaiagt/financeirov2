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
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 h-full overflow-y-auto no-scrollbar">
                <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-2 w-full justify-start">
                    {NAV_ITEMS.map((item) => (
                        <TabsTrigger
                            key={item.value}
                            value={item.value}
                            className={cn(
                                "w-full justify-start gap-3 px-4 py-3 h-auto text-sm font-medium transition-all",
                                "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-l-4 data-[state=active]:border-primary data-[state=active]:rounded-r-md data-[state=active]:rounded-l-none",
                                "hover:bg-accent/50 hover:text-accent-foreground rounded-md"
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
