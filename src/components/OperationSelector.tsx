'use client';
// Force rebuild

import { useOperation } from '@/contexts/OperationContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Building2, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';

import { cn } from '@/lib/utils';

export function OperationSelector({ className }: { className?: string }) {
    const { selectedOperationId, setSelectedOperationId, operations, isLoading } = useOperation();

    if (isLoading) {
        return (
            <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900/50", className)}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground hidden sm:inline">Loading...</span>
            </div>
        );
    }

    if (operations.length === 0) {
        return (
            <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20", className)}>
                <Building2 className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-200 hidden sm:inline">No operations</span>
            </div>
        );
    }

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
            <Select value={selectedOperationId || 'all'} onValueChange={(value) => setSelectedOperationId(value === 'all' ? null : value)}>
                <SelectTrigger className="w-[130px] sm:w-[180px] md:w-[260px] h-10 bg-neutral-900/50 border-neutral-800 text-xs sm:text-sm">
                    <SelectValue placeholder="Operação" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                    <SelectItem value="all">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Todas as Operações</span>
                        </div>
                    </SelectItem>
                    {operations.map((operation) => (
                        <SelectItem key={operation.id} value={operation.id}>
                            <div className="flex items-center gap-2">
                                <span>{operation.name}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                    {operation.category}
                                </Badge>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
