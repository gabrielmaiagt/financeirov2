'use client';
import { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { collection } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from './ProfileCard';
import { Skeleton } from '@/components/ui/skeleton';
import QuoteOfTheDay from './QuoteOfTheDay';
import NotificationBell from './NotificationBell';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import GoalWidget from './GoalWidget';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { OperationSelector } from '@/components/OperationSelector';

const getInitials = (name?: string) => {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('');
};

const Header = () => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const profilesQuery = useMemoFirebase(
    () => (firestore && orgId ? collection(firestore, 'organizations', orgId, 'perfis') : null),
    [firestore, orgId]
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
    <header className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6 mb-4 md:mb-6 relative">
      {/* Mobile Top Row: Avatars + Title + Settings (Simplified) */}
      <div className="flex md:hidden items-center justify-between w-full mb-2">
        <div className="flex -space-x-2">
          {isLoading ? (
            <>
              <Skeleton className="w-8 h-8 rounded-full border-2 border-primary" />
              <Skeleton className="w-8 h-8 rounded-full border-2 border-primary" />
            </>
          ) : (
            displayedProfiles.slice(0, 3).map((profile) => (
              <Avatar key={profile.id} className="w-8 h-8 border-2 border-primary">
                <AvatarImage src={profile.photoUrl} alt={profile.name} />
                <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
              </Avatar>
            ))
          )}
        </div>
        <div className="text-center">
          <h1 className="text-lg font-extrabold tracking-tight text-primary drop-shadow-lg">
            Painel Financeiro
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Admin">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Desktop Avatars */}
      <div className="hidden md:flex gap-2 md:gap-4 w-full md:w-[196px] justify-center md:justify-start order-2 md:order-1">
        {isLoading ? (
          <>
            <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-primary" />
            <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-primary" />
            <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-primary" />
          </>
        ) : (
          displayedProfiles.map((profile) => (
            <Avatar key={profile.id} className="w-10 h-10 md:w-12 md:h-12 border-2 border-primary">
              <AvatarImage src={profile.photoUrl} alt={profile.name} />
              <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
            </Avatar>
          ))
        )}
      </div>

      {/* Desktop Title */}
      <div className="hidden md:block text-center flex-1 order-1 md:order-2">
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight lg:text-5xl text-primary drop-shadow-lg">
          Painel Financeiro
        </h1>
        <p className="text-sm md:text-lg text-muted-foreground mt-1 md:mt-2">
          Divisão de lucro entre Cabral, Biel e Soares
        </p>
      </div>

      {/* Controls Row (Mobile & Desktop) */}
      <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center md:justify-end items-center order-3">
        <div className="hidden md:block">
          <GoalWidget />
        </div>
        <div className="h-8 w-px bg-neutral-800 mx-2 hidden md:block" />
        <div className="hidden md:block">
          <QuoteOfTheDay />
        </div>

        {/* Desktop only controls that are moved to top row on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <NotificationBell />
          <Link href="/admin">
            <Button variant="ghost" size="icon" title="Admin">
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Theme Switcher - Visible on both, full width on mobile? */}
        <div className="w-full md:w-auto flex justify-center">
          <ThemeSwitcher />
        </div>

        {/* Operation Selector - Desktop only */}
        <div className="hidden md:block">
          <OperationSelector />
        </div>
      </div>
    </header>
  );
};

export default Header;
