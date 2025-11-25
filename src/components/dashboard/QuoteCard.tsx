'use client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MessageSquareQuote } from 'lucide-react';

export interface FraseDoDia {
  id: string;
  text: string;
  author?: string;
}

interface QuoteCardProps {
  quote: FraseDoDia;
  onEdit: () => void;
  onDelete: () => void;
}

const QuoteCard = ({ quote, onEdit, onDelete }: QuoteCardProps) => {
  return (
    <Card className="border-neutral-800 bg-transparent h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <MessageSquareQuote className="w-8 h-8 text-primary" />
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
        <blockquote className="text-lg italic border-l-2 border-primary pl-4">
            "{quote.text}"
        </blockquote>
      </CardContent>
      {quote.author && (
        <CardFooter className="text-sm text-neutral-500 justify-end">
          - {quote.author}
        </CardFooter>
      )}
    </Card>
  );
};

export default QuoteCard;
