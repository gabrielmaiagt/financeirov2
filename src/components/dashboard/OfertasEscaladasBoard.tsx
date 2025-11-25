'use client';
import { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import OfertaEscaladaForm from './OfertaEscaladaForm';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
import OfertaEscaladaCard, { OfertaEscalada } from './OfertaEscaladaCard';

const OfertasEscaladasBoard = () => {
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const ofertasQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'ofertasEscaladas'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );

  const { data: ofertas, isLoading } = useCollection<OfertaEscalada>(ofertasQuery);

  const handleSaveOferta = (ofertaData: Omit<OfertaEscalada, 'id'>) => {
    if (!firestore) return;
    const ofertasRef = collection(firestore, 'ofertasEscaladas');
    addDocumentNonBlocking(ofertasRef, ofertaData);
    setIsDialogOpen(false);
  };
  
  const handleDeleteOferta = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'ofertasEscaladas', id));
  };
  
  if (isLoading) {
    return <div>Carregando ofertas...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ofertas Escaladas</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Oferta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg p-0 flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Adicionar Nova Oferta Escalada</DialogTitle>
              <DialogDescription>
                Registre uma oferta de alta performance com seus links.
              </DialogDescription>
            </DialogHeader>
            <OfertaEscaladaForm onSave={handleSaveOferta} onClose={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {ofertas && ofertas.length > 0 ? (
            ofertas.map((oferta) => (
                <OfertaEscaladaCard key={oferta.id} oferta={oferta} onDelete={() => setItemToDelete(oferta.id)} />
            ))
        ) : (
            <p className="text-muted-foreground col-span-full">Nenhuma oferta escalada registrada.</p>
        )}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita e excluirá permanentemente esta oferta.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    if (itemToDelete) {
                        handleDeleteOferta(itemToDelete);
                    }
                    setItemToDelete(null);
                }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default OfertasEscaladasBoard;
