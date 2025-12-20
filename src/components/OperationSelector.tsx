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

export function OperationSelector() {
    const { selectedOperationId, setSelectedOperationId, operations, isLoading } = useOperation();

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
        );
    }

    if (operations.length === 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Building2 className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-200">No operations found</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedOperationId || undefined} onValueChange={setSelectedOperationId}>
                <SelectTrigger className="w-[260px] h-10 bg-neutral-900/50 border-neutral-800">
                    <SelectValue placeholder="Selecione a operação" />
                </SelectTrigger>
                <SelectContent>
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
