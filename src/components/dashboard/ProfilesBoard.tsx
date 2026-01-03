'use client';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, doc, updateDoc, writeBatch, where, getDocs, setDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import ProfileCard, { UserProfile } from './ProfileCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ProfileForm from './ProfileForm';
import SoundSettings from './SoundSettings';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import NotificationButton from './NotificationButton';

interface ProfilesBoardProps {
  installable: boolean;
  handleInstall: () => void;
}

const ProfilesBoard = ({ installable, handleInstall }: ProfilesBoardProps) => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSoundDialogOpen, setIsSoundDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  const profilesQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'perfis')) : null),
    [firestore, orgId]
  );
  const { data: profiles, isLoading } = useCollection<UserProfile>(profilesQuery);

  const handleEditProfile = (profile: UserProfile) => {
    setEditingProfile(profile);
    setIsProfileDialogOpen(true);
  };

  const handleEditSounds = (profile: UserProfile) => {
    setEditingProfile(profile);
    setIsSoundDialogOpen(true);
  };

  const handleProfileDialogChange = (open: boolean) => {
    if (!open) {
      setEditingProfile(null);
    }
    setIsProfileDialogOpen(open);
  }

  const handleSoundDialogChange = (open: boolean) => {
    if (!open) {
      setEditingProfile(null);
    }
    setIsSoundDialogOpen(open);
  }

  const handleSaveProfile = async (profileData: Omit<UserProfile, 'id' | 'email'>) => {
    if (!firestore || !editingProfile) return;

    const dataToSave = {
      ...profileData,
      email: editingProfile.email,
    };

    const profileRef = doc(firestore, 'organizations', orgId, 'perfis', editingProfile.id);
    await updateDoc(profileRef, dataToSave);

    handleProfileDialogChange(false);
  };

  const handleSaveSounds = (soundData: UserProfile['sounds']) => {
    if (!firestore || !editingProfile) return;

    const profileRef = doc(firestore, 'organizations', orgId, 'perfis', editingProfile.id);
    updateDoc(profileRef, { sounds: soundData });

    handleSoundDialogChange(false)
  };

  const displayedProfiles = useMemo(() => {
    if (!profiles) return [];
    const uniqueProfiles = new Map<string, UserProfile>();
    profiles.forEach(p => {
      if (p.name && p.photoUrl && !uniqueProfiles.has(p.name)) {
        uniqueProfiles.set(p.name, p);
      }
    });
    return Array.from(uniqueProfiles.values());
  }, [profiles]);


  if (isLoading) {
    return <div>Carregando perfis...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Perfis & Configurações</h2>
        <div className="flex items-center gap-2">
          <NotificationButton />
          {installable && (
            <Button onClick={handleInstall} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Instalar App
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayedProfiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onEdit={() => handleEditProfile(profile)}
            onEditSounds={() => handleEditSounds(profile)}
          />
        ))}
      </div>

      <Dialog open={isProfileDialogOpen} onOpenChange={handleProfileDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Altere as informações do perfil. As alterações serão visíveis para todos.
            </DialogDescription>
          </DialogHeader>
          <ProfileForm
            onSave={handleSaveProfile}
            onClose={() => handleProfileDialogChange(false)}
            existingProfile={editingProfile}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isSoundDialogOpen} onOpenChange={handleSoundDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Sons de Comemoração</DialogTitle>
            <DialogDescription>
              Personalize os sons para cada evento. Cole a URL de um arquivo de áudio (.mp3, .wav).
            </DialogDescription>
          </DialogHeader>
          <SoundSettings
            onSave={handleSaveSounds}
            onClose={() => handleSoundDialogChange(false)}
            existingProfile={editingProfile}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilesBoard;
