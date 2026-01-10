'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPlus, Check, X, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        acceptTerms: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Password strength calculator
    const getPasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
    const strengthLabels = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validations
        if (!formData.name.trim()) {
            setError('Por favor, insira seu nome completo');
            return;
        }

        if (!formData.email.includes('@')) {
            setError('Email inválido');
            return;
        }

        if (formData.password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (!formData.companyName.trim()) {
            setError('Por favor, insira o nome da sua empresa');
            return;
        }

        if (!formData.acceptTerms) {
            setError('Você precisa aceitar os termos de uso');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    companyName: formData.companyName,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao criar conta');
            }

            // Success! Redirect to onboarding
            router.push('/onboarding');
        } catch (err: any) {
            setError(err.message || 'Erro ao criar conta. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(''); // Clear error on change
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4">
            <Card className="w-full max-w-lg border-neutral-800 bg-neutral-900/50 backdrop-blur">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold">Criar Conta</CardTitle>
                    <CardDescription>
                        Comece a automatizar seu financeiro em menos de 2 minutos
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input
                                id="name"
                                placeholder="João Silva"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                required
                                className="bg-neutral-800 border-neutral-700"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                required
                                className="bg-neutral-800 border-neutral-700"
                            />
                        </div>

                        {/* Company Name */}
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Nome da Empresa</Label>
                            <Input
                                id="companyName"
                                placeholder="Minha Empresa Ltda"
                                value={formData.companyName}
                                onChange={(e) => handleChange('companyName', e.target.value)}
                                required
                                className="bg-neutral-800 border-neutral-700"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    required
                                    className="bg-neutral-800 border-neutral-700 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {formData.password && (
                                <div className="space-y-1">
                                    <div className="flex gap-1">
                                        {[0, 1, 2, 3, 4].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-1 flex-1 rounded-full transition-colors ${level < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-neutral-700'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-neutral-400">
                                        Força: <span className={`font-medium ${passwordStrength >= 3 ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {strengthLabels[Math.max(0, passwordStrength - 1)]}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                    required
                                    className="bg-neutral-800 border-neutral-700 pr-10"
                                />
                                {formData.confirmPassword && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {formData.password === formData.confirmPassword ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <X className="w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="terms"
                                checked={formData.acceptTerms}
                                onCheckedChange={(checked) => handleChange('acceptTerms', checked)}
                            />
                            <label
                                htmlFor="terms"
                                className="text-sm text-neutral-400 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Aceito os{' '}
                                <Link href="/terms" className="text-primary hover:underline">
                                    termos de uso
                                </Link>{' '}
                                e{' '}
                                <Link href="/privacy" className="text-primary hover:underline">
                                    política de privacidade
                                </Link>
                            </label>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4">
                        <Button type="submit" className="w-full" disabled={isLoading || !formData.acceptTerms}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando conta...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Criar Conta Grátis
                                </>
                            )}
                        </Button>

                        <p className="text-sm text-center text-neutral-400">
                            Já tem uma conta?{' '}
                            <Link href="/login" className="text-primary hover:underline font-medium">
                                Fazer login
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
