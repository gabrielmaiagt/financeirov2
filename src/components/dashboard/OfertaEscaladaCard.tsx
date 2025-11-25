'use client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';
import { usePrivacy } from '@/providers/PrivacyProvider';


export interface OfertaEscalada {
  id: string;
  title: string;
  description?: string;
  adLibraryLink?: string;
  salesPageLink?: string;
  createdAt: Timestamp;
}

interface OfertaEscaladaCardProps {
  oferta: OfertaEscalada;
  onDelete: (id: string) => void;
}

const LinkPreview = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
  
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
            <Button variant="link" asChild className="p-0 h-auto justify-start text-blue-400">
                <a href={href} target="_blank" rel="noopener noreferrer">
                    {children} <ExternalLink className="w-3 h-3 ml-2" />
                </a>
            </Button>
        </PopoverTrigger>
        {isOpen && (
            <PopoverContent className="w-[80vw] h-[80vh] max-w-[1200px] p-0" side="bottom" align="start">
                <iframe src={href} className="w-full h-full rounded-md" title="Link Preview" />
            </PopoverContent>
        )}
      </Popover>
    );
};

const OfertaEscaladaCard = ({ oferta, onDelete }: OfertaEscaladaCardProps) => {
    const { isBlurred } = usePrivacy();
    const sensitiveKeywords = ['Madames Online', 'Minha Coroa'];
    
    const getTitleContent = (text: string) => {
        if (isBlurred && sensitiveKeywords.some(keyword => text.includes(keyword))) {
            return <span className="sensitive-data">{text}</span>
        }
        return text;
    }

  return (
    <Card className="border-neutral-800 bg-transparent h-full flex flex-col">
      <CardHeader className="flex-row justify-between items-start">
        <CardTitle className="text-lg">{getTitleContent(oferta.title)}</CardTitle>
        <Button variant="ghost" size="icon" className="text-destructive w-8 h-8" onClick={() => onDelete(oferta.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {oferta.description && (
            <p className="text-sm text-muted-foreground">{oferta.description}</p>
        )}
        <div className="flex flex-col space-y-2">
            {oferta.salesPageLink && (
              <LinkPreview href={oferta.salesPageLink}>
                  Página de Vendas
              </LinkPreview>
            )}
            {oferta.adLibraryLink && (
                <LinkPreview href={oferta.adLibraryLink}>
                    Biblioteca de Anúncios
                </LinkPreview>
            )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-neutral-500">
        Adicionado em {format(oferta.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}
      </CardFooter>
    </Card>
  );
};

export default OfertaEscaladaCard;
