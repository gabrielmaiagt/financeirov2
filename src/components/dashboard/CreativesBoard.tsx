'use client';
import { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ExternalLink, Send, MoreHorizontal, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import CreativeForm from './CreativeForm';
import BancoCreativoForm from './BancoCreativoForm';
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
import { Textarea } from '../ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ValidatedCreative {
  id: string;
  name: string;
  sales: number;
  copy?: string;
  faturamento?: number;
  roi?: number;
  lucro?: number;
  cpa?: number;
}

export interface LevaCriativos {
  id: string;
  dataLeva: Timestamp;
  driveLink: string;
  criativosValidados?: ValidatedCreative[];
  faturamento?: number; // Mantido para retrocompatibilidade ou métricas gerais
  roi?: number;
  lucro?: number;
  cpa?: number;
}

export interface BancoCreativo {
  id: string;
  nome: string;
  copy?: string;
  videosLinks?: string;
  notas?: string;
  status: 'rascunho' | 'pronto-para-editar' | 'em-edicao' | 'testando';
  dataCriacao: Timestamp;
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

const AddValidatedCreativeForm = ({ onAdd }: { onAdd: (creative: Omit<ValidatedCreative, 'id'>) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [sales, setSales] = useState<number | ''>('');
  const [copy, setCopy] = useState('');
  const [faturamento, setFaturamento] = useState<number | ''>('');
  const [roi, setRoi] = useState<number | ''>('');
  const [lucro, setLucro] = useState<number | ''>('');
  const [cpa, setCpa] = useState<number | ''>('');

  const handleSubmit = () => {
    if (name && sales !== '') {
      onAdd({
        name,
        sales: Number(sales),
        copy: copy.trim() !== '' ? copy : undefined,
        faturamento: faturamento !== '' ? Number(faturamento) : undefined,
        roi: roi !== '' ? Number(roi) : undefined,
        lucro: lucro !== '' ? Number(lucro) : undefined,
        cpa: cpa !== '' ? Number(cpa) : undefined,
      });
      setName('');
      setSales('');
      setCopy('');
      setFaturamento('');
      setRoi('');
      setLucro('');
      setCpa('');
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed border-neutral-700 hover:border-neutral-500 hover:bg-neutral-900/50">
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Criativo Validado
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Criativo Validado</DialogTitle>
          <DialogDescription>Insira os dados de performance do criativo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="Ex: Criativo 01" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sales" className="text-right">Vendas</Label>
            <Input id="sales" type="number" value={sales} onChange={(e) => setSales(e.target.value === '' ? '' : Number(e.target.value))} className="col-span-3" placeholder="Ex: 15" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="copy" className="text-right pt-2">Copy</Label>
            <Textarea id="copy" value={copy} onChange={(e) => setCopy(e.target.value)} className="col-span-3" placeholder="Cole aqui o texto do criativo (opcional)" rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="faturamento" className="mb-2 block">Faturamento (R$)</Label>
              <Input id="faturamento" type="number" value={faturamento} onChange={(e) => setFaturamento(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Opcional" />
            </div>
            <div>
              <Label htmlFor="roi" className="mb-2 block">ROI</Label>
              <Input id="roi" type="number" value={roi} onChange={(e) => setRoi(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Opcional" />
            </div>
            <div>
              <Label htmlFor="lucro" className="mb-2 block">Lucro (R$)</Label>
              <Input id="lucro" type="number" value={lucro} onChange={(e) => setLucro(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Opcional" />
            </div>
            <div>
              <Label htmlFor="cpa" className="mb-2 block">CPA (R$)</Label>
              <Input id="cpa" type="number" value={cpa} onChange={(e) => setCpa(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Opcional" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!name || sales === ''}>Salvar Criativo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CreativesBoard = () => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBancoDialogOpen, setIsBancoDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [bancoItemToDelete, setBancoItemToDelete] = useState<string | null>(null);

  const criativosQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'criativos'), orderBy('dataLeva', 'desc')) : null),
    [firestore, orgId]
  );

  const bancoQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'banco_criativos'), orderBy('dataCriacao', 'desc')) : null),
    [firestore, orgId]
  );

  const { data: levas, isLoading } = useCollection<LevaCriativos>(criativosQuery);
  const { data: bancoCreativos, isLoading: isBancoLoading } = useCollection<BancoCreativo>(bancoQuery);

  const handleSaveLeva = (levaData: Omit<LevaCriativos, 'id' | 'dataLeva'> & { dataLeva: Date }) => {
    if (!firestore) return;
    const criativosRef = collection(firestore, 'organizations', orgId, 'criativos');
    addDocumentNonBlocking(criativosRef, { ...levaData, dataLeva: Timestamp.fromDate(levaData.dataLeva), criativosValidados: [] });
    setIsDialogOpen(false);
  };

  const handleDeleteLeva = async (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'organizations', orgId, 'criativos', id);
    await deleteDoc(docRef);
  };

  const handleAddValidatedCreative = async (levaId: string, creativeData: Omit<ValidatedCreative, 'id'>) => {
    if (!firestore) return;
    try {
      console.log('Adicionando criativo validado:', { levaId, creativeData });
      const levaRef = doc(firestore, 'organizations', orgId, 'criativos', levaId);

      // Remove undefined values - Firestore doesn't accept them
      const cleanedData = Object.fromEntries(
        Object.entries(creativeData).filter(([_, value]) => value !== undefined)
      );

      const newCreative = {
        id: `${Date.now()}-${creativeData.name}`,
        ...cleanedData
      };

      await updateDoc(levaRef, {
        criativosValidados: arrayUnion(newCreative)
      });
      console.log('Criativo validado adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar criativo validado:', error);
      alert('Erro ao adicionar criativo: ' + (error as Error).message);
    }
  };

  const handleRemoveValidatedCreative = async (levaId: string, creativeToRemove: ValidatedCreative) => {
    if (!firestore || !orgId) return;
    const levaRef = doc(firestore, 'organizations', orgId, 'criativos', levaId);
    await updateDoc(levaRef, {
      criativosValidados: arrayRemove(creativeToRemove)
    });
  };

  const handleSaveBancoCreativo = async (data: Omit<BancoCreativo, 'id' | 'dataCriacao'>) => {
    if (!firestore) return;
    try {
      console.log('Salvando criativo no banco:', data);

      // Remove undefined values - Firestore doesn't accept them
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );

      const bancoRef = collection(firestore, 'organizations', orgId, 'banco_criativos');
      const docRef = await addDoc(bancoRef, {
        ...cleanedData,
        dataCriacao: Timestamp.now(),
      });
      console.log('Criativo salvo com sucesso! ID:', docRef.id);
      setIsBancoDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar criativo no banco:', error);
      alert('Erro ao salvar criativo: ' + (error as Error).message);
    }
  };

  const handleDeleteBancoCreativo = async (id: string) => {
    if (!firestore || !orgId) return;
    const docRef = doc(firestore, 'organizations', orgId, 'banco_criativos', id);
    await deleteDoc(docRef);
  };

  const handleUpdateBancoStatus = async (id: string, newStatus: BancoCreativo['status']) => {
    if (!firestore || !orgId) return;
    const docRef = doc(firestore, 'organizations', orgId, 'banco_criativos', id);
    await updateDoc(docRef, { status: newStatus });
  };

  if (isLoading) {
    return <div>Carregando levas de criativos...</div>;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Banco de Criativos */}
        <Card className="border-neutral-800 bg-neutral-950/50">
          <CardHeader className="flex-row justify-between items-center">
            <div>
              <CardTitle>Banco de Criativos</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Ideias e rascunhos de criativos para editar/testar</p>
            </div>
            <Dialog open={isBancoDialogOpen} onOpenChange={setIsBancoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Novo Criativo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Adicionar Criativo ao Banco</DialogTitle>
                  <DialogDescription>Salve ideias, copies e links para editar posteriormente.</DialogDescription>
                </DialogHeader>
                <BancoCreativoForm onSave={handleSaveBancoCreativo} onClose={() => setIsBancoDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isBancoLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : bancoCreativos && bancoCreativos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bancoCreativos.map((criativo) => (
                  <Card key={criativo.id} className="border-neutral-700 bg-neutral-900/30">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{criativo.nome}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setBancoItemToDelete(criativo.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <select
                        value={criativo.status}
                        onChange={(e) => handleUpdateBancoStatus(criativo.id, e.target.value as BancoCreativo['status'])}
                        className="text-xs bg-neutral-800 border-neutral-700 rounded px-2 py-1 mt-2"
                      >
                        <option value="rascunho">📝 Rascunho</option>
                        <option value="pronto-para-editar">✅ Pronto para Editar</option>
                        <option value="em-edicao">✂️ Em Edição</option>
                        <option value="testando">🧪 Testando</option>
                      </select>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      {criativo.copy && (
                        <div>
                          <Label className="text-muted-foreground">Copy:</Label>
                          <p className="text-foreground whitespace-pre-wrap line-clamp-3 italic">{criativo.copy}</p>
                        </div>
                      )}
                      {criativo.videosLinks && (
                        <div>
                          <Label className="text-muted-foreground">Vídeos/Links:</Label>
                          <p className="text-blue-400 truncate">{criativo.videosLinks}</p>
                        </div>
                      )}
                      {criativo.notas && (
                        <div>
                          <Label className="text-muted-foreground">Notas:</Label>
                          <p className="text-foreground line-clamp-2">{criativo.notas}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground pt-2 border-t border-neutral-700/50">
                        {format(criativo.dataCriacao.toDate(), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum criativo no banco ainda.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Levas de Criativos</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Nova Leva
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
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
                  <Label className="text-sm text-muted-foreground">Criativos Validados</Label>
                  <div className="bg-neutral-900/50 rounded-md flex-grow">
                    {Array.isArray(leva.criativosValidados) && leva.criativosValidados.length > 0 ? (
                      <ul className="p-3 space-y-2">
                        {leva.criativosValidados.map((criativo) => (
                          <li key={criativo.id} className="flex flex-col gap-2 text-sm bg-neutral-800/50 p-3 rounded hover:bg-neutral-800 transition-colors">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{criativo.name}</span>
                                <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{criativo.sales} {criativo.sales === 1 ? 'venda' : 'vendas'}</span>
                              </div>
                              <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive" onClick={() => handleRemoveValidatedCreative(leva.id, criativo)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Copy do criativo */}
                            {criativo.copy && (
                              <div className="mt-2 pt-2 border-t border-neutral-700/50">
                                <Label className="text-xs text-muted-foreground">Copy:</Label>
                                <p className="text-xs mt-1 whitespace-pre-wrap text-muted-foreground italic">{criativo.copy}</p>
                              </div>
                            )}

                            {/* Métricas do Criativo */}
                            {((criativo.faturamento !== undefined && criativo.faturamento !== null && !isNaN(criativo.faturamento) && criativo.faturamento !== 0) ||
                              (criativo.roi !== undefined && criativo.roi !== null && !isNaN(criativo.roi) && criativo.roi !== 0) ||
                              (criativo.cpa !== undefined && criativo.cpa !== null && !isNaN(criativo.cpa) && criativo.cpa !== 0) ||
                              (criativo.lucro !== undefined && criativo.lucro !== null && !isNaN(criativo.lucro) && criativo.lucro !== 0)) && (
                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-1 pt-2 border-t border-neutral-700/50">
                                  {criativo.faturamento !== undefined && criativo.faturamento !== null && !isNaN(criativo.faturamento) && criativo.faturamento !== 0 && <span>Fat: <span className="text-foreground">{formatCurrency(criativo.faturamento)}</span></span>}
                                  {criativo.roi !== undefined && criativo.roi !== null && !isNaN(criativo.roi) && criativo.roi !== 0 && <span>ROI: <span className="text-foreground">{formatNumber(criativo.roi)}</span></span>}
                                  {criativo.cpa !== undefined && criativo.cpa !== null && !isNaN(criativo.cpa) && criativo.cpa !== 0 && <span>CPA: <span className="text-foreground">{formatCurrency(criativo.cpa)}</span></span>}
                                  {criativo.lucro !== undefined && criativo.lucro !== null && !isNaN(criativo.lucro) && criativo.lucro !== 0 && <span>Lucro: <span className="text-foreground">{formatCurrency(criativo.lucro)}</span></span>}
                                </div>
                              )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-center text-xs text-muted-foreground p-4">Nenhum criativo validado adicionado.</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className='p-4 pt-0'>
                  <AddValidatedCreativeForm onAdd={(creative) => handleAddValidatedCreative(leva.id, creative)} />
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

        <AlertDialog open={!!bancoItemToDelete} onOpenChange={(isOpen) => !isOpen && setBancoItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir criativo do banco?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBancoItemToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (bancoItemToDelete) {
                  handleDeleteBancoCreativo(bancoItemToDelete);
                }
                setBancoItemToDelete(null);
              }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default CreativesBoard;
