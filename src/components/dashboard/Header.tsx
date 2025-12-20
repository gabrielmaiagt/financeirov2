'use client';
import { useFirestore } from '@/firebase';
import { useOrganization } from '@/contexts/OrganizationContext';
import NotificationBell from './NotificationBell';
import GoalWidget from './GoalWidget';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings, Users, Palette, LayoutDashboard, ShieldAlert, Wallet } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { OperationSelector } from '@/components/OperationSelector';
import { cn } from '@/lib/utils';

const Header = () => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();

  return (
    <header className="sticky top-0 z-50 w-full h-16 border-b border-white/5 bg-neutral-950/60 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between gap-4 transition-all duration-300">

      {/* Brand Section (Left) */}
      <div className="flex-1 flex items-center justify-start min-w-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-xl shrink-0">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div className="hidden md:flex flex-col min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight truncate">
              Painel Financeiro
            </h1>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate">
              V 2.0
            </span>
          </div>
        </div>
      </div>

      {/* Centered Goal Widget (Middle) */}
      {/* Visible on lg+ screens, taking priority over avatars */}
      <div className="hidden lg:flex items-center justify-center shrink-0 mx-4">
        <GoalWidget variant="header" />
      </div>

      {/* Right Section: Controls & Team (Right) */}
      <div className="flex-1 flex items-center justify-end gap-2 md:gap-4 min-w-0">

        {/* Controls */}
        <div className="flex items-center gap-1 md:gap-2">
          <div>
            <OperationSelector className="w-auto" />
          </div>

          <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5 shrink-0">
            <ThemeSwitcher />
            <div className="w-px h-4 bg-white/10 mx-0.5" />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/5 transition-colors" title="Menu Administrativo">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-neutral-900 border-neutral-800">
                <DropdownMenuLabel>Administração</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Painel Admin</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/team" className="flex items-center cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Gerenciar Equipe</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center cursor-pointer">
                    <Palette className="mr-2 h-4 w-4" />
                    <span>Personalização</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/super" className="flex items-center cursor-pointer text-muted-foreground hover:text-foreground">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    <span>Super Admin</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
