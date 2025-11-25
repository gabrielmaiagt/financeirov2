'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, KeyRound, User, Copy, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export interface Login {
  id: string;
  title: string;
  websiteUrl?: string;
  username: string;
  password?: string;
  createdAt: Timestamp;
}

interface LoginCardProps {
  login: Login;
  onEdit: () => void;
  onDelete: () => void;
}

const LoginCard = ({ login, onEdit, onDelete }: LoginCardProps) => {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = (text: string | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${fieldName} copiado para a área de transferência.`,
    });
  };

  return (
    <Card className="border-neutral-800 bg-transparent h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                {login.title}
            </CardTitle>
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
        <div className="space-y-2">
            <Label htmlFor={`username-${login.id}`} className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Usuário/Email</Label>
            <div className="flex items-center gap-2">
                <Input id={`username-${login.id}`} value={login.username} readOnly className="bg-neutral-900"/>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(login.username, 'Usuário')}>
                    <Copy className="w-4 h-4" />
                </Button>
            </div>
        </div>
        {login.password && (
            <div className="space-y-2">
                <Label htmlFor={`password-${login.id}`} className="text-xs text-muted-foreground flex items-center gap-1"><KeyRound className="w-3 h-3" /> Senha</Label>
                <div className="flex items-center gap-2">
                    <Input id={`password-${login.id}`} type={showPassword ? 'text' : 'password'} value={login.password} readOnly className="bg-neutral-900"/>
                    <Button variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(login.password, 'Senha')}>
                        <Copy className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
      {login.websiteUrl && (
        <CardFooter>
            <Button variant="link" asChild className="p-0 h-auto">
                <a href={login.websiteUrl} target="_blank" rel="noopener noreferrer">
                    Acessar site <ExternalLink className="w-4 h-4 ml-2" />
                </a>
            </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default LoginCard;
