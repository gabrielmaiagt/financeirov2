'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { Meta } from './GoalsBoard';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  currentValue: z.number({ invalid_type_error: 'Valor inválido' }).min(0, 'O valor inicial deve ser no mínimo 0.'),
  targetValue: z.number({ invalid_type_error: 'Valor inválido' }).min(1, 'O alvo deve ser maior que 0.'),
  unit: z.string().optional(),
  sourceType: z.enum(['manual', 'webhooks', 'transactions']).default('manual'),
  webhookGateway: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface GoalFormProps {
  onSave: (data: any) => void;
  onClose: () => void;
  existingGoal: Omit<Meta, 'id'> | null;
}

const GoalForm = ({ onSave, onClose, existingGoal }: GoalFormProps) => {
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingGoal ? {
      ...existingGoal,
      sourceType: existingGoal.sourceType || 'manual',
      webhookGateway: existingGoal.webhookGateway || 'all',
    } : {
      title: '',
      currentValue: 0,
      targetValue: 10000,
      unit: 'R$',
      sourceType: 'manual',
      webhookGateway: 'all',
    },
  });

  const sourceType = watch('sourceType');

  // Reset currentValue to 0 if switching to automated types (optional behavior, keeping implementation simple for now)

  const onSubmit = (data: FormData) => {
    onSave({
      ...data,
      completed: data.currentValue >= data.targetValue,
    });
    reset();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nome da Meta</Label>
            <Controller name="title" control={control} render={({ field }) => <Input id="title" placeholder="Ex: Placa de 10k" {...field} />} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Fonte de Dados</Label>
            <Controller
              name="sourceType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="webhooks">Vendas (Webhooks)</SelectItem>
                    <SelectItem value="transactions">Lançamentos (Operações)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {sourceType === 'webhooks' && (
            <div className="space-y-2">
              <Label>Gateway (Opcional)</Label>
              <Controller
                name="webhookGateway"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'all'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="buckpay">Buckpay</SelectItem>
                      <SelectItem value="frendz">Frendz</SelectItem>
                      <SelectItem value="perfectpay">PerfectPay</SelectItem>
                      <SelectItem value="ggcheckout">GGCheckout</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">Somar apenas vendas aprovadas deste gateway.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentValue">Valor Atual</Label>
              <Controller
                name="currentValue"
                control={control}
                render={({ field }) => (
                  <Input
                    id="currentValue"
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                    disabled={sourceType !== 'manual'}
                    className={sourceType !== 'manual' ? 'bg-muted' : ''}
                  />
                )}
              />
              {sourceType !== 'manual' && <p className="text-xs text-muted-foreground">Calculado automaticamente</p>}
              {errors.currentValue && <p className="text-sm text-red-500">{errors.currentValue.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetValue">Valor Alvo</Label>
              <Controller
                name="targetValue"
                control={control}
                render={({ field }) => <Input id="targetValue" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />}
              />
              {errors.targetValue && <p className="text-sm text-red-500">{errors.targetValue.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unidade (opcional)</Label>
            <Controller
              name="unit"
              control={control}
              render={({ field }) => <Input id="unit" placeholder="Ex: R$, dias, unidades" {...field} value={field.value ?? ''} />}
            />
            {errors.unit && <p className="text-sm text-red-500">{errors.unit.message}</p>}
          </div>
        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit">{existingGoal ? 'Atualizar Meta' : 'Salvar Meta'}</Button>
      </DialogFooter>
    </form>
  );
};

export default GoalForm;
