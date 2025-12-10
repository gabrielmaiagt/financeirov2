'use client';

import { useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CreateOrgFormProps {
    onSuccess?: () => void;
}

export function CreateOrgForm({ onSuccess }: CreateOrgFormProps) {
    const firestore = useFirestore();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Auto-slugify: lowercase, replace spaces with dashes, remove special chars
        const value = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        setSlug(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        if (!name || !slug) {
            setError('Preencha todos os campos.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const orgRef = doc(firestore, 'organizations', slug);
            const orgSnap = await getDoc(orgRef);

            if (orgSnap.exists()) {
                setError('Este slug já está em uso. Escolha outro.');
                setLoading(false);
                return;
            }

            await setDoc(orgRef, {
                name,
                slug,
                active: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                theme: {
                    primaryColor: '#000000',
                },
                features: {
                    financials: true,
                }
            });

            setSuccess(true);
            setName('');
            setSlug('');
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Error creating org:", err);
            setError('Erro ao criar organização. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nova Organização</CardTitle>
                <CardDescription>Crie um novo ambiente para um cliente.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome da Empresa</Label>
                        <Input
                            id="name"
                            placeholder="Ex: Minha Empresa Ltda"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="slug">Slug (URL)</Label>
                        <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground text-sm">http://</span>
                            <Input
                                id="slug"
                                placeholder="minha-empresa"
                                value={slug}
                                onChange={handleSlugChange}
                            />
                            <span className="text-muted-foreground text-sm">.localhost:3000</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Identificador único usado na URL.</p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erro</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="border-green-500 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Sucesso!</AlertTitle>
                            <AlertDescription>Organização criada com sucesso.</AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={loading || !firestore}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar Organização'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
