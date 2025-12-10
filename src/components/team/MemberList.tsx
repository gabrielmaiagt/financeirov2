'use client';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useFirestore, useCollection } from '@/firebase';
import { useOrgCollection } from '@/hooks/useFirestoreOrg';
import { OrganizationMember } from '@/types/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Shield, User, Crown } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { useOrgRole } from '@/hooks/useOrgRole';

const roleIcons: Record<string, React.ReactNode> = {
    owner: <Crown className="w-4 h-4 text-yellow-500" />,
    admin: <Shield className="w-4 h-4 text-blue-500" />,
    member: <User className="w-4 h-4 text-muted-foreground" />,
};

const roleLabels: Record<string, string> = {
    owner: 'Dono',
    admin: 'Admin',
    member: 'Membro',
};

export function MemberList() {
    const { orgId } = useOrganization();
    const firestore = useFirestore();
    const { isAdmin } = useOrgRole();

    // Get collection reference, then fetch data with useCollection
    const membersRef = useOrgCollection<OrganizationMember>('members');
    const { data: members, isLoading } = useCollection<OrganizationMember>(membersRef);

    const handleRemove = async (memberId: string, role: string) => {
        if (!firestore || !orgId) return;
        if (role === 'owner') {
            alert('Não é possível remover o dono da organização.');
            return;
        }
        if (confirm(`Tem certeza que deseja remover este membro?`)) {
            await deleteDoc(doc(firestore, 'organizations', orgId, 'members', memberId));
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Membros da Equipe ({members?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Status</TableHead>
                            {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members?.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium">{member.email}</TableCell>
                                <TableCell>{member.name || '-'}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {roleIcons[member.role]}
                                        <span>{roleLabels[member.role]}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                        {member.status === 'active' ? 'Ativo' : 'Pendente'}
                                    </Badge>
                                </TableCell>
                                {isAdmin && (
                                    <TableCell className="text-right">
                                        {member.role !== 'owner' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemove(member.id, member.role)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {(!members || members.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Nenhum membro encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
