'use client';
import { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import NoteForm from './NoteForm';
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
import NoteCard, { Anotacao } from './NoteCard';

const NotesBoard = () => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Anotacao | null>(null);

  const notesQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'anotacoes'), orderBy('createdAt', 'desc')) : null),
    [firestore, orgId]
  );

  const { data: notes, isLoading } = useCollection<Anotacao>(notesQuery);

  const handleSaveNote = (noteData: Omit<Anotacao, 'id'>) => {
    if (!firestore) return;
    if (editingNote) {
      const noteRef = doc(firestore, 'organizations', orgId, 'anotacoes', editingNote.id);
      updateDoc(noteRef, noteData);
    } else {
      const notesRef = collection(firestore, 'organizations', orgId, 'anotacoes');
      addDocumentNonBlocking(notesRef, noteData);
    }
    handleDialogChange(false);
  };

  const handleDeleteNote = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'organizations', orgId, 'anotacoes', id));
  };

  const handleEdit = (note: Anotacao) => {
    setEditingNote(note);
    setIsDialogOpen(true);
  };

  const handleOpenNew = () => {
    setEditingNote(null);
    setIsDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingNote(null);
    }
    setIsDialogOpen(open);
  };

  if (isLoading) {
    return <div>Carregando anotações...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Anotações Gerais</h2>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Anotação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg p-0 flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{editingNote ? 'Editar Anotação' : 'Adicionar Nova Anotação'}</DialogTitle>
              <DialogDescription>
                {editingNote ? 'Ajuste os detalhes da sua anotação.' : 'Use este espaço para notas rápidas, ideias ou lembretes.'}
              </DialogDescription>
            </DialogHeader>
            <NoteForm
              onSave={handleSaveNote}
              onClose={() => handleDialogChange(false)}
              existingNote={editingNote}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {notes && notes.length > 0 ? (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => handleEdit(note)}
              onDelete={() => setItemToDelete(note.id)}
            />
          ))
        ) : (
          <p className="text-muted-foreground col-span-full">Nenhuma anotação encontrada.</p>
        )}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita e excluirá permanentemente esta anotação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (itemToDelete) {
                handleDeleteNote(itemToDelete);
              }
              setItemToDelete(null);
            }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotesBoard;
