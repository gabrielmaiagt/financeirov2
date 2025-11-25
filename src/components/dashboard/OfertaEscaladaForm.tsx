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
import { Timestamp } from 'firebase/firestore';

const formSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  description: z.string().optional(),
  salesPageLink: z.string().url({ message: 'URL inválida.' }).optional().or(z.literal('')),
  adLibraryLink: z.string().url({ message: 'URL inválida.' }).optional().or(z.literal('')),
}).refine(data => data.salesPageLink || data.adLibraryLink, {
    message: "É necessário preencher pelo menos um dos links (Página de Vendas ou Biblioteca de Anúncios).",
    path: ["salesPageLink"], // You can assign the error to a specific field
});


type FormData = z.infer<typeof formSchema>;

interface OfertaEscaladaFormProps {
  onSave: (data: any) => void;
  onClose: () => void;
}

const OfertaEscaladaForm = ({ onSave, onClose }: OfertaEscaladaFormProps) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      salesPageLink: '',
      adLibraryLink: '',
    },
  });

  const onSubmit = (data: FormData) => {
    onSave({
      ...data,
      createdAt: Timestamp.now(),
    });
    reset();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Oferta</Label>
            <Controller name="title" control={control} render={({ field }) => <Input id="title" {...field} />} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>
          
           <div className="space-y-2">
            <Label htmlFor="salesPageLink">Link da Página de Vendas (Opcional)</Label>
            <Controller name="salesPageLink" control={control} render={({ field }) => <Input id="salesPageLink" placeholder="https://" {...field} />} />
            {errors.salesPageLink && <p className="text-sm text-red-500">{errors.salesPageLink.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adLibraryLink">Link da Biblioteca de Anúncios (Opcional)</Label>
            <Controller name="adLibraryLink" control={control} render={({ field }) => <Input id="adLibraryLink" placeholder="https://" {...field} />} />
            {errors.adLibraryLink && <p className="text-sm text-red-500">{errors.adLibraryLink.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Textarea id="description" {...field} rows={4} placeholder="Algum detalhe importante sobre a oferta..."/>}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>
        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit">Salvar Oferta</Button>
      </DialogFooter>
    </form>
  );
};

export default OfertaEscaladaForm;
