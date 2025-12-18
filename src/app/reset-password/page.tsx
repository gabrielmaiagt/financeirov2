'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, KeyRound, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { confirmPasswordReset } from 'firebase/auth';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('oobCode'); // Firebase uses 'oobCode' for the token

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { auth } = useFirebase();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }
        
        if (!auth || !token) {
            setError('Link inválido ou serviço de autenticação indisponível.');
            return;
        }

        setIsLoading(true);

        try {
            await confirmPasswordReset(auth, token, password);
            setSuccess(true);
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: any) {
             switch (err.code) {
                case 'auth/expired-action-code':
                    setError('O link de recuperação expirou. Por favor, solicite um novo.');
                    break;
                case 'auth/invalid-action-code':
                    setError('O link de recuperação é inválido. Pode já ter sido usado.');
                    break;
                case 'auth/weak-password':
                    setError('A senha é muito fraca. Tente uma mais forte.');
                    break;
                default:
                    setError('Erro ao redefinir a senha. Tente novamente.');
                    break;
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <Card className="w-full max-w-md border-neutral-800 bg-neutral-900/50 backdrop-blur">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold text-red-500">Link Inválido</CardTitle>
                    <CardDescription>
                        O link de recuperação de senha é inválido ou está incompleto.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Link href="/forgot-password" className="w-full">
                        <Button className="w-full">Solicitar novo link</Button>
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    if (success) {
        return (
            <Card className="w-full max-w-md border-neutral-800 bg-neutral-900/50 backdrop-blur">
                <CardHeader className="space-y-1 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <CardTitle className="text-2xl font-bold">Senha Alterada!</CardTitle>
                    <CardDescription>
                        Sua senha foi redefinida com sucesso. Você será redirecionado para o login...
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Link href="/login" className="w-full">
                        <Button className="w-full">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Ir para o login
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md border-neutral-800 bg-neutral-900/50 backdrop-blur">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
                <CardDescription>Digite sua nova senha</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="password">Nova Senha</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="bg-neutral-800 border-neutral-700"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="bg-neutral-800 border-neutral-700"
                        />
                    </div>
                </CardContent>

                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Redefinindo...
                            </>
                        ) : (
                            <>
                                <KeyRound className="mr-2 h-4 w-4" />
                                Redefinir Senha
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4">
            <Suspense fallback={<div>Carregando...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
