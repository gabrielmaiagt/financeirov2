'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, X } from 'lucide-react';
import Image from 'next/image';
import type { UserProfile } from './ProfileCard';

async function uploadImage(file: File): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const formSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  role: z.string().min(1, 'O cargo é obrigatório.'),
  photoUrl: z.string().url('Por favor, insira uma URL válida.').or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface ProfileFormProps {
  onSave: (data: Omit<UserProfile, 'id'>) => void;
  onClose: () => void;
  existingProfile: UserProfile | null;
}

const ProfileForm = ({ onSave, onClose, existingProfile }: ProfileFormProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingProfile || {
      name: '',
      role: '',
      photoUrl: ''
    }
  });
  
  const photoUrl = watch('photoUrl');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const url = await uploadImage(file);
        setValue('photoUrl', url, { shouldValidate: true });
      } catch (error) {
        console.error('Falha no upload da imagem:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const onSubmit = (data: FormData) => {
    onSave(data);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          
          <div className="space-y-2">
            <Label>Foto do Perfil</Label>
            {photoUrl && !isUploading && (
                <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-primary">
                    <Image src={photoUrl} alt="Preview do Perfil" layout="fill" objectFit="cover" />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute bottom-1 right-1 w-6 h-6 rounded-full"
                        onClick={() => setValue('photoUrl', '', { shouldValidate: true })}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}
            {isUploading && <div className="w-32 h-32 mx-auto flex items-center justify-center text-sm text-muted-foreground bg-neutral-900 rounded-full"><Loader2 className="w-8 h-8 animate-spin" /></div>}

            <Input id="image" type="file" onChange={handleImageUpload} disabled={isUploading} accept="image/*" />
            <Controller name="photoUrl" control={control} render={({ field }) => <Input id="photoUrl" type="hidden" {...field} value={field.value ?? ''} />} />

          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Controller name="name" control={control} render={({ field }) => <Input id="name" {...field} />} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Controller name="role" control={control} render={({ field }) => <Input id="role" {...field} />} />
            {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
          </div>

        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit" disabled={isUploading}>
          {isUploading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default ProfileForm;
