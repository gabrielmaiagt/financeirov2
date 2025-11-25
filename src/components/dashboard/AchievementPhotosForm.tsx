'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, X, ImagePlus, User } from 'lucide-react';
import Image from 'next/image';

async function uploadImage(file: File): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface AchievementPhotosFormProps {
  onSave: (urls: string[]) => void;
  onClose: () => void;
  existingImageUrls: string[];
}

const partnerNames = ['Cabral', 'Biel', 'Soares'];
const MAX_PHOTOS = 3;

const AchievementPhotosForm = ({ onSave, onClose, existingImageUrls }: AchievementPhotosFormProps) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean[]>([false, false, false]);

  useEffect(() => {
    // Pad the existing URLs array to always have 3 elements
    const paddedUrls = new Array(MAX_PHOTOS).fill('');
    existingImageUrls.forEach((url, index) => {
        if(index < MAX_PHOTOS) paddedUrls[index] = url;
    });
    setImageUrls(paddedUrls);
  }, [existingImageUrls]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploading(prev => {
        const newUploading = [...prev];
        newUploading[index] = true;
        return newUploading;
      });

      try {
        const url = await uploadImage(file);
        setImageUrls(prev => {
            const newUrls = [...prev];
            newUrls[index] = url;
            return newUrls;
        });
      } catch (error) {
        console.error('Falha no upload da imagem:', error);
      } finally {
        setUploading(prev => {
            const newUploading = [...prev];
            newUploading[index] = false;
            return newUploading;
        });
      }
    }
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => {
        const newUrls = [...prev];
        newUrls[index] = '';
        return newUrls;
    });
  }

  const onSubmit = () => {
    const finalUrls = imageUrls.filter(url => url); // Remove empty strings
    onSave(finalUrls);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: MAX_PHOTOS }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Label className="flex items-center gap-2 font-semibold">
                <User className="w-4 h-4" /> Sócio: {partnerNames[index]}
              </Label>
              <div className="relative w-full aspect-square border-2 border-dashed border-neutral-700 rounded-lg flex items-center justify-center bg-neutral-900/50">
                {uploading[index] && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg z-10">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-sm mt-2">Carregando...</p>
                    </div>
                )}
                {imageUrls[index] ? (
                  <>
                    <Image src={imageUrls[index]} alt={`Foto de ${partnerNames[index]}`} layout="fill" objectFit="cover" className="rounded-lg" />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 w-7 h-7 z-20"
                        onClick={() => removeImage(index)}
                        disabled={uploading[index]}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                    <div className="text-center text-neutral-500">
                        <ImagePlus className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-xs">Adicionar foto</p>
                    </div>
                )}
                 <Input 
                    id={`photo-${index}`} 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0" 
                    onChange={(e) => handleImageUpload(e, index)}
                    accept="image/*"
                    disabled={uploading[index]}
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-4 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="button" onClick={onSubmit} disabled={uploading.some(u => u)}>
          {uploading.some(u => u) ? 'Salvando...' : 'Salvar Fotos'}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default AchievementPhotosForm;
