'use client';
import { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import InsightForm from './InsightForm';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import InsightCard, { Insight } from './InsightCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const InsightsBoard = () => {
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const insightsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'insights'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );

  const { data: insights, isLoading } = useCollection<Insight>(insightsQuery);

  const handleSaveInsight = (insightData: Omit<Insight, 'id'>) => {
    if (!firestore) return;

    if (editingInsight) {
      // Update existing insight
      const insightRef = doc(firestore, 'insights', editingInsight.id);
      const dataToUpdate = { ...insightData, updatedAt: Timestamp.now() };
      updateDoc(insightRef, dataToUpdate);
    } else {
      // Add new insight
      const insightsRef = collection(firestore, 'insights');
      addDocumentNonBlocking(insightsRef, insightData);
    }

    setIsDialogOpen(false);
    setEditingInsight(null);
  };
  
  const handleDeleteInsight = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'insights', id));
  };
  
  const handleEdit = (insight: Insight) => {
    setEditingInsight(insight);
    setIsDialogOpen(true);
  };

  const handleOpenNew = () => {
    setEditingInsight(null);
    setIsDialogOpen(true);
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingInsight(null);
    }
    setIsDialogOpen(open);
  }

  if (isLoading) {
    return <div>Carregando insights...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Quadro de Insights</h2>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Insight
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg p-0 flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{editingInsight ? 'Editar Insight' : 'Adicionar Novo Insight'}</DialogTitle>
              <DialogDescription>
                Capture uma ideia, um aprendizado ou anexe uma imagem.
              </DialogDescription>
            </DialogHeader>
            <InsightForm 
              onSave={handleSaveInsight} 
              onClose={() => handleDialogChange(false)}
              existingInsight={editingInsight} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {insights && insights.length > 0 ? (
            insights.map((insight) => (
                <InsightCard 
                  key={insight.id} 
                  insight={insight} 
                  onEdit={() => handleEdit(insight)}
                  onDelete={() => setItemToDelete(insight.id)} 
                />
            ))
        ) : (
            <p className="text-muted-foreground col-span-full">Nenhum insight encontrado. Que tal adicionar um?</p>
        )}
      </div>

       <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita e excluirá permanentemente este insight.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    if (itemToDelete) {
                        handleDeleteInsight(itemToDelete);
                    }
                    setItemToDelete(null);
                }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default InsightsBoard;
