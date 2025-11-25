'use client';
import { useState, useEffect } from 'react';
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
import { Loader2, X } from 'lucide-react';
import Image from 'next/image';
import type { Insight } from './InsightCard';

// This would typically come from a service, but is mocked here
async function uploadImage(file: File): Promise<string> {
  // Simulate a 2-second upload
  await new Promise(resolve => setTimeout(resolve, 2000));
  // In a real app, this would upload to Firebase Storage and return the URL
  // For now, we'll use a placeholder service
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const formSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface InsightFormProps {
  onSave: (data: any) => void;
  onClose: () => void;
  existingInsight: Insight | null;
}

const InsightForm = ({ onSave, onClose, existingInsight }: InsightFormProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingInsight ? {
        title: existingInsight.title,
        content: existingInsight.content || '',
        imageUrl: existingInsight.imageUrl || '',
    } : {
      title: '',
      content: '',
      imageUrl: '',
    },
  });

  const imageUrl = watch('imageUrl');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const url = await uploadImage(file);
        setValue('imageUrl', url, { shouldValidate: true });
      } catch (error) {
        console.error('Falha no upload da imagem:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const onSubmit = (data: FormData) => {
    const finalData = {
        ...data,
        createdAt: existingInsight?.createdAt ? existingInsight.createdAt : Timestamp.now(),
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
            <Label htmlFor="title">Título do Insight</Label>
            <Controller name="title" control={control} render={({ field }) => <Input id="title" {...field} />} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Descrição (Opcional)</Label>
            <Controller
              name="content"
              control={control}
              render={({ field }) => <Textarea id="content" {...field} value={field.value ?? ''} rows={6} placeholder="Descreva sua ideia ou aprendizado..."/>}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Imagem do Insight (Opcional)</Label>
            <Input id="image" type="file" onChange={handleImageUpload} disabled={isUploading} accept="image/*" />
            {isUploading && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Carregando imagem...</div>}
          </div>

          {imageUrl && !isUploading && (
            <div className="relative w-full h-48 rounded-md overflow-hidden border border-neutral-700">
                <Image src={imageUrl} alt="Preview do Insight" fill objectFit="cover" />
                 <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 w-6 h-6"
                    onClick={() => setValue('imageUrl', '', { shouldValidate: true })}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
          )}

        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit" disabled={isUploading}>
          {isUploading ? 'Salvando...' : (existingInsight ? 'Atualizar Insight' : 'Salvar Insight')}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default InsightForm;
