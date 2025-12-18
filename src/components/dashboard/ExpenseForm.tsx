'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  data: z.date({ required_error: 'A data é obrigatória.' }),
  descricao: z.string().min(1, 'A descrição é obrigatória.'),
  valor: z.number({ invalid_type_error: 'Valor inválido' }).min(0.01, 'O valor deve ser maior que zero.'),
  categoria: z.string().min(1, 'A categoria é obrigatória.'),
});

type FormData = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  onSave: (data: Omit<FormData, 'id'>) => void;
  onClose: () => void;
}

const ExpenseForm = ({ onSave, onClose }: ExpenseFormProps) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data: new Date(),
      descricao: '',
      valor: 0,
      categoria: undefined,
    },
  });

  const onSubmit = (data: FormData) => {
    onSave({
      ...data,
      data: Timestamp.fromDate(data.data),
    } as any);
    reset();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data">Data da Despesa</Label>
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
            <Controller name="descricao" control={control} render={({ field }) => <Input id="descricao" placeholder="Ex: Assinatura Utmify" {...field} />} />
            {errors.descricao && <p className="text-sm text-red-500">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Controller
                name="valor"
                control={control}
                render={({ field }) => <Input id="valor" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />}
              />
              {errors.valor && <p className="text-sm text-red-500">{errors.valor.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Controller
                name="categoria"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ferramenta">Ferramenta</SelectItem>
                      <SelectItem value="Assinatura">Assinatura</SelectItem>
                      <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoria && <p className="text-sm text-red-500">{errors.categoria.message}</p>}
            </div>
          </div>
        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit">Salvar Despesa</Button>
      </DialogFooter>
    </form>
  );
};

export default ExpenseForm;
