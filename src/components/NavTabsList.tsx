"use client";
import { useUI } from "@/components/ThemeProvider";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export const NavTabsList = () => {
    const { settings } = useUI();

    if (settings.layout !== "tabs") return null;

    return (
        <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 no-scrollbar">
            <TabsList className="h-auto w-max justify-start flex-nowrap bg-transparent p-0 gap-2">
                {NAV_ITEMS.map((item) => (
                    <TabsTrigger
                        key={item.value}
                        value={item.value}
                        className={cn(
                            "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200",
                            "hover:bg-accent/50 hover:text-accent-foreground rounded-md px-4 py-2"
                        )}
                    >
                        {item.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
    );
};
