'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOperation } from '@/contexts/OperationContext';
import { Operation, OperationCategory, AdCostMode } from '@/types/organization';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrgOperationForm } from './OrgOperationForm';
import { ClientOnly } from '../ClientOnly';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useOrgDoc } from '@/hooks/useFirestoreOrg';

const categoryColors: Record<OperationCategory, string> = {
    infoproduct: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    saas: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    local_business: 'bg-green-500/20 text-green-400 border-green-500/30',
    course: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    extra_income: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const adCostModeLabels: Record<AdCostMode, string> = {
    reimburse_payer: 'Reembolsar Pagador',
    split_among_partners: 'Dividir Entre Sócios',
    solo: 'Operação Solo',
};

export default function OperationsBoard() {
    const firestore = useFirestore();
    const { operations, isLoading } = useOperation();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const handleOpenNew = () => {
        setEditingOperation(null);
        setIsFormOpen(true);
    };

    const handleEdit = (operation: Operation) => {
        setEditingOperation(operation);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        if (!firestore) return;
        const docRef = useOrgDoc('operations', id);
        if (docRef) {
            deleteDocumentNonBlocking(docRef);
        }
        setItemToDelete(null);
    };

    const handleDialogChange = (open: boolean) => {
        if (!open) {
            setEditingOperation(null);
        }
        setIsFormOpen(open);
    };

    if (isLoading) {
        return <div>Carregando operações...</div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Operações</h2>
                    <p className="text-sm text-muted-foreground">
                        Gerencie suas operações, sócios e regras de divisão de lucro
                    </p>
                </div>
                <Button onClick={handleOpenNew}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Nova Operação
                </Button>
            </div>

            {operations.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhuma operação encontrada</h3>
                        <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                            Crie sua primeira operação para começar a gerenciar sócios e divisão de lucros
                        </p>
                        <Button onClick={handleOpenNew}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Criar Primeira Operação
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {operations.map((operation) => (
                        <Card key={operation.id} className="hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{operation.name}</CardTitle>
                                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                            <Badge variant="outline" className={categoryColors[operation.category]}>
                                                {operation.category}
                                            </Badge>
                                            {!operation.active && (
                                                <Badge variant="outline" className="bg-red-500/20 text-red-400">
                                                    Inativa
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleEdit(operation)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => setItemToDelete(operation.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-sm font-medium mb-2">Sócios:</p>
                                    <div className="space-y-1">
                                        {operation.partners.map((partner, index) => (
                                            <div key={index} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{partner.name}</span>
                                                <span className="font-mono">{partner.percentage}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-neutral-800">
                                    <p className="text-xs text-muted-foreground mb-1">Custo de Anúncios:</p>
                                    <p className="text-sm">{adCostModeLabels[operation.adCostMode]}</p>
                                    {operation.adPayer && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Pagador: {operation.adPayer}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isFormOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="sm:max-w-2xl p-6">
                    <DialogHeader>
                        <DialogTitle>{editingOperation ? 'Editar Operação' : 'Nova Operação'}</DialogTitle>
                        <DialogDescription>
                            Configure os detalhes da operação, sócios e regras de divisão
                        </DialogDescription>
                    </DialogHeader>
                    <OrgOperationForm
                        operation={editingOperation}
                        onClose={() => handleDialogChange(false)}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Essa ação não pode ser desfeita e excluirá permanentemente esta operação.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (itemToDelete) {
                                    handleDelete(itemToDelete);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
