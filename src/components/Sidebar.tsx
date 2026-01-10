"use client";
import { useState } from 'react';
import { useUI } from "@/components/ThemeProvider";
import { useTabSettings } from "@/hooks/use-tab-settings";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Wallet,
    ShoppingCart,
    Building2,
    Trophy,
    Calendar,
    Users,
    Settings,
    ChevronDown,
    LogOut,
    Palette
} from 'lucide-react';
import GoalWidget from './dashboard/GoalWidget';
import Link from 'next/link';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

// Navigation items organized by sections
const GENERAL_ITEMS = [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { value: 'financeiro', label: 'Financeiro', icon: Wallet },
    { value: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { value: 'operacoes', label: 'Operações', icon: Building2 },
    { value: 'metas', label: 'Metas', icon: Trophy },
    { value: 'calendario', label: 'Calendário', icon: Calendar },
    { value: 'socios', label: 'Sócios', icon: Users },
];

const ADMIN_ITEMS = [
    { value: 'admin', label: 'Configurações', icon: Settings },
    { value: 'admin/temas', label: 'Temas', icon: Palette },
];

export const Sidebar = () => {
    const { settings } = useUI();
    const { visibleTabs } = useTabSettings();
    const { logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [adminOpen, setAdminOpen] = useState(false);

    if (settings.layout !== "sidebar") return null;

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const handleNavigation = (value: string) => {
        setActiveTab(value);
        // Navigation is handled by Tabs context in parent
    };

    return (
        <div className="hidden md:flex flex-col w-64 shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-r border-white/5">
            <div className="flex flex-col h-full bg-neutral-950/60 backdrop-blur-sm">

                {/* Header - Brand */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-xl">
                            <Wallet className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-foreground">Painel</h2>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Financeiro</span>
                        </div>
                    </div>
                </div>

                {/* Content - Navigation */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">

                    {/* Geral Section */}
                    <div className="space-y-1">
                        <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground px-3 mb-2">
                            Geral
                        </h3>
                        <div className="space-y-0.5">
                            {GENERAL_ITEMS.filter(item =>
                                visibleTabs.some(visible => visible.value === item.value)
                            ).map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.value;

                                return (
                                    <button
                                        key={item.value}
                                        onClick={() => handleNavigation(item.value)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                            "hover:bg-white/5 hover:text-foreground",
                                            isActive
                                                ? "bg-primary/10 text-primary border-l-2 border-primary"
                                                : "text-muted-foreground border-l-2 border-transparent"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "w-4 h-4 shrink-0 transition-colors",
                                            isActive && "text-primary"
                                        )} />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Admin Section - Collapsible */}
                    <Collapsible open={adminOpen} onOpenChange={setAdminOpen} className="space-y-1">
                        <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground px-3 mb-2">
                            Configurações
                        </h3>
                        <CollapsibleTrigger asChild>
                            <button className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5 hover:text-foreground text-muted-foreground">
                                <div className="flex items-center gap-3">
                                    <Settings className="w-4 h-4" />
                                    <span>Admin</span>
                                </div>
                                <ChevronDown className={cn(
                                    "w-4 h-4 transition-transform",
                                    adminOpen && "rotate-180"
                                )} />
                            </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-0.5 pl-4">
                            {ADMIN_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.value;

                                return (
                                    <Link
                                        key={item.value}
                                        href={`/${item.value}`}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                            "hover:bg-white/5 hover:text-foreground",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </CollapsibleContent>
                    </Collapsible>
                </div>

                {/* Footer - Goal Widget & Logout */}
                <div className="p-4 border-t border-white/5 space-y-3">
                    {/* Compact Goal Widget */}
                    <div className="px-2">
                        <GoalWidget variant="default" />
                    </div>

                    {/* Logout Button */}
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sair</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
