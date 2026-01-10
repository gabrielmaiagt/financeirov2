import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableWrapperProps {
    children: ReactNode;
    className?: string;
}

/**
 * Wrapper component that adds horizontal scroll to tables on mobile devices
 * Usage: Wrap your <Table> component with this
 */
export function ResponsiveTableWrapper({ children, className }: ResponsiveTableWrapperProps) {
    return (
        <div className={cn(
            "relative w-full overflow-x-auto",
            "scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900",
            "-mx-4 px-4 md:mx-0 md:px-0", // Full width on mobile
            className
        )}>
            <div className="min-w-[640px]"> {/* Minimum width to prevent content squishing */}
                {children}
            </div>
        </div>
    );
}
