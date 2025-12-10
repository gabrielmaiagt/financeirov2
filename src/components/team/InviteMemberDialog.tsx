'use client';

import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { MemberRole } from '@/types/organization';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

export function InviteMemberDialog() {
    const { orgId } = useOrganization();
    const firestore = useFirestore();

    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<MemberRole>('member');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const sanitizeEmail = (email: string) => {
        return email.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '_');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !orgId) return;

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const memberId = sanitizeEmail(email);
            const memberRef = doc(firestore, 'organizations', orgId, 'members', memberId);

            // Check if already exists
            const existing = await getDoc(memberRef);
            if (existing.exists()) {
                setError('Este email já foi convidado.');
                setLoading(false);
                return;
            }

            await setDoc(memberRef, {
                id: memberId,
                email: email.toLowerCase().trim(),
                role,
                status: 'pending',
                addedAt: serverTimestamp(),
            });

            setSuccess(true);
            setEmail('');
            setRole('member');

            // Close dialog after short delay
            setTimeout(() => {
                setOpen(false);
                setSuccess(false);
            }, 1500);
        } catch (err) {
            console.error('Error inviting member:', err);
            setError('Erro ao convidar membro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Convidar Membro
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Convidar Novo Membro</DialogTitle>
                    <DialogDescription>
                        Adicione um colaborador à sua organização informando o email.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="colaborador@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Cargo</Label>
                        <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Membro</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Admins podem gerenciar a equipe. Membros apenas visualizam.
                        </p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="border-green-500 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>Membro convidado com sucesso!</AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={loading || !email}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Enviar Convite
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
