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

const formSchema = z.object({
  dataLeva: z.date({ required_error: 'A data é obrigatória.' }),
  driveLink: z.string().url({ message: 'Por favor, insira uma URL válida.' }).min(1, 'O link do Drive é obrigatório.'),
});

type FormData = z.infer<typeof formSchema>;

interface CreativeFormProps {
  onSave: (data: Omit<FormData, 'id'> & { criativosValidados: [] }) => void;
  onClose: () => void;
}

const CreativeForm = ({ onSave, onClose }: CreativeFormProps) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dataLeva: new Date(),
      driveLink: '',
    },
  });

  const onSubmit = (data: FormData) => {
    onSave({
      ...data,
      criativosValidados: [] as [],
    });
    reset();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataLeva">Data da Leva</Label>
            <Controller
              name="dataLeva"
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
            {errors.dataLeva && <p className="text-sm text-red-500">{errors.dataLeva.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="driveLink">Link do Google Drive</Label>
            <Controller
              name="driveLink"
              control={control}
              render={({ field }) => <Input id="driveLink" placeholder="https://drive.google.com/..." {...field} />}
            />
            {errors.driveLink && <p className="text-sm text-red-500">{errors.driveLink.message}</p>}
          </div>
        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit">Salvar Leva</Button>
      </DialogFooter>
    </form>
  );
};

export default CreativeForm;

