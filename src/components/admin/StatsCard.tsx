'use client';

import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/animated-number';

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    formatter?: (value: number) => string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    className?: string;
}

const variantStyles = {
    default: 'border-neutral-800 hover:border-neutral-700',
    success: 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5',
    warning: 'border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5',
    error: 'border-red-500/20 hover:border-red-500/40 bg-red-500/5',
    info: 'border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5',
};

const iconStyles = {
    default: 'text-neutral-400',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    error: 'text-red-500',
    info: 'text-blue-500',
};

export function StatsCard({
    title,
    value,
    icon: Icon,
    trend,
    formatter,
    variant = 'default',
    className,
}: StatsCardProps) {
    const isNumeric = typeof value === 'number';

    return (
        <Card
            className={cn(
                'relative overflow-hidden transition-all duration-300',
                'bg-neutral-900/50 backdrop-blur-sm',
                variantStyles[variant],
                'hover:shadow-lg hover:shadow-black/20',
                'group',
                className
            )}
        >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                        <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-2">
                            {isNumeric && formatter ? (
                                <AnimatedNumber
                                    value={value}
                                    formatter={formatter}
                                    className="text-3xl font-bold text-white"
                                />
                            ) : (
                                <p className="text-3xl font-bold text-white">
                                    {value}
                                </p>
                            )}
                        </div>
                        {trend && (
                            <div className="flex items-center gap-1 text-sm">
                                <span
                                    className={cn(
                                        'font-semibold',
                                        trend.isPositive ? 'text-emerald-500' : 'text-red-500'
                                    )}
                                >
                                    {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                                </span>
                                <span className="text-neutral-500">vs. anterior</span>
                            </div>
                        )}
                    </div>

                    {/* Icon with gradient background */}
                    <div className={cn(
                        'p-3 rounded-xl transition-colors duration-300',
                        'bg-gradient-to-br from-neutral-800/50 to-neutral-900/50',
                        'group-hover:from-neutral-700/50 group-hover:to-neutral-800/50'
                    )}>
                        <Icon className={cn('w-6 h-6', iconStyles[variant])} />
                    </div>
                </div>
            </CardContent>

            {/* Subtle bottom border glow */}
            <div className={cn(
                'absolute bottom-0 left-0 right-0 h-px',
                'bg-gradient-to-r from-transparent via-white/10 to-transparent',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-300'
            )} />
        </Card>
    );
}
