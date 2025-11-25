'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, Music } from 'lucide-react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  photoUrl: string;
  sounds?: {
    goalCompleted?: string;
    taskCompleted?: string;
    recordBroken?: string;
  }
}

interface ProfileCardProps {
  profile: UserProfile;
  onEdit: () => void;
  onEditSounds: () => void;
}

const getInitials = (name?: string) => {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('');
};

const ProfileCard = ({ profile, onEdit, onEditSounds }: ProfileCardProps) => {
  return (
    <Card className="border-neutral-800 bg-transparent text-center h-full flex flex-col">
      <CardHeader className="items-center">
        <Avatar className="w-24 h-24 mb-4 border-2 border-primary">
          <AvatarImage src={profile.photoUrl} alt={profile.name} />
          <AvatarFallback className="text-3xl bg-neutral-700">{getInitials(profile.name)}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-xl">{profile.name}</CardTitle>
        <CardDescription>{profile.role}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Placeholder for more profile details in the future */}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button variant="outline" className="w-full" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Editar Perfil
        </Button>
        <Button variant="outline" className="w-full" onClick={onEditSounds}>
          <Music className="w-4 h-4 mr-2" />
          Configurar Sons
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProfileCard;
