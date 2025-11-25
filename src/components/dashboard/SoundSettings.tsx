'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlayCircle } from 'lucide-react';
import type { UserProfile } from './ProfileCard';
import { useSound } from '@/hooks/use-sound';

const urlOrEmpty = z.string().url({ message: 'URL inválida.' }).optional().or(z.literal(''));

const formSchema = z.object({
  goalCompleted: urlOrEmpty,
  taskCompleted: urlOrEmpty,
  recordBroken: urlOrEmpty,
});

type FormData = z.infer<typeof formSchema>;

interface SoundSettingsProps {
  onSave: (data: FormData) => void;
  onClose: () => void;
  existingProfile: UserProfile | null;
}

const SoundSettings = ({ onSave, onClose, existingProfile }: SoundSettingsProps) => {
  const { play } = useSound();
  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goalCompleted: existingProfile?.sounds?.goalCompleted || '',
      taskCompleted: existingProfile?.sounds?.taskCompleted || '',
      recordBroken: existingProfile?.sounds?.recordBroken || '',
    },
  });
  
  const watchedUrls = watch();

  const onSubmit = (data: FormData) => {
    onSave(data);
    onClose();
  };
  
  const playSound = (url?: string) => {
    if (url) {
      play(url);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          
          <div className="space-y-2">
            <Label htmlFor="goalCompleted">Som de Meta Concluída</Label>
            <div className="flex gap-2">
                <Controller name="goalCompleted" control={control} render={({ field }) => <Input id="goalCompleted" placeholder="https://example.com/sound.mp3" {...field} />} />
                <Button type="button" variant="outline" size="icon" onClick={() => playSound(watchedUrls.goalCompleted)} disabled={!watchedUrls.goalCompleted}>
                    <PlayCircle className="w-4 h-4" />
                </Button>
            </div>
            {errors.goalCompleted && <p className="text-sm text-red-500">{errors.goalCompleted.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="taskCompleted">Som de Tarefa Concluída</Label>
            <div className="flex gap-2">
                <Controller name="taskCompleted" control={control} render={({ field }) => <Input id="taskCompleted" placeholder="https://example.com/sound.mp3" {...field} />} />
                <Button type="button" variant="outline" size="icon" onClick={() => playSound(watchedUrls.taskCompleted)} disabled={!watchedUrls.taskCompleted}>
                    <PlayCircle className="w-4 h-4" />
                </Button>
            </div>
            {errors.taskCompleted && <p className="text-sm text-red-500">{errors.taskCompleted.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recordBroken">Som de Recorde Quebrado</Label>
            <div className="flex gap-2">
                <Controller name="recordBroken" control={control} render={({ field }) => <Input id="recordBroken" placeholder="https://example.com/sound.mp3" {...field} />} />
                <Button type="button" variant="outline" size="icon" onClick={() => playSound(watchedUrls.recordBroken)} disabled={!watchedUrls.recordBroken}>
                    <PlayCircle className="w-4 h-4" />
                </Button>
            </div>
            {errors.recordBroken && <p className="text-sm text-red-500">{errors.recordBroken.message}</p>}
          </div>

        </div>
      </ScrollArea>
      <DialogFooter className="p-6 pt-0 sm:justify-end border-t mt-auto">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit">Salvar Sons</Button>
      </DialogFooter>
    </form>
  );
};

export default SoundSettings;
