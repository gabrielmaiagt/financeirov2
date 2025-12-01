"use client";

import * as React from "react";
import { Palette, LayoutDashboard, Monitor, Moon, Sun, Grid, Sidebar as SidebarIcon, AlignJustify } from "lucide-react";
import { useUI } from "@/components/ThemeProvider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const ThemeSwitcher = () => {
    const { settings, setSettings } = useUI();

    return (
        <div className="flex items-center gap-4 bg-secondary/50 p-2 rounded-lg border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <Select
                    value={settings.theme}
                    onValueChange={(val: any) => setSettings({ ...settings, theme: val })}
                >
                    <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50 border-border/50 focus:ring-1 focus:ring-primary/50">
                        <SelectValue placeholder="Tema" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-neutral-900 border border-neutral-700"></div>
                                <span>Padrão</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="cartoon">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff6f61]"></div>
                                <span>Cartoon</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="retro">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff7f50]"></div>
                                <span>Retro</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="neon">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff00ff]"></div>
                                <span>Neon</span>
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="w-px h-4 bg-border/50"></div>

            <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                <Select
                    value={settings.layout}
                    onValueChange={(val: any) => setSettings({ ...settings, layout: val })}
                >
                    <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50 border-border/50 focus:ring-1 focus:ring-primary/50">
                        <SelectValue placeholder="Layout" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="tabs">
                            <div className="flex items-center gap-2">
                                <Grid className="w-3 h-3" />
                                <span>Abas</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="sidebar">
                            <div className="flex items-center gap-2">
                                <SidebarIcon className="w-3 h-3" />
                                <span>Lateral</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="topbar">
                            <div className="flex items-center gap-2">
                                <AlignJustify className="w-3 h-3" />
                                <span>Superior</span>
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};
