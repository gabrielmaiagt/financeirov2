'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, Users, Webhook, Bell, Palette, Activity, Home, Settings, Shield, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
    label: string;
    href?: string;
    icon: LucideIcon;
    value?: string; // For tab-based navigation
    count?: number;
}

interface AdminSidebarProps {
    items?: NavItem[];
    onItemClick?: (value: string) => void;
    activeValue?: string;
    mode?: 'navigation' | 'tabs';
}

const defaultAdminItems: NavItem[] = [
    { label: 'Usuários', value: 'users', icon: Users },
    { label: 'Integrações', value: 'integrations', icon: Webhook },
    { label: 'Notificações', value: 'notifications', icon: Bell },
    { label: 'Widget Mobile', value: 'widget', icon: Smartphone },
    { label: 'Interface', value: 'interface', icon: Palette },
    { label: 'Logs do Sistema', value: 'system', icon: Activity },
];

export function AdminSidebar({
    items = defaultAdminItems,
    onItemClick,
    activeValue,
    mode = 'tabs'
}: AdminSidebarProps) {
    const pathname = usePathname();

    const isActive = (item: NavItem) => {
        if (mode === 'tabs') {
            return activeValue === item.value;
        }
        return pathname === item.href;
    };

    const handleClick = (item: NavItem) => {
        if (mode === 'tabs' && item.value && onItemClick) {
            onItemClick(item.value);
        }
    };

    return (
        <aside className="w-64 shrink-0 space-y-4">
            {/* Header */}
            <div className="px-4 py-6">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                    Admin Panel
                </h2>
                <p className="text-sm text-neutral-500 mt-1">Gerenciamento do sistema</p>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 px-2">
                {/* Home button */}
                {mode === 'navigation' && (
                    <>
                        <Link href="/" className="block">
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start gap-3 transition-all duration-200',
                                    'hover:bg-neutral-800/50 hover:text-white',
                                    'text-neutral-400'
                                )}
                            >
                                <Home className="w-4 h-4" />
                                Dashboard
                            </Button>
                        </Link>
                        <div className="h-px bg-neutral-800 my-2" />
                    </>
                )}

                {/* Dynamic items */}
                {items.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;

                    const content = (
                        <Button
                            variant="ghost"
                            onClick={() => handleClick(item)}
                            className={cn(
                                'w-full justify-start gap-3 transition-all duration-200 relative',
                                'group',
                                active
                                    ? 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'hover:bg-neutral-800/50 hover:text-white text-neutral-400 border border-transparent'
                            )}
                        >
                            {/* Active indicator */}
                            {active && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-500 to-cyan-500 rounded-r" />
                            )}

                            <Icon className={cn(
                                'w-4 h-4 transition-colors',
                                active ? 'text-emerald-400' : 'text-neutral-500 group-hover:text-neutral-300'
                            )} />

                            <span className="flex-1 text-left">{item.label}</span>

                            {item.count !== undefined && (
                                <span className={cn(
                                    'px-2 py-0.5 rounded-full text-xs font-medium',
                                    active
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-neutral-800 text-neutral-400'
                                )}>
                                    {item.count}
                                </span>
                            )}
                        </Button>
                    );

                    if (mode === 'navigation' && item.href) {
                        return (
                            <Link key={item.label} href={item.href} className="block">
                                {content}
                            </Link>
                        );
                    }

                    return <div key={item.label}>{content}</div>;
                })}
            </nav>

            {/* Footer - Quick Actions */}
            <div className="px-4 pt-4 border-t border-neutral-800">
                <Link href="/settings">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                    >
                        <Settings className="w-4 h-4" />
                        Configurações
                    </Button>
                </Link>
                <Link href="/admin/super">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                    >
                        <Shield className="w-4 h-4" />
                        Super Admin
                    </Button>
                </Link>
            </div>
        </aside>
    );
}
