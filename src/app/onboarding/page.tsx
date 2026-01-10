'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    ArrowRight,
    ArrowLeft,
    Check,
    Rocket,
    Settings,
    Users,
    BookOpen,
    X,
    Plus,
    Trash2
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface Partner {
    id: string;
    name: string;
    percentage: number;
}

export default function OnboardingPage() {
    const router = useRouter();
    const { orgId } = useOrganization();
    const firestore = useFirestore();

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 2: Operation
    const [operationName, setOperationName] = useState('');
    const [gateway, setGateway] = useState('');

    // Step 3: Partners
    const [partners, setPartners] = useState<Partner[]>([
        { id: '1', name: '', percentage: 0 }
    ]);
    const [companyReserve, setCompanyReserve] = useState(0);

    const totalSteps = 4;
    const progress = (currentStep / totalSteps) * 100;

    // Calculate total percentage
    const totalPercentage = partners.reduce((sum, p) => sum + p.percentage, 0) + companyReserve;

    const addPartner = () => {
        setPartners([...partners, { id: Date.now().toString(), name: '', percentage: 0 }]);
    };

    const removePartner = (id: string) => {
        setPartners(partners.filter(p => p.id !== id));
    };

    const updatePartner = (id: string, field: 'name' | 'percentage', value: string | number) => {
        setPartners(partners.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const handleSkip = async () => {
        await saveOnboardingProgress(true);
        router.push('/');
    };

    const saveOnboardingProgress = async (completed: boolean = false) => {
        if (!firestore || !orgId) return;

        try {
            const onboardingRef = doc(firestore, 'organizations', orgId, 'settings', 'onboarding');
            await setDoc(onboardingRef, {
                completed,
                currentStep,
                steps: {
                    welcome: currentStep > 1,
                    operation: currentStep > 2,
                    partners: currentStep > 3,
                    tour: completed
                },
                data: {
                    operationName,
                    gateway,
                    partners: partners.filter(p => p.name && p.percentage > 0),
                    companyReserve
                },
                updatedAt: new Date()
            }, { merge: true });
        } catch (error) {
            console.error('Error saving onboarding:', error);
        }
    };

    const handleNext = async () => {
        if (currentStep === 2 && !operationName) {
            alert('Por favor, insira o nome da operação');
            return;
        }

        if (currentStep === 3) {
            if (totalPercentage !== 100) {
                alert('A soma dos percentuais deve ser exatamente 100%');
                return;
            }
            const validPartners = partners.filter(p => p.name && p.percentage > 0);
            if (validPartners.length === 0) {
                alert('Adicione pelo menos um sócio');
                return;
            }
        }

        await saveOnboardingProgress();

        if (currentStep === totalSteps) {
            // Finish onboarding and create operation if configured
            await saveOnboardingProgress(true);

            // Create operation from onboarding data if provided
            if (operationName && firestore && orgId) {
                try {
                    const validPartners = partners.filter(p => p.name && p.percentage > 0);
                    const operationId = Date.now().toString();
                    const operationsRef = doc(firestore, 'organizations', orgId, 'operations', operationId);

                    await setDoc(operationsRef, {
                        id: operationId,
                        orgId: orgId,
                        name: operationName,
                        category: 'other' as const,
                        product: operationName,
                        gateway: gateway || 'manual',
                        cashReservePercentage: companyReserve,
                        partners: validPartners.map(p => ({
                            name: p.name,
                            percentage: p.percentage
                        })),
                        adCostMode: 'reimburse_payer' as const,
                        active: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });

                    console.log('✅ Operation created from onboarding:', operationId);
                } catch (error) {
                    console.error('❌ Error creating operation:', error);
                    // Don't block onboarding if operation creation fails
                }
            }

            router.push('/');
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-sm font-medium text-neutral-400">
                            Passo {currentStep} de {totalSteps}
                        </h2>
                        <button
                            onClick={handleSkip}
                            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                        >
                            Pular para o painel
                        </button>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Content Card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur">
                            <CardContent className="p-8 md:p-12">
                                {/* Step 1: Welcome */}
                                {currentStep === 1 && (
                                    <div className="text-center space-y-6">
                                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-emerald-500 rounded-full flex items-center justify-center">
                                            <Rocket className="w-10 h-10 text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-3xl md:text-4xl font-bold mb-4">
                                                Bem-vindo ao Painel Financeiro! 🎉
                                            </h1>
                                            <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                                                Vamos configurar tudo em menos de 2 minutos.
                                                Você pode pular esta etapa e voltar depois se preferir.
                                            </p>
                                        </div>
                                        <div className="grid md:grid-cols-3 gap-4 mt-8">
                                            <div className="p-4 bg-neutral-800/50 rounded-lg">
                                                <Settings className="w-8 h-8 text-primary mx-auto mb-2" />
                                                <h3 className="font-semibold mb-1">Configurar</h3>
                                                <p className="text-sm text-neutral-400">Operações e gateways</p>
                                            </div>
                                            <div className="p-4 bg-neutral-800/50 rounded-lg">
                                                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                                                <h3 className="font-semibold mb-1">Sócios</h3>
                                                <p className="text-sm text-neutral-400">Divisão de lucros</p>
                                            </div>
                                            <div className="p-4 bg-neutral-800/50 rounded-lg">
                                                <BookOpen className="w-8 h-8 text-primary mx-auto mb-2" />
                                                <h3 className="font-semibold mb-1">Conhecer</h3>
                                                <p className="text-sm text-neutral-400">Tour rápido</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Operation Setup */}
                                {currentStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-8">
                                            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                                <Settings className="w-8 h-8 text-primary" />
                                            </div>
                                            <h1 className="text-2xl md:text-3xl font-bold mb-2">
                                                Configure sua Operação
                                            </h1>
                                            <p className="text-neutral-400">
                                                Você pode adicionar mais operações depois
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="operation">Nome da Operação</Label>
                                                <Input
                                                    id="operation"
                                                    placeholder="Ex: Produto Premium, Serviço X, etc."
                                                    value={operationName}
                                                    onChange={(e) => setOperationName(e.target.value)}
                                                    className="bg-neutral-800 border-neutral-700 mt-2"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="gateway">Gateway de Pagamento (Opcional)</Label>
                                                <select
                                                    id="gateway"
                                                    value={gateway}
                                                    onChange={(e) => setGateway(e.target.value)}
                                                    className="w-full mt-2 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white"
                                                >
                                                    <option value="">Selecione...</option>
                                                    <option value="frendz">Frendz</option>
                                                    <option value="paradise">Paradise</option>
                                                    <option value="buckpay">Buckpay</option>
                                                    <option value="ggcheckout">GGCheckout</option>
                                                </select>
                                            </div>

                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
                                                <p className="text-sm text-blue-200">
                                                    💡 <strong>Dica:</strong> Você pode adicionar múltiplas operações e produtos no painel principal depois.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Partners */}
                                {currentStep === 3 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-8">
                                            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                                <Users className="w-8 h-8 text-primary" />
                                            </div>
                                            <h1 className="text-2xl md:text-3xl font-bold mb-2">
                                                Configure a Divisão de Lucros
                                            </h1>
                                            <p className="text-neutral-400">
                                                Defina os percentuais de cada sócio
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Company Reserve */}
                                            <div className="bg-neutral-800/50 p-4 rounded-lg">
                                                <Label htmlFor="reserve">Reserva da Empresa (%)</Label>
                                                <Input
                                                    id="reserve"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                    value={companyReserve || ''}
                                                    onChange={(e) => setCompanyReserve(Number(e.target.value) || 0)}
                                                    className="bg-neutral-800 border-neutral-700 mt-2"
                                                />
                                            </div>

                                            {/* Partners List */}
                                            {partners.map((partner, index) => (
                                                <div key={partner.id} className="bg-neutral-800/50 p-4 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Label>Sócio {index + 1}</Label>
                                                        {partners.length > 1 && (
                                                            <button
                                                                onClick={() => removePartner(partner.id)}
                                                                className="text-red-400 hover:text-red-300"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input
                                                            placeholder="Nome do sócio"
                                                            value={partner.name}
                                                            onChange={(e) => updatePartner(partner.id, 'name', e.target.value)}
                                                            className="bg-neutral-800 border-neutral-700"
                                                        />
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            placeholder="%"
                                                            value={partner.percentage || ''}
                                                            onChange={(e) => updatePartner(partner.id, 'percentage', Number(e.target.value) || 0)}
                                                            className="bg-neutral-800 border-neutral-700"
                                                        />
                                                    </div>
                                                </div>
                                            ))}

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={addPartner}
                                                className="w-full border-neutral-700 hover:bg-neutral-800"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Adicionar Sócio
                                            </Button>

                                            {/* Total */}
                                            <div className={`p-4 rounded-lg border-2 ${totalPercentage === 100
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : 'bg-yellow-500/10 border-yellow-500/30'
                                                }`}>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold">Total:</span>
                                                    <span className={`text-2xl font-bold ${totalPercentage === 100 ? 'text-green-400' : 'text-yellow-400'
                                                        }`}>
                                                        {totalPercentage}%
                                                    </span>
                                                </div>
                                                {totalPercentage !== 100 && (
                                                    <p className="text-sm text-yellow-200 mt-2">
                                                        A soma deve ser exatamente 100%
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Tour */}
                                {currentStep === 4 && (
                                    <div className="text-center space-y-6">
                                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-emerald-500 rounded-full flex items-center justify-center">
                                            <Check className="w-10 h-10 text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-3xl md:text-4xl font-bold mb-4">
                                                Tudo Pronto! 🎊
                                            </h1>
                                            <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                                                Seu painel está configurado. Agora você pode:
                                            </p>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-4 mt-8 text-left">
                                            <div className="p-4 bg-neutral-800/50 rounded-lg">
                                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-400" />
                                                    Ver vendas em tempo real
                                                </h3>
                                                <p className="text-sm text-neutral-400">
                                                    Acompanhe cada transação instantaneamente
                                                </p>
                                            </div>
                                            <div className="p-4 bg-neutral-800/50 rounded-lg">
                                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-400" />
                                                    Divisão automática de lucros
                                                </h3>
                                                <p className="text-sm text-neutral-400">
                                                    Calcule quanto cada sócio recebe
                                                </p>
                                            </div>
                                            <div className="p-4 bg-neutral-800/50 rounded-lg">
                                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-400" />
                                                    Conectar webhooks
                                                </h3>
                                                <p className="text-sm text-neutral-400">
                                                    Integre com seu gateway em 1 clique
                                                </p>
                                            </div>
                                            <div className="p-4 bg-neutral-800/50 rounded-lg">
                                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-400" />
                                                    Widget iOS
                                                </h3>
                                                <p className="text-sm text-neutral-400">
                                                    Veja vendas na tela inicial do iPhone
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Navigation Buttons */}
                                <div className="flex justify-between items-center mt-12 pt-6 border-t border-neutral-800">
                                    {currentStep > 1 ? (
                                        <Button
                                            variant="outline"
                                            onClick={handleBack}
                                            className="border-neutral-700 hover:bg-neutral-800"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Voltar
                                        </Button>
                                    ) : (
                                        <div />
                                    )}

                                    <Button
                                        onClick={handleNext}
                                        disabled={loading}
                                        className="bg-gradient-to-r from-primary to-emerald-500 hover:opacity-90"
                                    >
                                        {currentStep === totalSteps ? (
                                            <>
                                                Ir para o Painel
                                                <Rocket className="w-4 h-4 ml-2" />
                                            </>
                                        ) : (
                                            <>
                                                Próximo
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
