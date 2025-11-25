'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Timestamp } from 'firebase/firestore';
import type { Login } from './LoginCard';

const formSchema = z.object({
  title: z.string().min(1, 'O nome do serviço é obrigatório.'),
  websiteUrl: z.string().url({ message: 'URL inválida.' }).optional().or(z.literal('')),
  username: z.string().min(1, 'O usuário ou email é obrigatório.'),
  password: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface LoginFormProps {
  onSave: (data: any) => void;
  onClose: () => void;
  existingLogin: Login | null;
}

const LoginForm = ({ onSave, onClose, existingLogin }: LoginFormProps) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingLogin || {
      title: '',
      websiteUrl: '',
      username: '',
      password: '',
    },
  });

  const onSubmit = (data: FormData) => {
    const finalData = {
      ...data,
      createdAt: existingLogin?.createdAt || Timestamp.now(),
    };
    onSave(finalData);
    reset();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nome do Serviço</Label>
            <Controller name="title" control={control} render={({ field }) => <Input id="title" placeholder="Ex: provedor de email, plataforma X" {...field} />} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">URL do Site (Opcional)</Label>
            <Controller name="websiteUrl" control={control} render={({ field }) => <Input id="websiteUrl" placeholder="https://..." {...field} />} />
            {errors.websiteUrl && <p className="text-sm text-red-500">{errors.websiteUrl.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Usuário ou Email</Label>
            <Controller name="username" control={control} render={({ field }) => <Input id="username" {...field} />} />
            {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha (Opcional)</Label>
            <Controller name="password" control={control} render={({ field }) => <Input id="password" type="password" {...field} />} />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>

        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit">{existingLogin ? 'Atualizar Login' : 'Salvar Login'}</Button>
      </DialogFooter>
    </form>
  );
};

export default LoginForm;
