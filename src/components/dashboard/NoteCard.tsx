'use client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Anotacao {
  id: string;
  title: string;
  content: string;
  createdAt: {
    toDate: () => Date;
  };
}

interface NoteCardProps {
  note: Anotacao;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

const NoteCard = ({ note, onEdit, onDelete }: NoteCardProps) => {
  return (
    <Card className="border-neutral-800 bg-transparent h-full flex flex-col">
      <CardHeader className="flex-row justify-between items-start">
        <CardTitle className="text-lg">{note.title}</CardTitle>
        <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onEdit}>
                <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => onDelete(note.id)}>
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow whitespace-pre-wrap text-sm text-muted-foreground break-words">
        {note.content}
      </CardContent>
      <CardFooter className="text-xs text-neutral-500">
        Criado em {format(note.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </CardFooter>
    </Card>
  );
};

export default NoteCard;
