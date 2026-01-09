'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type BadgeStatus =
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'pending'
    | 'active'
    | 'inactive';

interface StatusBadgeProps {
    status: BadgeStatus;
    label?: string;
    icon?: LucideIcon;
    pulse?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const statusStyles: Record<BadgeStatus, string> = {
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    pending: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    inactive: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
};

const dotStyles: Record<BadgeStatus, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    pending: 'bg-purple-500',
    active: 'bg-emerald-500',
    inactive: 'bg-neutral-400',
};

const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
};

const defaultLabels: Record<BadgeStatus, string> = {
    success: 'Sucesso',
    warning: 'Atenção',
    error: 'Erro',
    info: 'Info',
    pending: 'Pendente',
    active: 'Ativo',
    inactive: 'Inativo',
};

export function StatusBadge({
    status,
    label,
    icon: Icon,
    pulse = false,
    size = 'md'
}: StatusBadgeProps) {
    const displayLabel = label || defaultLabels[status];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border font-medium',
                'transition-all duration-200',
                statusStyles[status],
                sizeStyles[size],
                'whitespace-nowrap'
            )}
        >
            {/* Animated dot */}
            <span className="relative flex h-2 w-2">
                {pulse && (
                    <span
                        className={cn(
                            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                            dotStyles[status]
                        )}
                    />
                )}
                <span
                    className={cn(
                        'relative inline-flex rounded-full h-2 w-2',
                        dotStyles[status]
                    )}
                />
            </span>

            {/* Icon (optional) */}
            {Icon && <Icon className="w-3 h-3" />}

            {/* Label */}
            {displayLabel}
        </span>
    );
}
