'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { DateRange as DayPickerDateRange } from 'react-day-picker';
import { startOfMonth, endOfDay } from 'date-fns';

import Header from '@/components/dashboard/Header';
import SummaryCards from '@/components/dashboard/SummaryCards';
import OperationsTable from '@/components/dashboard/OperationsTable';
import TasksBoard from '@/components/dashboard/TasksBoard';
import CreativesBoard from '@/components/dashboard/CreativesBoard';
import NotesBoard from '@/components/dashboard/NotesBoard';
import GoalsBoard from '@/components/dashboard/GoalsBoard';
import OfertasEscaladasBoard from '@/components/dashboard/OfertasEscaladasBoard';
import InsightsBoard from '@/components/dashboard/InsightsBoard';
import ProfilesBoard from '@/components/dashboard/ProfilesBoard';
import QuotesBoard from '@/components/dashboard/QuotesBoard';
import ExpensesBoard from '@/components/dashboard/ExpensesBoard';
import LoginsBoard from '@/components/dashboard/LoginsBoard';
import CalendarBoard from '@/components/dashboard/CalendarBoard';
import VendasBoard from '@/components/dashboard/VendasBoard';
import RecuperacaoBoard from '@/components/dashboard/RecuperacaoBoard';
import DashboardBoard from '@/components/dashboard/DashboardBoard';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';
import { PrivacyToggleButton } from '@/components/dashboard/PrivacyToggleButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserProfile as ProfileType } from '@/components/dashboard/ProfileCard';

export interface Operacao {
  id?: string;
  data: Timestamp;
  descricao: string;
  faturamentoLiquido: number;
  gastoAnuncio: number;
  taxaGateway: number;
  lucroLiquido: number;
  percentualCabral: number;
  percentualBiel: number;
  percentualSoares: number;
  valorCabral: number;
  valorBiel: number;
  valorSoares: number;
  totalCabral: number;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DayPickerDateRange | undefined>(undefined);

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after hydration
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfDay(new Date()),
    });

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (installEvent) {
      installEvent.prompt();
      installEvent.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setInstallEvent(null);
      });
    }
  };


  const firestore = useFirestore();

  const operacoesRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'operacoesSocios') : null),
    [firestore]
  );

  const allOperacoesQuery = useMemoFirebase(() => {
    if (!operacoesRef) return null;
    return query(operacoesRef, orderBy('data', 'desc'));
  }, [operacoesRef]);

  const { data: allOperacoes, isLoading: isLoadingAllOperacoes } = useCollection<Operacao>(allOperacoesQuery);

  const filteredOperacoes = useMemo(() => {
    if (!allOperacoes) return [];
    let filteredByDate = allOperacoes;

    if (dateRange?.from) {
      const startDate = dateRange.from;
      const endDate = dateRange.to || dateRange.from;
      filteredByDate = allOperacoes.filter(op => {
        const opDate = op.data.toDate();
        // Adjust start time to beginning of the day and end time to end of the day
        const start = new Date(startDate.setHours(0, 0, 0, 0));
        const end = new Date(endDate.setHours(23, 59, 59, 999));
        return opDate >= start && opDate <= end;
      });
    }

    if (searchTerm) {
      return filteredByDate.filter(op =>
        op.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filteredByDate;
  }, [allOperacoes, dateRange, searchTerm]);

  const handleDeleteOperation = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'operacoesSocios', id);
    deleteDocumentNonBlocking(docRef);
  };

  return (
    <div className="min-h-screen w-full text-foreground p-4 md:p-8 flex flex-col gap-4 md:gap-8">
      <div className="absolute top-0 left-0 w-full h-full bg-black -z-10">
        <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,rgba(20,20,20,1)_0%,rgba(0,0,0,1)_100%)"></div>
      </div>
      <Header />

      <Tabs defaultValue="dashboard" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 no-scrollbar">
            <TabsList className="h-auto w-max justify-start flex-nowrap bg-transparent p-0 gap-2">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Dashboard</TabsTrigger>
              <TabsTrigger value="lancamentos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Lançamentos</TabsTrigger>
              <TabsTrigger value="vendas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Vendas</TabsTrigger>
              <TabsTrigger value="despesas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Despesas</TabsTrigger>
              <TabsTrigger value="tarefas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tarefas</TabsTrigger>
              <TabsTrigger value="calendario" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Calendário</TabsTrigger>
              <TabsTrigger value="criativos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Criativos</TabsTrigger>
              <TabsTrigger value="anotacoes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Anotações</TabsTrigger>
              <TabsTrigger value="metas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Metas</TabsTrigger>
              <TabsTrigger value="ofertas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ofertas Escaladas</TabsTrigger>
              <TabsTrigger value="insights" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Insights</TabsTrigger>
              <TabsTrigger value="perfis" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Perfis</TabsTrigger>
              <TabsTrigger value="frases" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Frases</TabsTrigger>
              <TabsTrigger value="logins" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Logins</TabsTrigger>
              <TabsTrigger value="recuperacao" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Recuperação</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <PrivacyToggleButton />
            {/* The date range picker is conditionally rendered based on the active tab */}
          </div>
        </div>

        <TabsContent value="dashboard">
          <DashboardBoard />
        </TabsContent>
        <TabsContent value="lancamentos">
          <div className="mb-4 flex justify-end">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
          <div className="flex flex-col gap-4 md:gap-8">
            <SummaryCards operacoes={filteredOperacoes || []} />
            <OperationsTable
              operacoes={filteredOperacoes || []}
              isLoading={isLoadingAllOperacoes}
              onDelete={handleDeleteOperation}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </div>
        </TabsContent>

        <TabsContent value="vendas">
          <VendasBoard />
        </TabsContent>
        <TabsContent value="despesas">
          <ExpensesBoard />
        </TabsContent>
        <TabsContent value="tarefas">
          <TasksBoard />
        </TabsContent>
        <TabsContent value="calendario">
          <CalendarBoard />
        </TabsContent>
        <TabsContent value="criativos">
          <CreativesBoard />
        </TabsContent>
        <TabsContent value="anotacoes">
          <NotesBoard />
        </TabsContent>
        <TabsContent value="metas">
          <GoalsBoard />
        </TabsContent>
        <TabsContent value="ofertas">
          <OfertasEscaladasBoard />
        </TabsContent>
        <TabsContent value="insights">
          <InsightsBoard />
        </TabsContent>
        <TabsContent value="perfis">
          <ProfilesBoard installable={!!installEvent} handleInstall={handleInstallClick} />
        </TabsContent>
        <TabsContent value="frases">
          <QuotesBoard />
        </TabsContent>
        <TabsContent value="logins">
          <LoginsBoard />
        </TabsContent>
        <TabsContent value="recuperacao">
          <RecuperacaoBoard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
