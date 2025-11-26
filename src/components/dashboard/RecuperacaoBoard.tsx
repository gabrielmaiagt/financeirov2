'use client';
import { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Copy, Trash2, Edit, MessageSquare, Mail, Smartphone, Volume2, FileText, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

interface MensagemRecuperacao {
    id: string;
    tipo: 'whatsapp' | 'email' | 'sms';
    formato: 'texto' | 'audio';
    titulo: string;
    conteudo: string;
    tags: string[];
    criadoEm: Timestamp;
    atualizadoEm: Timestamp;
}

const RecuperacaoBoard = () => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMessage, setEditingMessage] = useState<MensagemRecuperacao | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [filterTipo, setFilterTipo] = useState<string>('all');

    // Form state
    const [tipo, setTipo] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
    const [formato, setFormato] = useState<'texto' | 'audio'>('texto');
    const [titulo, setTitulo] = useState('');
    const [conteudo, setConteudo] = useState('');
    const [tagsInput, setTagsInput] = useState('');

    const mensagensQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'recuperacao'), orderBy('criadoEm', 'desc')) : null),
        [firestore]
    );

    const { data: mensagens, isLoading } = useCollection<MensagemRecuperacao>(mensagensQuery);

    const filteredMensagens = mensagens?.filter(msg =>
        filterTipo === 'all' || msg.tipo === filterTipo
    );

    const handleSave = async () => {
        if (!firestore || !titulo || !conteudo) {
            toast({
                title: "Erro",
                description: "Preencha todos os campos obrigatórios",
                variant: "destructive",
            });
            return;
        }

        const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);

        try {
            if (editingMessage) {
                // Update existing
                const docRef = doc(firestore, 'recuperacao', editingMessage.id);
                await updateDoc(docRef, {
                    tipo,
                    formato,
                    titulo,
                    conteudo,
                    tags,
                    atualizadoEm: Timestamp.now(),
                });
                toast({
                    title: "Atualizado!",
                    description: "Mensagem atualizada com sucesso",
                });
            } else {
                // Create new
                await addDoc(collection(firestore, 'recuperacao'), {
                    tipo,
                    formato,
                    titulo,
                    conteudo,
                    tags,
                    criadoEm: Timestamp.now(),
                    atualizadoEm: Timestamp.now(),
                });
                toast({
                    title: "Criado!",
                    description: "Mensagem adicionada com sucesso",
                });
            }

            resetForm();
            setIsDialogOpen(false);
        } catch (error) {
            console.error('Error saving message:', error);
            toast({
                title: "Erro",
                description: "Falha ao salvar mensagem",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'recuperacao', id));
            toast({
                title: "Excluído!",
                description: "Mensagem removida com sucesso",
            });
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting message:', error);
            toast({
                title: "Erro",
                description: "Falha ao excluir mensagem",
                variant: "destructive",
            });
        }
    };

    const handleCopy = async (conteudo: string, id: string) => {
        try {
            await navigator.clipboard.writeText(conteudo);
            setCopiedId(id);
            toast({
                title: "Copiado!",
                description: "Conteúdo copiado para a área de transferência",
            });
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            toast({
                title: "Erro",
                description: "Falha ao copiar",
                variant: "destructive",
            });
        }
    };

    const handleEdit = (msg: MensagemRecuperacao) => {
        setEditingMessage(msg);
        setTipo(msg.tipo);
        setFormato(msg.formato);
        setTitulo(msg.titulo);
        setConteudo(msg.conteudo);
        setTagsInput(msg.tags.join(', '));
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingMessage(null);
        setTipo('whatsapp');
        setFormato('texto');
        setTitulo('');
        setConteudo('');
        setTagsInput('');
    };

    const getTipoIcon = (tipo: string) => {
        switch (tipo) {
            case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
            case 'email': return <Mail className="w-4 h-4" />;
            case 'sms': return <Smartphone className="w-4 h-4" />;
            default: return null;
        }
    };

    const getFormatoIcon = (formato: string) => {
        return formato === 'audio' ? <Volume2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
    };

    if (isLoading) {
        return <div className="flex items-center justify-center p-8">Carregando mensagens...</div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Recuperação</h2>
                    <p className="text-sm text-muted-foreground">Gerencie suas mensagens de recuperação</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                    </Select>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" /> Nova Mensagem
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{editingMessage ? 'Editar' : 'Nova'} Mensagem de Recuperação</DialogTitle>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="tipo">Tipo</Label>
                                        <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                                            <SelectTrigger id="tipo">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                                <SelectItem value="email">E-mail</SelectItem>
                                                <SelectItem value="sms">SMS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="formato">Formato</Label>
                                        <Select value={formato} onValueChange={(v: any) => setFormato(v)}>
                                            <SelectTrigger id="formato">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="texto">Texto</SelectItem>
                                                <SelectItem value="audio">Áudio (Link)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="titulo">Título</Label>
                                    <Input
                                        id="titulo"
                                        value={titulo}
                                        onChange={(e) => setTitulo(e.target.value)}
                                        placeholder="Ex: Carrinho Abandonado - Dia 1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="conteudo">{formato === 'audio' ? 'Link do Áudio' : 'Mensagem'}</Label>
                                    <Textarea
                                        id="conteudo"
                                        value={conteudo}
                                        onChange={(e) => setConteudo(e.target.value)}
                                        placeholder={formato === 'audio' ? 'https://...' : 'Digite a mensagem...'}
                                        rows={6}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                                    <Input
                                        id="tags"
                                        value={tagsInput}
                                        onChange={(e) => setTagsInput(e.target.value)}
                                        placeholder="Ex: carrinho, urgência, desconto"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSave}>Salvar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMensagens && filteredMensagens.length > 0 ? (
                    filteredMensagens.map((msg) => (
                        <Card key={msg.id} className="border-neutral-800 bg-transparent hover:border-neutral-700 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        {getTipoIcon(msg.tipo)}
                                        {getFormatoIcon(msg.formato)}
                                        <CardTitle className="text-base">{msg.titulo}</CardTitle>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(msg)}>
                                            <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setItemToDelete(msg.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pb-3">
                                <div className="bg-neutral-900/50 rounded p-3 mb-3 max-h-32 overflow-y-auto">
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                                        {msg.formato === 'audio' ? (
                                            <a href={msg.conteudo} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                {msg.conteudo}
                                            </a>
                                        ) : (
                                            msg.conteudo
                                        )}
                                    </p>
                                </div>

                                {msg.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {msg.tags.map((tag, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="pt-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleCopy(msg.conteudo, msg.id)}
                                >
                                    {copiedId === msg.id ? (
                                        <>
                                            <Check className="mr-2 h-3 w-3" /> Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-2 h-3 w-3" /> Copiar
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12">
                        <p className="text-muted-foreground">Nenhuma mensagem encontrada. Adicione sua primeira mensagem de recuperação!</p>
                    </div>
                )}
            </div>

            <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Essa ação não pode ser desfeita e excluirá permanentemente esta mensagem.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => itemToDelete && handleDelete(itemToDelete)} className="bg-red-600 hover:bg-red-700">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default RecuperacaoBoard;
