'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Task, Urgency } from './TasksBoard';
import { Operacao } from '@/app/page';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

const urgencyColors: Record<Urgency, string> = {
  Baixa: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
  Média: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
  Alta: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30',
  Crítica: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
};

const urgencyRingColors: Record<Urgency, string> = {
  Crítica: 'ring-red-500',
  Alta: 'ring-orange-500',
  Média: 'ring-yellow-500',
  Baixa: 'ring-green-500',
};

const getHighestUrgency = (tasks: Task[]): Urgency | null => {
  if (!tasks || tasks.length === 0) return null;
  const order: Urgency[] = ['Crítica', 'Alta', 'Média', 'Baixa'];
  for (const urgency of order) {
    if (tasks.some(task => task.urgency === urgency)) {
      return urgency;
    }
  }
  return 'Baixa';
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CalendarDayCell = ({ date, tasks, dailyRevenue, dailyGross }: { date: Date, tasks: Task[], dailyRevenue: number | null, dailyGross: number | null }) => {
  const highestUrgency = getHighestUrgency(tasks);
  const dayNumber = format(date, 'd');
  const hasContent = tasks.length > 0 || dailyRevenue !== null;
  const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');

  const TooltipContent = () => (
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Resumo de {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h4>
      </div>
      {dailyGross !== null && dailyGross > 0 && (
        <div className="flex items-center justify-between p-2 rounded-md bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-blue-400">Faturamento</span>
          </div>
          <span className="font-bold text-blue-400">{formatCurrency(dailyGross)}</span>
        </div>
      )}
      {dailyRevenue !== null && (
        <div className={cn(
          "flex items-center justify-between p-2 rounded-md",
          dailyRevenue > 0 && "bg-green-500/20 text-green-400",
          dailyRevenue < 0 && "bg-red-500/20 text-red-400",
          dailyRevenue === 0 && "bg-neutral-500/20 text-neutral-400"
        )}>
          <div className="flex items-center gap-2">
            {dailyRevenue > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-semibold">Lucro do Dia</span>
          </div>
          <span className="font-bold">{formatCurrency(dailyRevenue)}</span>
        </div>
      )}
      {tasks.length > 0 && (
        <div className="grid gap-4 max-h-60 overflow-y-auto">
          {tasks.map(task => (
            <div key={task.id} className="grid grid-cols-[25px_1fr] items-start pb-4 last:pb-0 last:border-b-0 border-b border-neutral-800">
              <span className="flex h-2 w-2 translate-y-1 rounded-full bg-primary" />
              <div className="grid gap-1.5">
                <p className="text-sm font-medium leading-none">{task.title}</p>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">Responsável: {task.assignee}</p>
                  <Badge variant="outline" className={`${urgencyColors[task.urgency]}`}>{task.urgency}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const DialogDetailContent = () => (
    <div className="grid gap-6 py-4">
      <div className="grid grid-cols-2 gap-4">
        {dailyGross !== null && (
          <div className="flex flex-col p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
            <span className="text-sm text-muted-foreground mb-1">Faturamento</span>
            <span className="text-2xl font-bold text-blue-400">{formatCurrency(dailyGross)}</span>
          </div>
        )}
        {dailyRevenue !== null && (
          <div className={cn(
            "flex flex-col p-4 rounded-xl border",
            dailyRevenue > 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20",
            dailyRevenue === 0 && "bg-neutral-900/50 border-neutral-800"
          )}>
            <span className="text-sm text-muted-foreground mb-1">Lucro Líquido</span>
            <span className={cn(
              "text-2xl font-bold",
              dailyRevenue > 0 && "text-green-400",
              dailyRevenue < 0 && "text-red-400",
              dailyRevenue === 0 && "text-neutral-400"
            )}>{formatCurrency(dailyRevenue)}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-primary" />
          Tarefas do Dia ({tasks.length})
        </h4>

        {tasks.length > 0 ? (
          <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {tasks.map(task => (
              <div key={task.id} className="group flex flex-col gap-2 p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm">{task.title}</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", urgencyColors[task.urgency])}>
                    {task.urgency}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{task.assignee}</span>
                  {task.value && <span>{formatCurrency(task.value)}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm bg-neutral-900/30 rounded-lg border border-dashed border-neutral-800">
            Nenhuma tarefa para este dia
          </div>
        )}
      </div>
    </div>
  );

  const DayContent = () => (
    <div className={cn(
      "w-full h-full flex flex-col justify-between p-1.5 cursor-pointer rounded-md transition-colors relative group border border-transparent hover:border-neutral-800",
      hasContent && 'bg-neutral-900/30',
      isToday && 'bg-primary/5 border-primary/20'
    )}>
      {/* Topo: Dia e Contadores */}
      <div className="flex items-start justify-between w-full">
        <span className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium transition-transform group-hover:scale-110 duration-200",
          isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          highestUrgency && !isToday && `ring-1 ${urgencyRingColors[highestUrgency]}`
        )}>
          {dayNumber}
        </span>

        {tasks.length > 0 && (
          <span className="text-[10px] font-medium bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Fundo: Financeiro */}
      <div className="flex flex-col gap-0.5 w-full">
        {dailyRevenue !== null && (
          <div className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded text-center w-full truncate",
            dailyRevenue > 0 && "text-green-400 bg-green-500/10",
            dailyRevenue < 0 && "text-red-400 bg-red-500/10",
            dailyRevenue === 0 && "text-neutral-400 bg-neutral-800/50"
          )}>
            {formatCurrency(dailyRevenue)}
          </div>
        )}
      </div>
    </div>
  );

  if (!hasContent && !isToday) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <div className="w-full h-full p-2 flex items-start justify-start opacity-50 hover:opacity-100 hover:bg-neutral-900/20 rounded-md transition-all cursor-pointer">
            <span className="text-sm text-muted-foreground">{dayNumber}</span>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] bg-neutral-950 border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <DialogDetailContent />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog>
      <HoverCard>
        <HoverCardTrigger asChild>
          <DialogTrigger asChild>
            <div className="w-full h-full">
              <DayContent />
            </div>
          </DialogTrigger>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 p-0 overflow-hidden border-neutral-800">
          <div className="p-4 bg-neutral-950">
            <TooltipContent />
          </div>
        </HoverCardContent>
      </HoverCard>
      <DialogContent className="sm:max-w-[500px] bg-neutral-950 border-neutral-800">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
        </DialogHeader>
        <DialogDetailContent />
      </DialogContent>
    </Dialog>
  );
};

interface CalendarBoardProps {
  dateRange?: DateRange;
}

const CalendarBoard = ({ dateRange }: CalendarBoardProps) => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const [month, setMonth] = useState<Date>(new Date());

  const tasksQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'tarefas')) : null),
    [firestore, orgId]
  );

  const operacoesQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'operacoesSocios')) : null),
    [firestore, orgId]
  );

  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  const { data: operacoes, isLoading: isLoadingOperacoes } = useCollection<Operacao>(operacoesQuery);

  const tasksWithDueDate = useMemo(() => {
    return tasks?.filter(task => task.dueDate) || [];
  }, [tasks]);

  const tasksByDay = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    tasksWithDueDate.forEach(task => {
      const date = parseISO(task.dueDate!);
      const dayKey = format(date, 'yyyy-MM-dd');
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(task);
    });
    return grouped;
  }, [tasksWithDueDate]);

  const financialsByDay = useMemo(() => {
    const grouped: { [key: string]: { lucro: number; faturamento: number } } = {};
    operacoes?.forEach(op => {
      const date = op.data.toDate();
      const dayKey = format(date, 'yyyy-MM-dd');
      if (!grouped[dayKey]) {
        grouped[dayKey] = { lucro: 0, faturamento: 0 };
      }
      grouped[dayKey].lucro += op.lucroLiquido;
      grouped[dayKey].faturamento += op.faturamentoLiquido || 0;
    });
    return grouped;
  }, [operacoes]);


  if (isLoadingTasks || isLoadingOperacoes) {
    return <div className="flex justify-center items-center h-64">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      <p className="text-muted-foreground">Carregando calendário...</p>
    </div>;
  }

  return (
    <Card className="bg-transparent border-neutral-800 w-full">
      <CardHeader>
        <CardTitle>Calendário de Tarefas e Financeiro</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 w-full">
        <div className="w-full overflow-x-auto">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            locale={ptBR}
            className="p-0 w-full"
            modifiers={{
              highlighted: (date) => {
                if (!dateRange?.from) return false;
                const start = startOfDay(dateRange.from);
                const end = endOfDay(dateRange.to || dateRange.from);
                return isWithinInterval(date, { start, end });
              }
            }}
            modifiersClassNames={{
              highlighted: "bg-primary/10 text-primary font-bold border-2 border-dashed border-primary/50"
            }}
            classNames={{
              months: "flex flex-col w-full",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center mb-4 px-8",
              caption_label: "text-lg font-bold",
              nav: "flex items-center gap-1",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex w-full",
              head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "h-28 w-full text-center text-sm p-0 relative focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
              day: "h-full w-full p-0 font-normal aria-selected:opacity-100",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
            components={{
              Day: (props: any) => {
                const { day, ...otherProps } = props;
                const date = day.date;
                const dayKey = format(date, 'yyyy-MM-dd');
                const dailyTasks = tasksByDay[dayKey] || [];
                const financials = financialsByDay[dayKey] || null;
                return <CalendarDayCell date={date} tasks={dailyTasks} dailyRevenue={financials?.lucro ?? null} dailyGross={financials?.faturamento ?? null} />;
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarBoard;
