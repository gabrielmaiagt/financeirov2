'use client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Trophy, ImagePlus, Camera } from 'lucide-react';
import { Meta } from './GoalsBoard';
import { Button } from '../ui/button';
import Image from 'next/image';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from "@/components/ui/carousel"
  

interface AchievementCardProps {
  achievement: Meta;
  onAddPhotos: () => void;
}

const formatValue = (value: number, unit?: string) => {
    if (unit === 'R$') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    return `${value.toLocaleString('pt-BR')} ${unit || ''}`.trim();
  };

const AchievementCard = ({ achievement, onAddPhotos }: AchievementCardProps) => {
  const hasPhotos = achievement.proofImageUrls && achievement.proofImageUrls.length > 0;
  
  return (
    <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 via-neutral-900 to-neutral-900 flex flex-col justify-between">
      <div>
        <CardHeader>
          <div className="flex justify-between items-start">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div>
              <CardTitle className="text-lg text-yellow-300 text-right">{achievement.title}</CardTitle>
              <p className="text-sm text-neutral-400 text-right">
                Meta: {formatValue(achievement.targetValue, achievement.unit)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasPhotos ? (
             <Carousel className="w-full max-w-xs mx-auto">
                <CarouselContent>
                    {achievement.proofImageUrls!.map((url, index) => (
                    <CarouselItem key={index}>
                        <div className="p-1">
                        <Card className="bg-black">
                            <CardContent className="flex aspect-square items-center justify-center p-0 rounded-md overflow-hidden">
                                <Image src={url} alt={`Prova da conquista ${achievement.title} - foto ${index + 1}`} width={300} height={300} className="object-cover w-full h-full" />
                            </CardContent>
                        </Card>
                        </div>
                    </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-900/50 min-h-[150px]">
                <Camera className="w-10 h-10 text-neutral-500 mb-2"/>
                <p className="text-sm text-neutral-500">Nenhuma foto da conquista adicionada ainda.</p>
            </div>
          )}
        </CardContent>
      </div>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={onAddPhotos}>
          <ImagePlus className="w-4 h-4 mr-2" />
          {hasPhotos ? 'Editar Fotos' : 'Adicionar Fotos'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AchievementCard;
