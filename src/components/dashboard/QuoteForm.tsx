'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { FraseDoDia } from './QuoteCard';

const formSchema = z.object({
  text: z.string().min(1, 'O texto da frase é obrigatório.'),
  author: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface QuoteFormProps {
  onSave: (data: Omit<FraseDoDia, 'id'>) => void;
  onClose: () => void;
  existingQuote: FraseDoDia | null;
}

const QuoteForm = ({ onSave, onClose, existingQuote }: QuoteFormProps) => {
  const { control, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingQuote || {
      text: '',
      author: '',
    },
  });

  const onSubmit = (data: FormData) => {
    onSave(data);
    reset();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Frase</Label>
            <Controller
              name="text"
              control={control}
              render={({ field }) => <Textarea id="text" {...field} rows={4} />}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="author">Autor (Opcional)</Label>
            <Controller name="author" control={control} render={({ field }) => <Input id="author" {...field} />} />
          </div>
        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit">{existingQuote ? 'Atualizar Frase' : 'Salvar Frase'}</Button>
      </DialogFooter>
    </form>
  );
};

export default QuoteForm;
