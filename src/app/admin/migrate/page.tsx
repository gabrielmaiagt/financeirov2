'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function MigratePage() {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState('');

    const runMigration = async () => {
        if (!confirm('Tem certeza que deseja executar a migração? Isso adicionará custom claims aos usuários existentes.')) {
            return;
        }

        setIsLoading(true);
        setError('');
        setResults(null);

        try {
            const response = await fetch('/api/admin/migrate-users', {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro na migração');
            }

            setResults(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 p-8">
            <div className="max-w-4xl mx-auto">
                <Card className="border-neutral-800 bg-neutral-900/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-6 h-6" />
                            Migração de Usuários
                        </CardTitle>
                        <CardDescription>
                            Adiciona custom claims (orgId, role, admin) aos usuários existentes em 'interno-fluxo'
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <p className="text-sm text-yellow-200">
                                <strong>⚠️ Atenção:</strong> Este script deve ser executado apenas uma vez.
                                Ele adicionará custom claims aos usuários que estão na organização 'interno-fluxo' mas ainda não possuem orgId.
                            </p>
                        </div>

                        <Button
                            onClick={runMigration}
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Executando migração...
                                </>
                            ) : (
                                'Executar Migração'
                            )}
                        </Button>

                        {results && (
                            <div className="space-y-4 mt-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card className="bg-neutral-800 border-neutral-700">
                                        <CardContent className="p-4 text-center">
                                            <div className="text-2xl font-bold">{results.summary.total}</div>
                                            <div className="text-sm text-neutral-400">Total</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-green-500/10 border-green-500/20">
                                        <CardContent className="p-4 text-center">
                                            <div className="text-2xl font-bold text-green-400">{results.summary.migrated}</div>
                                            <div className="text-sm text-neutral-400">Migrados</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-blue-500/10 border-blue-500/20">
                                        <CardContent className="p-4 text-center">
                                            <div className="text-2xl font-bold text-blue-400">{results.summary.skipped}</div>
                                            <div className="text-sm text-neutral-400">Pulados</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-red-500/10 border-red-500/20">
                                        <CardContent className="p-4 text-center">
                                            <div className="text-2xl font-bold text-red-400">{results.summary.errors}</div>
                                            <div className="text-sm text-neutral-400">Erros</div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="bg-neutral-800 border-neutral-700">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Detalhes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {results.results.map((result: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 bg-neutral-900 rounded border border-neutral-700"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {result.status === 'migrated' && <CheckCircle className="w-4 h-4 text-green-400" />}
                                                        {result.status === 'skipped' && <AlertCircle className="w-4 h-4 text-blue-400" />}
                                                        {result.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                                                        {result.status === 'orphan' && <AlertCircle className="w-4 h-4 text-yellow-400" />}
                                                        <div>
                                                            <div className="text-sm font-medium">{result.email}</div>
                                                            <div className="text-xs text-neutral-400">
                                                                {result.status === 'migrated' && `Migrado para ${result.orgId} (${result.role})`}
                                                                {result.status === 'skipped' && `Já possui orgId: ${result.orgId}`}
                                                                {result.status === 'error' && `Erro: ${result.error}`}
                                                                {result.status === 'orphan' && result.reason}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded ${result.status === 'migrated' ? 'bg-green-500/20 text-green-400' :
                                                            result.status === 'skipped' ? 'bg-blue-500/20 text-blue-400' :
                                                                result.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                                                    'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                        {result.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {results.summary.migrated > 0 && (
                                    <Alert className="bg-green-500/10 border-green-500/20">
                                        <AlertDescription className="text-green-200">
                                            ✅ Migração concluída com sucesso! {results.summary.migrated} usuário(s) migrado(s).
                                            Os usuários precisarão fazer logout/login para as mudanças terem efeito.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
