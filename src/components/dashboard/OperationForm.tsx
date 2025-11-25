'use client';

import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { Operacao } from '@/app/page';

const formSchema = z.object({
  data: z.date({ required_error: 'A data é obrigatória.' }),
  descricao: z.string().min(1, 'A descrição é obrigatória.'),
  faturamentoLiquido: z.number({ invalid_type_error: 'Valor inválido' }).min(0, 'Valor não pode ser negativo.'),
  gastoAnuncio: z.number({ invalid_type_error: 'Valor inválido' }).min(0, 'Valor não pode ser negativo.'),
  taxaGateway: z.number({ invalid_type_error: 'Valor inválido' }).min(0, 'Valor não pode ser negativo.'),
  percentualCabral: z.number().min(0).max(100),
  percentualBiel: z.number().min(0).max(100),
  percentualSoares: z.number().min(0).max(100),
});

type FormData = z.infer<typeof formSchema>;

interface OperationFormProps {
  onSave: (data: any) => void;
  onClose: () => void;
  existingOperation: Operacao | null;
}

const formatCurrency = (value: number) => {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const OperationForm = ({ onSave, onClose, existingOperation }: OperationFormProps) => {
  const { toast } = useToast();
  
  const defaultValues = useMemo(() => {
    if (existingOperation) {
      return {
        ...existingOperation,
        data: existingOperation.data.toDate(),
      };
    }
    return {
      data: new Date(),
      descricao: '',
      faturamentoLiquido: 0,
      gastoAnuncio: 0,
      taxaGateway: 4.0,
      percentualCabral: 65,
      percentualBiel: 25,
      percentualSoares: 10,
    };
  }, [existingOperation]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const [faturamentoLiquido, gastoAnuncio, taxaGateway, percentualCabral, percentualBiel, percentualSoares] = watch([
    'faturamentoLiquido',
    'gastoAnuncio',
    'taxaGateway',
    'percentualCabral',
    'percentualBiel',
    'percentualSoares',
  ]);

  const calculations = useMemo(() => {
    const fl = Number(faturamentoLiquido) || 0;
    const ga = Number(gastoAnuncio) || 0;
    const tg = Number(taxaGateway) || 0;

    const lucroLiquido = fl - ga - tg;
    const pCabral = Number(percentualCabral) / 100;
    const pBiel = Number(percentualBiel) / 100;
    const pSoares = Number(percentualSoares) / 100;

    const valorCabral = lucroLiquido * pCabral;
    const valorBiel = lucroLiquido * pBiel;
    const valorSoares = lucroLiquido * pSoares;
    const totalCabral = ga + valorCabral;

    return {
      lucroLiquido,
      valorCabral,
      valorBiel,
      valorSoares,
      totalCabral,
    };
  }, [faturamentoLiquido, gastoAnuncio, taxaGateway, percentualCabral, percentualBiel, percentualSoares]);

  const onSubmit = (data: FormData) => {
    if (!calculations) return;
    const operationData = {
      ...data,
      data: Timestamp.fromDate(data.data),
      faturamentoLiquido: Number(data.faturamentoLiquido.toFixed(2)),
      gastoAnuncio: Number(data.gastoAnuncio.toFixed(2)),
      taxaGateway: Number(data.taxaGateway.toFixed(2)),
      lucroLiquido: Number(calculations.lucroLiquido.toFixed(2)),
      valorCabral: Number(calculations.valorCabral.toFixed(2)),
      valorBiel: Number(calculations.valorBiel.toFixed(2)),
      valorSoares: Number(calculations.valorSoares.toFixed(2)),
      totalCabral: Number(calculations.totalCabral.toFixed(2)),
    };
    onSave(operationData);
    toast({
      title: "Sucesso!",
      description: `Lançamento ${existingOperation ? 'atualizado' : 'salvo'} com sucesso.`,
    });
    reset();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna da Esquerda - Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data da Operação</Label>
              <Controller
                name="data"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.data && <p className="text-sm text-red-500">{errors.data.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Controller
                name="descricao"
                control={control}
                render={({ field }) => <Input id="descricao" placeholder="Ex: Madames Online - BM 01 - 21/11" {...field} />}
              />
              {errors.descricao && <p className="text-sm text-red-500">{errors.descricao.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faturamentoLiquido">Faturamento (R$)</Label>
                <Controller
                  name="faturamentoLiquido"
                  control={control}
                  render={({ field }) => <Input id="faturamentoLiquido" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />}
                />
                {errors.faturamentoLiquido && <p className="text-sm text-red-500">{errors.faturamentoLiquido.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gastoAnuncio">Gasto Anúncios (R$)</Label>
                <Controller
                  name="gastoAnuncio"
                  control={control}
                  render={({ field }) => <Input id="gastoAnuncio" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />}
                />
                {errors.gastoAnuncio && <p className="text-sm text-red-500">{errors.gastoAnuncio.message}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taxaGateway">Taxa de Saque (R$)</Label>
              <Controller
                name="taxaGateway"
                control={control}
                render={({ field }) => <Input id="taxaGateway" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))}/>}
              />
              {errors.taxaGateway && <p className="text-sm text-red-500">{errors.taxaGateway.message}</p>}
            </div>

            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">Ajustar Percentuais</summary>
              <div className="grid grid-cols-3 gap-4 mt-2 p-4 border rounded-md">
                <div className="space-y-2">
                  <Label htmlFor="percentualCabral">Cabral (%)</Label>
                  <Controller name="percentualCabral" control={control} render={({ field }) => <Input id="percentualCabral" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} />} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentualBiel">Biel (%)</Label>                
                  <Controller name="percentualBiel" control={control} render={({ field }) => <Input id="percentualBiel" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} />} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentualSoares">Soares (%)</Label>
                  <Controller name="percentualSoares" control={control} render={({ field }) => <Input id="percentualSoares" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} />} />
                </div>
              </div>
            </details>
          </div>

          {/* Coluna da Direita - Cálculos */}
          <div className="h-full flex flex-col">
            <Card className="bg-white/5 flex-grow flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">Divisão de Lucro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 flex-grow flex flex-col justify-between">
                <div>
                  <div className={`flex justify-between items-center p-2 rounded-md ${calculations.lucroLiquido < 0 ? 'bg-red-900/30' : 'bg-green-900/30'}`}>
                    <span className="font-semibold">Lucro Líquido:</span>
                    <span className={`font-bold ${calculations.lucroLiquido < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {formatCurrency(calculations.lucroLiquido)}
                    </span>
                  </div>
                  {calculations.lucroLiquido < 0 && (
                      <div className="flex items-center text-red-400 text-xs p-2">
                          <AlertCircle className="h-4 w-4 mr-2"/>
                          Atenção: lucro líquido negativo.
                      </div>
                  )}
                  <div className="flex justify-between mt-4 text-sm">
                    <span>Cabral ({percentualCabral}%):</span>
                    <span>{formatCurrency(calculations.valorCabral)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Biel ({percentualBiel}%):</span>
                    <span>{formatCurrency(calculations.valorBiel)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Soares ({percentualSoares}%):</span>
                    <span>{formatCurrency(calculations.valorSoares)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between font-bold text-lg pt-4 border-t mt-4 border-dashed">
                  <span>Total a Receber (Cabral):</span>
                  <span className="text-blue-400">{formatCurrency(calculations.totalCabral)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        </DialogClose>
        <Button type="submit">
          {existingOperation ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default OperationForm;
