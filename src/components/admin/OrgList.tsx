'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Organization {
    id: string; // slug
    name: string;
    slug: string;
    createdAt: Timestamp;
    active: boolean;
}

export function OrgList() {
    const firestore = useFirestore();
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrgs = async () => {
        if (!firestore) return;
        setLoading(true);
        try {
            const q = query(collection(firestore, 'organizations'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const orgsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Organization[];
            setOrgs(orgsData);
        } catch (error) {
            console.error("Error fetching organizations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (firestore) {
            fetchOrgs();
        }
    }, [firestore]);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Organizações ({orgs.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchOrgs}>Atualizar</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Slug (ID)</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orgs.map((org) => (
                            <TableRow key={org.id}>
                                <TableCell className="font-medium">{org.name}</TableCell>
                                <TableCell>{org.slug}</TableCell>
                                <TableCell>
                                    {org.createdAt?.seconds ? format(new Date(org.createdAt.seconds * 1000), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={org.active ? 'default' : 'secondary'}>
                                        {org.active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" asChild>
                                        <a href={`http://${org.slug}.localhost:3000`} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {orgs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Nenhuma organização encontrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
