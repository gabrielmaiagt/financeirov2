'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, FileText } from 'lucide-react';

type DocType = 'buckpay' | 'paradise';

const WebhookDocumentation = () => {
    const [buckpayDoc, setBuckpayDoc] = useState('');
    const [paradiseDoc, setParadiseDoc] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchDocs = async () => {
            setIsLoading(true);
            try {
                const [buckpayRes, paradiseRes] = await Promise.all([
                    fetch('/api/admin/docs?doc=buckpay'),
                    fetch('/api/admin/docs?doc=paradise')
                ]);
                const buckpayData = await buckpayRes.json();
                const paradiseData = await paradiseRes.json();
                
                if (buckpayRes.ok) setBuckpayDoc(buckpayData.content);
                if (paradiseRes.ok) setParadiseDoc(paradiseData.content);

            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao carregar documentação',
                    description: 'Não foi possível buscar os arquivos de documentação.',
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchDocs();
    }, [toast]);

    const handleSave = async (docType: DocType) => {
        setIsSaving(true);
        const content = docType === 'buckpay' ? buckpayDoc : paradiseDoc;
        try {
            const response = await fetch('/api/admin/docs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doc: docType, content }),
            });

            if (!response.ok) {
                throw new Error('Falha ao salvar a documentação.');
            }

            toast({
                title: 'Sucesso!',
                description: `Documentação do ${docType === 'buckpay' ? 'Buckpay' : 'Paradise'} salva.`,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Um erro desconhecido ocorreu.';
            toast({
                variant: 'destructive',
                title: `Erro ao salvar ${docType}`,
                description: errorMessage,
            });
        } finally {
            setIsSaving(false);
        }
    };


    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Documentação dos Webhooks
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-48 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Documentação dos Webhooks
                </CardTitle>
                <CardDescription>
                    Cole o conteúdo da documentação de cada gateway aqui para referência.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <h3 className="font-semibold">Buckpay</h3>
                    <Textarea 
                        value={buckpayDoc}
                        onChange={(e) => setBuckpayDoc(e.target.value)}
                        placeholder="Cole aqui a documentação do webhook da Buckpay..."
                        className="h-48 font-mono text-xs"
                    />
                    <Button onClick={() => handleSave('buckpay')} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Doc Buckpay
                    </Button>
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold">Paradise</h3>
                    <Textarea 
                        value={paradiseDoc}
                        onChange={(e) => setParadiseDoc(e.target.value)}
                        placeholder="Cole aqui a documentação do webhook da Paradise..."
                        className="h-48 font-mono text-xs"
                    />
                     <Button onClick={() => handleSave('paradise')} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Doc Paradise
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default WebhookDocumentation;
