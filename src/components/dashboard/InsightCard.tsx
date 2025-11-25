'use client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';

export interface Insight {
  id: string;
  title: string;
  content?: string;
  imageUrl?: string;
  createdAt: Timestamp;
}

interface InsightCardProps {
  insight: Insight;
  onEdit: () => void;
  onDelete: () => void;
}

const InsightCard = ({ insight, onEdit, onDelete }: InsightCardProps) => {
  return (
    <Card className="border-neutral-800 bg-transparent h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{insight.title}</CardTitle>
            <div className="flex gap-1">
                 <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onEdit}>
                    <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={onDelete}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {insight.imageUrl && (
            <div className="relative w-full aspect-video rounded-md overflow-hidden">
                <Image src={insight.imageUrl} alt={insight.title} layout="fill" objectFit="cover" />
            </div>
        )}
        {insight.content && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {insight.content}
            </p>
        )}
      </CardContent>
      <CardFooter className="text-xs text-neutral-500">
        Criado em {format(insight.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </CardFooter>
    </Card>
  );
};

export default InsightCard;
