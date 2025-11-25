'use client';
import { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ExternalLink, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import CreativeForm from './CreativeForm';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '../ui/input';

export interface ValidatedCreative {
  id: string;
  name: string;
  sales: number;
}

export interface LevaCriativos {
  id: string;
  dataLeva: Timestamp;
  driveLink: string;
  criativosValidados?: ValidatedCreative[];
  faturamento?: number;
  roi?: number;
  lucro?: number;
  cpa?: number;
}

const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatNumber = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return value.toLocaleString('pt-BR');
}

const LinkPreview = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
  
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
            <Button variant="link" asChild className="p-0 h-auto text-sm text-blue-400">
                <a href={href} target="_blank" rel="noopener noreferrer">
                    {children} <ExternalLink className="w-3 h-3 ml-1" />
                </a>
            </Button>
        </PopoverTrigger>
        {isOpen && (
            <PopoverContent className="w-[80vw] h-[80vh] max-w-[1200px] p-0" side="bottom" align="start">
                <iframe src={href} className="w-full h-full rounded-md" title="Link Preview" />
            </PopoverContent>
        )}
      </Popover>
    );
};

const AddValidatedCreativeForm = ({ onAdd }: { onAdd: (name: string, sales: number) => void }) => {
    const [name, setName] = useState('');
    const [sales, setSales] = useState<number | ''>('');
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (name && sales !== '') {
        onAdd(name, Number(sales));
        setName('');
        setSales('');
      }
    };
  
    return (
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-2 border-t border-neutral-800">
        <div className="flex-1">
          <Label htmlFor="creative-name" className="text-xs text-muted-foreground">Nome</Label>
          <Input 
            id="creative-name"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Ex: esc 6" 
            className="h-8"
          />
        </div>
        <div className="w-24">
          <Label htmlFor="creative-sales" className="text-xs text-muted-foreground">Vendas</Label>
          <Input 
            id="creative-sales"
            type="number" 
            value={sales} 
            onChange={(e) => setSales(e.target.value === '' ? '' : Number(e.target.value))} 
            placeholder="Ex: 8" 
            className="h-8"
          />
        </div>
        <Button type="submit" size="icon" className="h-8 w-8">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    );
  };

const CreativesBoard = () => {
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const criativosQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'criativos'), orderBy('dataLeva', 'desc')) : null),
    [firestore]
  );

  const { data: levas, isLoading } = useCollection<LevaCriativos>(criativosQuery);

  const handleSaveLeva = (levaData: Omit<LevaCriativos, 'id' | 'dataLeva'> & { dataLeva: Date }) => {
    if (!firestore) return;
    const criativosRef = collection(firestore, 'criativos');
    addDocumentNonBlocking(criativosRef, { ...levaData, dataLeva: Timestamp.fromDate(levaData.dataLeva), criativosValidados: [] });
    setIsDialogOpen(false);
  };
  
  const handleDeleteLeva = async (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'criativos', id);
    await deleteDoc(docRef);
  };
  
  const handleAddValidatedCreative = async (levaId: string, name: string, sales: number) => {
    if (!firestore) return;
    const levaRef = doc(firestore, 'criativos', levaId);
    const newCreative = { id: `${Date.now()}-${name}`, name, sales };
    await updateDoc(levaRef, {
      criativosValidados: arrayUnion(newCreative)
    });
  };

  const handleRemoveValidatedCreative = async (levaId: string, creativeToRemove: ValidatedCreative) => {
    if (!firestore) return;
    const levaRef = doc(firestore, 'criativos', levaId);
    await updateDoc(levaRef, {
        criativosValidados: arrayRemove(creativeToRemove)
    });
  };

  if (isLoading) {
    return <div>Carregando levas de criativos...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Leads de Criativos</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Leva
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg p-0 flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Adicionar Nova Leva de Criativos</DialogTitle>
              <DialogDescription>
                Insira o link do Drive e a data da nova leva de anúncios.
              </DialogDescription>
            </DialogHeader>
            <CreativeForm onSave={handleSaveLeva} onClose={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {levas && levas.length > 0 ? (
            levas.map((leva) => (
                <Card key={leva.id} className="border-neutral-800 bg-transparent h-full flex flex-col">
                    <CardHeader className="flex-row justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">
                                Leva de {format(leva.dataLeva.toDate(), 'dd/MM/yyyy', { locale: ptBR })}
                            </CardTitle>
                             <LinkPreview href={leva.driveLink}>
                                Acessar Drive
                             </LinkPreview>
                        </div>
                         <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(leva.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            {leva.faturamento !== undefined && <div><Label className="text-muted-foreground">Faturamento</Label><p className="font-semibold">{formatCurrency(leva.faturamento)}</p></div>}
                            {leva.roi !== undefined && <div><Label className="text-muted-foreground">ROI</Label><p className="font-semibold">{formatNumber(leva.roi)}</p></div>}
                            {leva.lucro !== undefined && <div><Label className="text-muted-foreground">Lucro</Label><p className="font-semibold">{formatCurrency(leva.lucro)}</p></div>}
                            {leva.cpa !== undefined && <div><Label className="text-muted-foreground">CPA</Label><p className="font-semibold">{formatCurrency(leva.cpa)}</p></div>}
                        </div>

                        <Label className="text-sm text-muted-foreground">Criativos Validados</Label>
                        <div className="bg-neutral-900/50 rounded-md flex-grow">
                            {Array.isArray(leva.criativosValidados) && leva.criativosValidados.length > 0 ? (
                                <ul className="p-3 space-y-2">
                                    {leva.criativosValidados.map((criativo) => (
                                        <li key={criativo.id} className="flex justify-between items-center text-sm bg-neutral-800/50 p-2 rounded">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{criativo.name}</span>
                                                <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{criativo.sales} {criativo.sales === 1 ? 'venda' : 'vendas'}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive" onClick={() => handleRemoveValidatedCreative(leva.id, criativo)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-xs text-muted-foreground p-4">Nenhum criativo validado adicionado.</p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className='p-0'>
                        <AddValidatedCreativeForm onAdd={(name, sales) => handleAddValidatedCreative(leva.id, name, sales)} />
                    </CardFooter>
                </Card>
            ))
        ) : (
            <p className="text-muted-foreground col-span-full">Nenhuma leva de criativos encontrada.</p>
        )}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita e excluirá permanentemente esta leva de criativos.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    if (itemToDelete) {
                        handleDeleteLeva(itemToDelete);
                    }
                    setItemToDelete(null);
                }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default CreativesBoard;
