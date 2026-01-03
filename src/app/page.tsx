'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, Timestamp, where, limit, QueryConstraint, getAggregateFromServer, sum } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { DateRange as DayPickerDateRange } from 'react-day-picker';
import { startOfMonth, endOfDay, startOfDay } from 'date-fns';

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
import OperationsBoard from '@/components/dashboard/OperationsBoard';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabsContent } from "@/components/ui/tabs";
import { NavTabs } from "@/components/NavTabs";
import { NavTabsList } from "@/components/NavTabsList";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { Loader2 } from 'lucide-react';
import { PrivacyToggleButton } from '@/components/dashboard/PrivacyToggleButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserProfile as ProfileType } from '@/components/dashboard/ProfileCard';
import { InitOrg } from '@/components/InitOrg';
import { MobilePillNav } from "@/components/MobilePillNav";

export interface Operacao {
  id?: string;
  operationId?: string; // Reference to the operation this transaction belongs to
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
  cashReservePercentage?: number; // Can override operation default
  cashReserveValue?: number; // Calculated value for company cash
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
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DayPickerDateRange | undefined>(undefined);

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [totalCashReserve, setTotalCashReserve] = useState<number>(0);

  useEffect(() => {
    async function fetchTotalCash() {
      if (!firestore || !orgId) return;
      try {
        const coll = collection(firestore, 'organizations', orgId, 'operacoesSocios');
        const snapshot = await getAggregateFromServer(coll, {
          total: sum('cashReserveValue')
        });
        setTotalCashReserve(snapshot.data().total || 0);
      } catch (error) {
        console.error("Error fetching cash aggregate:", error);
      }
    }
    fetchTotalCash();
  }, [firestore, orgId]);

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




  const operacoesRef = useMemoFirebase(
    () => (firestore && orgId ? collection(firestore, 'organizations', orgId, 'operacoesSocios') : null),
    [firestore, orgId]
  );

  // ... (dentro do componente)

  const allOperacoesQuery = useMemoFirebase(() => {
    if (!operacoesRef) return null;

    // Se não tiver dateRange definido (inicialização), não busca nada ou busca um limite seguro
    // O useEffect vai setar o dateRange logo em seguida
    if (!dateRange?.from) {
      return query(operacoesRef, orderBy('data', 'desc'), limit(20));
    }

    const constraints: QueryConstraint[] = [orderBy('data', 'desc')];

    if (dateRange.from) {
      constraints.push(where('data', '>=', Timestamp.fromDate(startOfDay(dateRange.from))));
      const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      constraints.push(where('data', '<=', Timestamp.fromDate(end)));
    }

    return query(operacoesRef, ...constraints);
  }, [operacoesRef, dateRange]);

  const { data: allOperacoes, isLoading: isLoadingAllOperacoes } = useCollection<Operacao>(allOperacoesQuery);

  const filteredOperacoes = useMemo(() => {
    // A filtragem de data já foi feita no servidor.
    // Mantemos apenas a busca textual local
    if (!allOperacoes) return [];

    if (searchTerm) {
      return allOperacoes.filter(op =>
        op.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return allOperacoes;
  }, [allOperacoes, searchTerm]);

  const handleDeleteOperation = (id: string) => {
    if (!firestore || !orgId) return;
    const docRef = doc(firestore, 'organizations', orgId, 'operacoesSocios', id);
    deleteDocumentNonBlocking(docRef);
  };

  return (
    <div className="min-h-screen w-full text-foreground p-2 md:p-8 flex flex-col gap-4 md:gap-8">
      <div className="absolute top-0 left-0 w-full h-full bg-black -z-10">
        <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,rgba(20,20,20,1)_0%,rgba(0,0,0,1)_100%)"></div>
      </div>
      <Header />
      <InitOrg />

      <NavTabs defaultValue="lancamentos" className="w-full flex flex-col md:flex-row gap-6">
        <Sidebar />
        <MobilePillNav />

        <div className="flex-1 w-full min-w-0">
          <TopBar />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <NavTabsList />
            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <PrivacyToggleButton />
              {/* The date range picker is conditionally rendered based on the active tab */}
            </div>
          </div>

          <TabsContent value="dashboard">
            <DashboardBoard />
          </TabsContent>
          <TabsContent value="lancamentos">
            <div className="mb-4 flex justify-center md:justify-end">
              <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full md:w-[300px]" />
            </div>
            <div className="flex flex-col gap-4 md:gap-8">
              <SummaryCards operacoes={filteredOperacoes || []} totalCashReserve={totalCashReserve} />
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
            <CalendarBoard dateRange={dateRange} />
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
          <TabsContent value="operacoes">
            <OperationsBoard />
          </TabsContent>
        </div>
      </NavTabs>
    </div>
  );
}
