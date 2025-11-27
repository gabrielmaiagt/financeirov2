'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SortableCardProps {
    id: string;
    children: React.ReactNode;
    onRemove?: () => void;
    className?: string;
}

export function SortableCard({ id, children, onRemove, className }: SortableCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("relative group", className)}>
            <div
                {...attributes}
                {...listeners}
                className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover:bg-neutral-800 rounded"
            >
                <GripVertical className="w-4 h-4 text-neutral-400" />
            </div>
            {onRemove && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="absolute top-4 right-12 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                >
                    <X className="w-4 h-4 text-neutral-400" />
                </Button>
            )}
            {children}
        </div>
    );
}
