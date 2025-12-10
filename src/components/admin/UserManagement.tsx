'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore, useCollection } from '@/firebase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserPlus, Trash2, Shield, User, Pencil, RefreshCw } from 'lucide-react';

interface UserData {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    createdAt: any;
    lastLoginAt?: any;
    passwordChangedAt?: any;
}

export function UserManagement() {
    const { user: currentUser, isAdmin } = useAuth();
    const { orgId } = useOrganization();
    const firestore = useFirestore();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    // Form state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'user'>('user');
    const [newOrgId, setNewOrgId] = useState('');

    const usersQuery = useMemoFirebase(
        () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'users'), orderBy('createdAt', 'desc')) : null),
        [firestore, orgId]
    );

    const { data: users, isLoading: isLoadingUsers } = useCollection<UserData>(usersQuery);

    // Reset fields when opening dialogs
    useEffect(() => {
        if (editingUser) {
            setEmail(editingUser.email);
            setName(editingUser.name);
            setRole(editingUser.role);
            setNewOrgId(orgId || '');
            setPassword(''); // Blank by default
            setError('');
            setSuccess('');
        } else if (isAddDialogOpen) {
            resetForm();
            setNewOrgId(orgId || '');
        }
    }, [isAddDialogOpen, editingUser, orgId]);

    const resetForm = () => {
        setEmail('');
        setName('');
        setPassword('');
        setRole('user');
        setError('');
        setSuccess('');
        setNewOrgId(orgId || '');
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        const isEditing = !!editingUser;
        const endpoint = isEditing ? '/api/auth/update-user' : '/api/auth/register';

        try {
            const payload: any = {
                email,
                name,
                role,
                orgId: orgId, // Current context orgId
            };

            if (password) payload.password = password;

            if (isEditing) {
                payload.userId = editingUser.id;
                payload.currentOrgId = orgId;
                payload.updates = {
                    email, name, role,
                    password: password || undefined,
                    newOrgId: newOrgId !== orgId ? newOrgId : undefined
                };
            } else {
                payload.adminUserId = currentUser?.id;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isEditing ? {
                    userId: editingUser.id,
                    currentOrgId: orgId,
                    updates: payload.updates
                } : payload),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Erro ao salvar usuário');
            } else {
                setSuccess(isEditing ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
                if (!isEditing) resetForm();
                setTimeout(() => {
                    if (isEditing) setEditingUser(null);
                    else setIsAddDialogOpen(false);
                    setSuccess('');
                }, 1500);
            }
        } catch (err: any) {
            setError('Erro de conexão: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!firestore || !orgId) return;

        try {
            await deleteDoc(doc(firestore, 'organizations', orgId, 'users', userId));
            setUserToDelete(null);
        } catch (err) {
            console.error('Error deleting user:', err);
        }
    };

    if (!isAdmin) {
        return (
            <Alert>
                <AlertDescription>
                    Apenas administradores podem gerenciar usuários.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="border-neutral-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Gerenciar Usuários</CardTitle>
                        <CardDescription>Adicione, edite ou remova usuários da organização</CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => { setEditingUser(null); setIsAddDialogOpen(true); }}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Novo Usuário
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSaveUser}>
                                <DialogHeader>
                                    <DialogTitle>Adicionar Usuário</DialogTitle>
                                    <DialogDescription>
                                        Crie uma nova conta de usuário para esta organização.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                                    {success && <Alert className="border-green-800 bg-green-950/50"><AlertDescription className="text-green-400">{success}</AlertDescription></Alert>}

                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome</Label>
                                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Senha</Label>
                                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="role">Função</Label>
                                        <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'user')}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">Usuário</SelectItem>
                                                <SelectItem value="admin">Administrador</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar Usuário'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {isLoadingUsers ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : users && users.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((userData) => (
                                <TableRow key={userData.id}>
                                    <TableCell className="font-medium">{userData.name}</TableCell>
                                    <TableCell>{userData.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={userData.role === 'admin' ? 'default' : 'secondary'}>
                                            {userData.role === 'admin' ? <><Shield className="mr-1 h-3 w-3" /> Admin</> : <><User className="mr-1 h-3 w-3" /> Usuário</>}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingUser(userData)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        {userData.id !== currentUser?.id && (
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setUserToDelete(userData.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado.</p>
                )}
            </CardContent>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <form onSubmit={handleSaveUser}>
                        <DialogHeader>
                            <DialogTitle>Editar Usuário</DialogTitle>
                            <DialogDescription>Atualize os dados do usuário.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                            {success && <Alert className="border-green-800 bg-green-950/50"><AlertDescription className="text-green-400">{success}</AlertDescription></Alert>}

                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nome</Label>
                                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-password">Nova Senha (deixe em branco para manter)</Label>
                                <Input id="edit-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="********" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-role">Função</Label>
                                <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'user')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">Usuário</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-neutral-800">
                                <Label htmlFor="edit-orgId" className="flex items-center gap-2 text-yellow-500">
                                    <RefreshCw className="h-3 w-3" /> Mover para outra Organização (Cuidado!)
                                </Label>
                                <Input
                                    id="edit-orgId"
                                    value={newOrgId}
                                    onChange={(e) => setNewOrgId(e.target.value)}
                                    placeholder="ID da Organização de destino"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Alterar o ID da organização removerá este usuário da lista atual e o moverá para a nova organização.
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => userToDelete && handleDeleteUser(userToDelete)} className="bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
