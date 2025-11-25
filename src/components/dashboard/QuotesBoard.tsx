'use client';
import { useState, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, doc, updateDoc, addDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import QuoteCard, { FraseDoDia } from './QuoteCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QuoteForm from './QuoteForm';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
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

const initialQuotes: Omit<FraseDoDia, 'id'>[] = [
    { text: 'A persistência realiza o impossível.', author: 'Provérbio Chinês' },
    { text: 'O único lugar onde o sucesso vem antes do trabalho é no dicionário.', author: 'Vidal Sassoon' },
    { text: 'Não espere por oportunidades, crie-as.', author: '' },
    { text: 'Sorte é o que acontece quando a preparação encontra a oportunidade.', author: 'Seneca' },
    { text: 'O maior risco é não correr risco nenhum.', author: 'Mark Zuckerberg' },
    { text: 'Se você quer algo novo, precisa parar de fazer algo velho.', author: 'Peter Drucker' },
    { text: 'Feito é melhor que perfeito.', author: 'Sheryl Sandberg' },
    { text: 'A disciplina é a ponte entre metas e realizações.', author: 'Jim Rohn' },
    { text: 'Comece onde você está. Use o que você tem. Faça o que você pode.', author: 'Arthur Ashe' },
    { text: 'A falha é apenas a oportunidade de começar de novo, desta vez de forma mais inteligente.', author: 'Henry Ford' }
];

const QuotesBoard = () => {
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<FraseDoDia | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);


  const quotesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'frases')) : null),
    [firestore]
  );
  const { data: quotes, isLoading } = useCollection<FraseDoDia>(quotesQuery);
  
   useEffect(() => {
    if (firestore && !isLoading && quotes?.length === 0) {
      const frasesRef = collection(firestore, 'frases');
      initialQuotes.forEach(quote => {
        addDocumentNonBlocking(frasesRef, quote);
      });
    }
  }, [firestore, isLoading, quotes]);

  const handleEdit = (quote: FraseDoDia) => {
    setEditingQuote(quote);
    setIsDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingQuote(null);
    }
    setIsDialogOpen(open);
  }
  
  const handleOpenNew = () => {
    setEditingQuote(null);
    setIsDialogOpen(true);
  }

  const handleSaveQuote = (quoteData: Omit<FraseDoDia, 'id'>) => {
    if (!firestore) return;
    
    if (editingQuote) {
      const quoteRef = doc(firestore, 'frases', editingQuote.id);
      updateDoc(quoteRef, quoteData);
    } else {
       const frasesRef = collection(firestore, 'frases');
       addDocumentNonBlocking(frasesRef, quoteData);
    }
    
    setIsDialogOpen(false);
    setEditingQuote(null);
  };

  const handleDeleteQuote = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'frases', id));
  };


  if (isLoading) {
    return <div>Carregando frases...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Frases do Dia</h2>
         <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <Button onClick={handleOpenNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Frase
          </Button>
          <DialogContent className="sm:max-w-lg p-0 flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{editingQuote ? 'Editar Frase' : 'Adicionar Nova Frase'}</DialogTitle>
              <DialogDescription>
                {editingQuote ? 'Ajuste os detalhes da frase.' : 'Adicione uma nova frase para inspirar a equipe.'}
              </DialogDescription>
            </DialogHeader>
            <QuoteForm 
              onSave={handleSaveQuote} 
              onClose={() => handleDialogChange(false)}
              existingQuote={editingQuote} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {quotes && quotes.map((quote) => (
          <QuoteCard 
            key={quote.id} 
            quote={quote}
            onEdit={() => handleEdit(quote)}
            onDelete={() => setItemToDelete(quote.id)}
          />
        ))}
      </div>
      
       <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita e excluirá permanentemente esta frase.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    if (itemToDelete) {
                        handleDeleteQuote(itemToDelete);
                    }
                    setItemToDelete(null);
                }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default QuotesBoard;
