'use client';
import { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import LoginForm from './LoginForm';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import LoginCard, { Login } from './LoginCard';
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

const LoginsBoard = () => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLogin, setEditingLogin] = useState<Login | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const loginsQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'logins'), orderBy('title')) : null),
    [firestore, orgId]
  );

  const { data: logins, isLoading } = useCollection<Login>(loginsQuery);

  const handleSaveLogin = (loginData: Omit<Login, 'id'>) => {
    if (!firestore) return;

    if (editingLogin) {
      const loginRef = doc(firestore, 'organizations', orgId, 'logins', editingLogin.id);
      updateDoc(loginRef, loginData);
    } else {
      const loginsRef = collection(firestore, 'organizations', orgId, 'logins');
      addDocumentNonBlocking(loginsRef, loginData);
    }

    setIsDialogOpen(false);
    setEditingLogin(null);
  };

  const handleDeleteLogin = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'organizations', orgId, 'logins', id));
  };

  const handleEdit = (login: Login) => {
    setEditingLogin(login);
    setIsDialogOpen(true);
  };

  const handleOpenNew = () => {
    setEditingLogin(null);
    setIsDialogOpen(true);
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingLogin(null);
    }
    setIsDialogOpen(open);
  }

  if (isLoading) {
    return <div>Carregando logins...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cofre de Logins</h2>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Login
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingLogin ? 'Editar Login' : 'Adicionar Novo Login'}</DialogTitle>
              <DialogDescription>
                Salve as credenciais de um serviço para acesso rápido.
              </DialogDescription>
            </DialogHeader>
            <LoginForm
              onSave={handleSaveLogin}
              onClose={() => handleDialogChange(false)}
              existingLogin={editingLogin}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {logins && logins.length > 0 ? (
          logins.map((login) => (
            <LoginCard
              key={login.id}
              login={login}
              onEdit={() => handleEdit(login)}
              onDelete={() => setItemToDelete(login.id)}
            />
          ))
        ) : (
          <p className="text-muted-foreground col-span-full">Nenhum login salvo ainda. Que tal adicionar o primeiro?</p>
        )}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita e excluirá permanentemente este login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (itemToDelete) {
                handleDeleteLogin(itemToDelete);
              }
              setItemToDelete(null);
            }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LoginsBoard;
