'use client';

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Operacao } from '@/app/page';
import { Timestamp } from 'firebase/firestore';
import { CalendarIcon, ChevronDown, ChevronRight, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOperation } from '@/contexts/OperationContext';
import { calculateProfitDistribution, ProfitCalculationInput, PartnerProfit } from '@/lib/profit-calculator';

interface OperationFormProps {
    onSave: (operation: Omit<Operacao, 'id'>) => void;
    onClose: () => void;
    existingOperation?: Operacao | null;
}

export function OperationForm({ onSave, onClose, existingOperation }: OperationFormProps) {
    const { operations } = useOperation();
    const [date, setDate] = useState<Date>(existingOperation ? existingOperation.data.toDate() : new Date());
    const [descricao, setDescricao] = useState(existingOperation?.descricao || '');
    const [faturamento, setFaturamento] = useState(existingOperation?.faturamentoLiquido?.toString() || '');
    const [gastoAnuncio, setGastoAnuncio] = useState(existingOperation?.gastoAnuncio?.toString() || '');
    const [taxaGateway, setTaxaGateway] = useState(existingOperation?.taxaGateway?.toString() || '4');

    const [selectedOperationId, setSelectedOperationId] = useState<string>(existingOperation?.operationId || '');

    // Percentuais (agora dinâmicos baseados na operação)
    const [percCabral, setPercCabral] = useState(existingOperation?.percentualCabral?.toString() || '0');
    const [percBiel, setPercBiel] = useState(existingOperation?.percentualBiel?.toString() || '0');
    const [percSoares, setPercSoares] = useState(existingOperation?.percentualSoares?.toString() || '0');

    const [showPercentages, setShowPercentages] = useState(false);

    // Calculated values
    const [lucroLiquido, setLucroLiquido] = useState(0);
    const [valCabral, setValCabral] = useState(0);
    const [valBiel, setValBiel] = useState(0);
    const [valSoares, setValSoares] = useState(0);
    const [totalCabral, setTotalCabral] = useState(0);

    // Auto-fill percentages when operation is selected
    useEffect(() => {
        if (selectedOperationId && !existingOperation) {
            const op = operations.find(o => o.id === selectedOperationId);
            if (op) {
                // Map partners to specific state variables (assuming fixed partners for now, but scalable)
                // In a fully dynamic system, we would render inputs based on op.partners
                const cabral = op.partners.find(p => p.name.toLowerCase().includes('cabral'))?.percentage || 0;
                const biel = op.partners.find(p => p.name.toLowerCase().includes('biel'))?.percentage || 0;
                const soares = op.partners.find(p => p.name.toLowerCase().includes('soares'))?.percentage || 0;

                setPercCabral(cabral.toString());
                setPercBiel(biel.toString());
                setPercSoares(soares.toString());

                // Auto-fill description if empty
                if (!descricao) {
                    setDescricao(`${op.name} - ${format(new Date(), 'dd/MM')}`);
                }
            }
        }
    }, [selectedOperationId, operations, existingOperation, descricao]);

    useEffect(() => {
        const fat = parseFloat(faturamento.replace(',', '.')) || 0;
        const ads = parseFloat(gastoAnuncio.replace(',', '.')) || 0;
        const taxa = parseFloat(taxaGateway.replace(',', '.')) || 0;

        // Use the calculator utility if an operation is selected
        const op = operations.find(o => o.id === selectedOperationId);

        if (op) {
            const input: ProfitCalculationInput = {
                netRevenue: fat,
                adCost: ads,
                gatewayFee: taxa
            };

            const result = calculateProfitDistribution(input, op);

            setLucroLiquido(result.netProfit);

            // Map dynamic results back to fixed fields for compatibility
            // Ideally we should migrate the database to store a 'partners' array instead of fixed columns
            const cabralProfit = result.partnerProfits.find(p => p.name.toLowerCase().includes('cabral'));
            const bielProfit = result.partnerProfits.find(p => p.name.toLowerCase().includes('biel'));
            const soaresProfit = result.partnerProfits.find(p => p.name.toLowerCase().includes('soares'));

            setValCabral(cabralProfit?.value || 0);
            setValBiel(bielProfit?.value || 0);
            setValSoares(soaresProfit?.value || 0);

            // Total Cabral includes reimbursement if applicable
            setTotalCabral(cabralProfit?.total || 0);

        } else {
            // Fallback to legacy calculation (manual percentages)
            const pCabral = parseFloat(percCabral) || 0;
            const pBiel = parseFloat(percBiel) || 0;
            const pSoares = parseFloat(percSoares) || 0;

            const lucro = fat - ads - taxa;
            setLucroLiquido(lucro);

            const vCabral = lucro * (pCabral / 100);
            const vBiel = lucro * (pBiel / 100);
            const vSoares = lucro * (pSoares / 100);

            setValCabral(vCabral);
            setValBiel(vBiel);
            setValSoares(vSoares);
            setTotalCabral(vCabral + ads); // Legacy assumption: Cabral pays ads
        }

    }, [faturamento, gastoAnuncio, taxaGateway, percCabral, percBiel, percSoares, selectedOperationId, operations]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onSave({
            operationId: selectedOperationId,
            data: Timestamp.fromDate(date),
            descricao,
            faturamentoLiquido: parseFloat(faturamento.replace(',', '.')) || 0,
            gastoAnuncio: parseFloat(gastoAnuncio.replace(',', '.')) || 0,
            taxaGateway: parseFloat(taxaGateway.replace(',', '.')) || 0,
            lucroLiquido,
            percentualCabral: parseFloat(percCabral) || 0,
            percentualBiel: parseFloat(percBiel) || 0,
            percentualSoares: parseFloat(percSoares) || 0,
            valorCabral: valCabral,
            valorBiel: valBiel,
            valorSoares: valSoares,
            totalCabral,
        });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6 p-6">
            <div className="flex-1 space-y-4">

                <div className="space-y-2">
                    <Label>Operação</Label>
                    <Select value={selectedOperationId} onValueChange={setSelectedOperationId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione a operação..." />
                        </SelectTrigger>
                        <SelectContent>
                            {operations.map(op => (
                                <SelectItem key={op.id} value={op.id}>
                                    {op.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Data da Operação</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input
                        id="descricao"
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        placeholder="Ex: Venda 21/11"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="faturamento">Faturamento (R$)</Label>
                        <Input
                            id="faturamento"
                            type="number"
                            step="0.01"
                            value={faturamento}
                            onChange={(e) => setFaturamento(e.target.value)}
                            placeholder="0,00"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gastoAnuncio">Gasto Anúncios (R$)</Label>
                        <Input
                            id="gastoAnuncio"
                            type="number"
                            step="0.01"
                            value={gastoAnuncio}
                            onChange={(e) => setGastoAnuncio(e.target.value)}
                            placeholder="0,00"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="taxaGateway">Taxa de Saque (R$)</Label>
                    <Input
                        id="taxaGateway"
                        type="number"
                        step="0.01"
                        value={taxaGateway}
                        onChange={(e) => setTaxaGateway(e.target.value)}
                        placeholder="4,00"
                    />
                </div>

                <div className="pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        className="p-0 h-auto text-sm text-muted-foreground hover:text-white flex items-center gap-1"
                        onClick={() => setShowPercentages(!showPercentages)}
                    >
                        {showPercentages ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        Ver Percentuais {selectedOperationId && '(Automático)'}
                    </Button>

                    {showPercentages && (
                        <div className="grid grid-cols-3 gap-2 mt-3 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800">
                            <div className="space-y-1">
                                <Label className="text-xs">Cabral %</Label>
                                <Input
                                    type="number"
                                    value={percCabral}
                                    onChange={e => setPercCabral(e.target.value)}
                                    className="h-8"
                                    disabled={!!selectedOperationId}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Biel %</Label>
                                <Input
                                    type="number"
                                    value={percBiel}
                                    onChange={e => setPercBiel(e.target.value)}
                                    className="h-8"
                                    disabled={!!selectedOperationId}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Soares %</Label>
                                <Input
                                    type="number"
                                    value={percSoares}
                                    onChange={e => setPercSoares(e.target.value)}
                                    className="h-8"
                                    disabled={!!selectedOperationId}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full md:w-[300px]">
                <Card className="p-4 h-full bg-neutral-900 border-neutral-800 flex flex-col justify-between">
                    <div>
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Calculator className="w-4 h-4" />
                            Divisão de Lucro
                        </h4>

                        <div className={`p-3 rounded-lg mb-4 ${lucroLiquido >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            <div className="text-xs opacity-80 mb-1">Lucro Líquido:</div>
                            <div className="text-xl font-bold">{formatCurrency(lucroLiquido)}</div>
                        </div>

                        {lucroLiquido < 0 && (
                            <div className="text-xs text-red-400 mb-4 flex items-center gap-1">
                                ⚠️ Atenção: lucro líquido negativo.
                            </div>
                        )}

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cabral:</span>
                                <span>{formatCurrency(valCabral)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Biel:</span>
                                <span>{formatCurrency(valBiel)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Soares:</span>
                                <span>{formatCurrency(valSoares)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-neutral-800">
                        <div className="text-sm text-muted-foreground mb-1">Total a Receber (Cabral):</div>
                        <div className="text-2xl font-bold text-blue-400">{formatCurrency(totalCabral)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            (Lucro + Reembolso Anúncios)
                        </div>
                    </div>
                </Card>
            </div>

            <div className="md:hidden flex gap-2 pt-4 border-t border-neutral-800">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
                <Button type="submit" className="flex-1">Salvar Lançamento</Button>
            </div>

            <div className="hidden md:flex absolute bottom-6 right-6 gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Salvar Lançamento</Button>
            </div>
        </form>
    );
}
