'use client';
import { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from './ProfileCard';
import { Skeleton } from '@/components/ui/skeleton';
import QuoteOfTheDay from './QuoteOfTheDay';
import NotificationBell from './NotificationBell';

const getInitials = (name?: string) => {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('');
};

const Header = () => {
  const firestore = useFirestore();
  const profilesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'perfis') : null),
    [firestore]
  );
  const { data: profiles, isLoading } = useCollection<UserProfile>(profilesQuery);

  // Filter out profiles that are essentially "ghosts" or incomplete.
  // Also, ensure uniqueness based on name to prevent duplicates from showing.
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

  return (
    <header className="flex items-center justify-between gap-6 mb-4 relative">
        <div className="flex gap-4 w-[196px]">
            {isLoading ? (
                <>
                    <Skeleton className="w-12 h-12 rounded-full border-2 border-primary" />
                    <Skeleton className="w-12 h-12 rounded-full border-2 border-primary" />
                    <Skeleton className="w-12 h-12 rounded-full border-2 border-primary" />
                </>
            ) : (
                displayedProfiles.map((profile) => (
                    <Avatar key={profile.id} className="w-12 h-12 border-2 border-primary">
                        <AvatarImage src={profile.photoUrl} alt={profile.name} />
                        <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                    </Avatar>
                ))
            )}
        </div>
      <div className="text-center flex-1">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight lg:text-5xl text-primary drop-shadow-lg">
          Painel Financeiro
        </h1>
        <p className="text-md md:text-lg text-muted-foreground mt-2">
          Divisão de lucro entre Cabral, Biel e Soares
        </p>
      </div>
      <div className="flex gap-2 w-[196px] justify-end items-center">
        <QuoteOfTheDay />
        <NotificationBell />
      </div>
    </header>
  );
};

export default Header;
