'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Timestamp } from 'firebase/firestore';
import type { Anotacao } from './NoteCard';

const formSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  content: z.string().min(1, 'O conteúdo não pode estar vazio.'),
});

type FormData = z.infer<typeof formSchema>;

interface NoteFormProps {
  onSave: (data: any) => void;
  onClose: () => void;
  existingNote: Omit<Anotacao, 'id'> | null;
}

const NoteForm = ({ onSave, onClose, existingNote }: NoteFormProps) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingNote || {
      title: '',
      content: '',
    },
  });

  useEffect(() => {
    if (existingNote) {
      reset(existingNote);
    } else {
      reset({
        title: '',
        content: '',
      });
    }
  }, [existingNote, reset]);

  const onSubmit = (data: FormData) => {
    onSave({
      ...data,
      createdAt: existingNote?.createdAt || Timestamp.now(),
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Controller name="title" control={control} render={({ field }) => <Input id="title" {...field} />} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Anotação</Label>
            <Controller
              name="content"
              control={control}
              render={({ field }) => <Textarea id="content" {...field} rows={10} />}
            />
            {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
          </div>
        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit">{existingNote ? 'Salvar Alterações' : 'Salvar Anotação'}</Button>
      </DialogFooter>
    </form>
  );
};

export default NoteForm;
