'use client';

import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface AdminHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: Breadcrumb[];
    action?: React.ReactNode;
    className?: string;
}

export function AdminHeader({
    title,
    description,
    breadcrumbs,
    action,
    className,
}: AdminHeaderProps) {
    return (
        <div className={cn('space-y-4 pb-6 border-b border-neutral-800', className)}>
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-2 text-sm">
                    {breadcrumbs.map((crumb, index) => {
                        const isLast = index === breadcrumbs.length - 1;

                        return (
                            <div key={index} className="flex items-center gap-2">
                                {crumb.href && !isLast ? (
                                    <Link
                                        href={crumb.href}
                                        className="text-neutral-400 hover:text-white transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className={cn(
                                        isLast ? 'text-white font-medium' : 'text-neutral-400'
                                    )}>
                                        {crumb.label}
                                    </span>
                                )}

                                {!isLast && (
                                    <ChevronRight className="w-4 h-4 text-neutral-600" />
                                )}
                            </div>
                        );
                    })}
                </nav>
            )}

            {/* Title and Actions */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-neutral-400">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-neutral-400 text-sm max-w-2xl">
                            {description}
                        </p>
                    )}
                </div>

                {action && (
                    <div className="shrink-0">
                        {action}
                    </div>
                )}
            </div>
        </div>
    );
}
