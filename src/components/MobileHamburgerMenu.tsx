"use client";
import { useState } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useTabSettings } from "@/hooks/use-tab-settings";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MobileHamburgerMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { visibleTabs } = useTabSettings();

    if (visibleTabs.length === 0) return null;

    return (
        <>
            {/* Hamburger Button - Fixed top left */}
            <div className="fixed top-4 left-4 z-50 md:hidden">
                <Button
                    onClick={() => setIsOpen(true)}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 bg-neutral-950/80 backdrop-blur-xl border border-white/10 rounded-full shadow-lg hover:bg-neutral-900"
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sliding Menu */}
            <div
                className={cn(
                    "fixed top-0 left-0 h-full w-72 bg-neutral-950/95 backdrop-blur-xl border-r border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold">Menu</h2>
                    <Button
                        onClick={() => setIsOpen(false)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Navigation Items */}
                <TabsList className="flex flex-col w-full h-auto bg-transparent p-4 gap-2">
                    {visibleTabs.map((item) => (
                        <TabsTrigger
                            key={item.value}
                            value={item.value}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "w-full justify-start gap-3 py-3 px-4 text-base font-medium transition-all duration-200 rounded-lg",
                                "data-[state=active]:bg-primary/20 data-[state=active]:text-primary",
                                "hover:bg-white/5 hover:text-foreground"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </>
    );
};
