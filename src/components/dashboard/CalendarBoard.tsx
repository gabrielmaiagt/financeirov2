'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Task, Urgency } from './TasksBoard';
import { Operacao } from '@/app/page';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';

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

  const PopoverContentComponent = () => (
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Resumo de {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h4>
      </div>
      {dailyGross !== null && dailyGross > 0 && (
        <div className="flex items-center justify-between p-2 rounded-md bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-400" />
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

  const DayContent = () => (
    <div className={cn(
      "w-full h-full flex flex-col items-center justify-center cursor-pointer rounded-md hover:bg-accent/80 transition-colors relative",
      hasContent && 'bg-accent/50',
    )}>
      {tasks.length > 0 && (
        <span className="absolute top-1 right-1 text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center z-10">
          {tasks.length}
        </span>
      )}
      <span className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full",
        highestUrgency && `ring-2 ring-offset-2 ring-offset-neutral-900 ${urgencyRingColors[highestUrgency]}`
      )}>
        {dayNumber}
      </span>
      {dailyRevenue !== null && (
        <div className={cn(
          "absolute bottom-1 text-[10px] font-bold px-1 rounded-full",
          dailyRevenue > 0 && "text-green-400",
          dailyRevenue < 0 && "text-red-400"
        )}>
          {formatCurrency(dailyRevenue)}
        </div>
      )}
    </div>
  );

  if (!hasContent) {
    return <div className="p-1 h-full w-full flex items-center justify-center">{dayNumber}</div>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <DayContent />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <PopoverContentComponent />
      </PopoverContent>
    </Popover>
  );
};


import { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface CalendarBoardProps {
  dateRange?: DateRange;
}

const CalendarBoard = ({ dateRange }: CalendarBoardProps) => {
  const firestore = useFirestore();
  const [month, setMonth] = useState<Date>(new Date());

  const tasksQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tarefas')) : null),
    [firestore]
  );

  const operacoesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'operacoesSocios')) : null),
    [firestore]
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
    <Card className="bg-transparent border-neutral-800">
      <CardHeader>
        <CardTitle>Calendário de Tarefas e Financeiro</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          locale={ptBR}
          className="p-0"
          modifiers={{
            highlighted: (date) => {
              if (!dateRange?.from) return false;
              const start = startOfDay(dateRange.from);
              const end = endOfDay(dateRange.to || dateRange.from);
              return isWithinInterval(date, { start, end });
            }
          }}
          modifiersClassNames={{
            highlighted: "bg-primary/10 text-primary font-bold border-2 border-primary/20 rounded-md"
          }}
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4 w-full",
            caption_label: "text-lg font-bold",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-28 w-full text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 border border-transparent focus-within:border-primary",
            day: "h-full w-full p-0 font-normal aria-selected:opacity-100",
            day_selected: "bg-accent text-accent-foreground",
            day_today: "bg-primary/20 text-primary-foreground",
            day_outside: "text-muted-foreground opacity-50",
          }}
          components={{
            Day: ({ date }) => {
              const dayKey = format(date, 'yyyy-MM-dd');
              const dailyTasks = tasksByDay[dayKey] || [];
              const financials = financialsByDay[dayKey] || null;
              return <CalendarDayCell date={date} tasks={dailyTasks} dailyRevenue={financials?.lucro ?? null} dailyGross={financials?.faturamento ?? null} />;
            }
          }}
        />
      </CardContent>
    </Card>
  );
};

export default CalendarBoard;
