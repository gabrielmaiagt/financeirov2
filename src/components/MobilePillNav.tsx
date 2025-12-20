"use client";
import { useUI } from "@/components/ThemeProvider";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTabSettings } from "@/hooks/use-tab-settings";

export const MobilePillNav = () => {
    const { settings } = useUI();
    const { visibleTabs } = useTabSettings();

    // Show on all layouts because mobile needs nav regardless of 'sidebar' setting usually,
    // but strictly speaking we only show if navigation is needed. 
    // Assuming yes.

    if (visibleTabs.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-[90%] max-w-sm">
            <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl p-2">
                <TabsList className="flex w-full h-auto bg-transparent p-0 justify-between items-center gap-1">
                    {visibleTabs.slice(0, 5).map((item) => (
                        <TabsTrigger
                            key={item.value}
                            value={item.value}
                            className={cn(
                                "group relative flex-1 flex-col items-center justify-center gap-1 py-2 px-1 text-[10px] font-medium transition-all duration-300 rounded-full h-auto bg-transparent data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                            )}
                        >
                            <item.icon className="w-5 h-5 mb-0.5" />
                            {/* Label on mobile might be too crowded, maybe just icons? 
                                User asked for 'iOS dock' style which often has icons only or tooltips.
                                Let's keep small text for clarity.
                            */}
                            {/* <span className="scale-75 origin-top">{item.label}</span> */}
                        </TabsTrigger>
                    ))}
                    {/* Overflow menu for extra items? 
                        For now just showing first 5 items to fit comfortably. 
                    */}
                </TabsList>
            </div>
        </div>
    );
};
