'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Assignee, Urgency, Task } from './TasksBoard';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  description: z.string().optional(),
  assignee: z.enum(['Cabral', 'Biel', 'Soares', 'Geral'], { required_error: 'Selecione um responsável.' }),
  urgency: z.enum(['Baixa', 'Média', 'Alta', 'Crítica'], { required_error: 'Defina a urgência.' }),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TaskFormProps {
  onSave: (data: Omit<FormData, 'id' | 'status' | 'order' | 'oculta'>) => void;
  onClose: () => void;
  existingTask: Omit<Task, 'id' | 'status' | 'order' | 'oculta'> | null;
}

const TaskForm = ({ onSave, onClose, existingTask }: TaskFormProps) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        title: '',
        description: '',
        assignee: undefined,
        urgency: 'Média',
        dueDate: '',
    }
  });

  useEffect(() => {
    if (existingTask) {
      reset({
        ...existingTask,
        description: existingTask.description || '',
        dueDate: existingTask.dueDate || '',
      });
    } else {
      reset({
        title: '',
        description: '',
        assignee: undefined,
        urgency: 'Média',
        dueDate: '',
      });
    }
  }, [existingTask, reset]);

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
            <Label htmlFor="title">Título da Tarefa</Label>
            <Controller name="title" control={control} render={({ field }) => <Input id="title" {...field} />} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Controller name="description" control={control} render={({ field }) => <Textarea id="description" placeholder="Adicione mais detalhes sobre a tarefa..." {...field} value={field.value ?? ''} />} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Responsável</Label>
              <Controller
                name="assignee"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cabral">Cabral</SelectItem>
                      <SelectItem value="Biel">Biel</SelectItem>
                      <SelectItem value="Soares">Soares</SelectItem>
                      <SelectItem value="Geral">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assignee && <p className="text-sm text-red-500">{errors.assignee.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgência</Label>
              <Controller
                name="urgency"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Defina a urgência" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Crítica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.urgency && <p className="text-sm text-red-500">{errors.urgency.message}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dueDate">Data de Entrega</Label>
            <Controller name="dueDate" control={control} render={({ field }) => <Input id="dueDate" type="date" {...field} value={field.value ?? ''} />} />
          </div>

        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit">{existingTask ? 'Atualizar Tarefa' : 'Salvar Tarefa'}</Button>
      </DialogFooter>
    </form>
  );
};

export default TaskForm;
