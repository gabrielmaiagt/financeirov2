'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, CheckCircle2, AlertCircle } from 'lucide-react';

const ORG_ID = 'interno-fluxo';

interface MigrationResult {
    collection: string;
    count: number;
    success: boolean;
    error?: string;
}

export function DataMigration() {
    const firestore = useFirestore();
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<MigrationResult[]>([]);

    const migrateCollection = async (fromPath: string, toPath: string): Promise<MigrationResult> => {
        if (!firestore) throw new Error('Firestore not initialized');

        try {
            console.log(`Migrating: ${fromPath} → ${toPath}`);

            const sourceRef = collection(firestore, fromPath);
            const snapshot = await getDocs(sourceRef);

            if (snapshot.empty) {
                return { collection: fromPath, count: 0, success: true };
            }

            const batch = writeBatch(firestore);
            let count = 0;

            snapshot.forEach((docSnap) => {
                const destRef = doc(firestore, toPath, docSnap.id);
                batch.set(destRef, docSnap.data());
                count++;
            });

            await batch.commit();

            return { collection: fromPath, count, success: true };
        } catch (error) {
            return {
                collection: fromPath,
                count: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    };

    const runMigration = async () => {
        if (!firestore) {
            alert('Firestore not initialized');
            return;
        }

        setIsRunning(true);
        setResults([]);

        const collectionsToMigrate = [
            { from: 'tarefas', to: `organizations/${ORG_ID}/tarefas` },
            { from: 'perfis', to: `organizations/${ORG_ID}/perfis` },
            { from: 'vendas', to: `organizations/${ORG_ID}/vendas` },
            { from: 'scripts', to: `organizations/${ORG_ID}/scripts` },
            { from: 'reminders', to: `organizations/${ORG_ID}/reminders` },
            { from: 'recuperacao', to: `organizations/${ORG_ID}/recuperacao` },
            { from: 'frases', to: `organizations/${ORG_ID}/frases` },
            { from: 'ofertasEscaladas', to: `organizations/${ORG_ID}/ofertasEscaladas` },
            { from: 'notificacoes', to: `organizations/${ORG_ID}/notificacoes` },
            { from: 'anotacoes', to: `organizations/${ORG_ID}/anotacoes` },
            { from: 'logins', to: `organizations/${ORG_ID}/logins` },
            { from: 'insights', to: `organizations/${ORG_ID}/insights` },
            { from: 'metas', to: `organizations/${ORG_ID}/metas` },
            { from: 'despesas', to: `organizations/${ORG_ID}/despesas` },
            { from: 'operacoesSocios', to: `organizations/${ORG_ID}/operacoesSocios` },
            { from: 'criativos', to: `organizations/${ORG_ID}/criativos` },
            { from: 'banco_criativos', to: `organizations/${ORG_ID}/banco_criativos` },
        ];

        const migrationResults: MigrationResult[] = [];

        for (const { from, to } of collectionsToMigrate) {
            const result = await migrateCollection(from, to);
            migrationResults.push(result);
            setResults([...migrationResults]);
        }

        setIsRunning(false);
    };

    return (
        <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Data Migration Tool
                </CardTitle>
                <CardDescription>
                    Migrate ALL remaining data from root collections to the new multi-tenant structure ({collectionsToMigrate.length} collections)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-200">
                        <strong>⚠️ Important:</strong> This will migrate ALL collections to{' '}
                        <code className="bg-yellow-500/20 px-1 rounded">organizations/{ORG_ID}/...</code>
                    </p>
                </div>

                <Button
                    onClick={runMigration}
                    disabled={isRunning || !firestore}
                    className="w-full"
                >
                    {isRunning ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Migrating {results.length} / {collectionsToMigrate.length}...
                        </>
                    ) : (
                        <>
                            <Database className="w-4 h-4 mr-2" />
                            Migrate All Collections
                        </>
                    )}
                </Button>

                {results.length > 0 && (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        <h4 className="font-semibold text-sm sticky top-0 bg-background py-2">Migration Results:</h4>
                        {results.map((result, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg"
                            >
                                <div className="flex items-center gap-2">
                                    {result.success ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                    )}
                                    <span className="text-sm font-mono">{result.collection}</span>
                                </div>
                                {result.success ? (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-400">
                                        {result.count} docs
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-red-500/10 text-red-400">
                                        Error
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
