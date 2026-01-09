'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import {
  addDays,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangePickerProps extends React.ComponentProps<'div'> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {

  const handlePresetChange = (value: string) => {
    const now = new Date();
    switch (value) {
      case 'today':
        onDateChange({ from: now, to: now });
        break;
      case 'yesterday':
        const yesterday = addDays(now, -1);
        onDateChange({ from: yesterday, to: yesterday });
        break;
      case 'last7':
        onDateChange({ from: addDays(now, -6), to: now });
        break;
      case 'last30':
        onDateChange({ from: addDays(now, -29), to: now });
        break;
      case 'thisMonth':
        onDateChange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'lastMonth':
        const lastMonth = addDays(startOfMonth(now), -1); // Último dia do mês anterior
        onDateChange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
      case 'last3Months':
        const threeMonthsAgo = addDays(now, -90);
        onDateChange({ from: threeMonthsAgo, to: now });
        break;
      case 'lastYear':
        const oneYearAgo = addDays(now, -365);
        onDateChange({ from: oneYearAgo, to: now });
        break;
      case 'all':
        onDateChange(undefined); // Represents "Maximum" or "All time"
        break;
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y', { locale: ptBR })} -{' '}
                  {format(date.to, 'LLL dd, y', { locale: ptBR })}
                </>
              ) : (
                format(date.from, 'LLL dd, y', { locale: ptBR })
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex bg-neutral-900">
            <div className="w-[180px] p-2 border-r border-neutral-800">
              <h4 className="text-sm font-medium px-2 py-1.5">Períodos</h4>
              <div className="flex flex-col space-y-1 mt-1">
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange('today')}>Hoje</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange('yesterday')}>Ontem</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange('last7')}>Últimos 7 dias</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange('last30')}>Últimos 30 dias</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange('thisMonth')}>Este mês</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange('lastMonth')}>Mês passado</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange('last3Months')}>Últimos 3 meses</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange('lastYear')}>Último ano</Button>
                <Button variant="ghost" className="justify-start" onClick={() => handlePresetChange('all')}>Período completo</Button>
              </div>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}