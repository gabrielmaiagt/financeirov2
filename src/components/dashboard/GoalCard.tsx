'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, CheckCircle, Target } from 'lucide-react';
import { Meta } from './GoalsBoard';

interface GoalCardProps {
  goal: Meta;
  onUpdateValue: (id: string, newCurrentValue: number) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}

const formatValue = (value: number, unit?: string) => {
    if (unit === 'R$') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    return `${value.toLocaleString('pt-BR')} ${unit || ''}`.trim();
  };

const GoalCard = ({ goal, onUpdateValue, onDelete, onEdit }: GoalCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(goal.currentValue);

  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);

  const handleUpdate = () => {
    onUpdateValue(goal.id, currentValue);
    setIsEditing(false);
  };
  
  const handleMarkAsComplete = () => {
    onUpdateValue(goal.id, goal.targetValue);
  }

  return (
    <Card className="border-neutral-800 bg-transparent h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {goal.title}
            </CardTitle>
            <div className="flex gap-1">
                 <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onEdit}>
                    <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => onDelete(goal.id)}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="relative">
          <Progress value={progress} className="h-3"/>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="text-sm text-neutral-400 flex justify-between">
          <span>{formatValue(goal.currentValue, goal.unit)}</span>
          <span className="font-semibold">{formatValue(goal.targetValue, goal.unit)}</span>
        </div>

        {isEditing && (
          <div className="flex gap-2 items-center pt-2">
            <input
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(Number(e.target.value))}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1 text-sm"
              placeholder="Novo valor"
            />
            <Button size="sm" onClick={handleUpdate}>Atualizar</Button>
          </div>
        )}
      </CardContent>
       <CardFooter>
        <Button variant="outline" size="sm" className="w-full" onClick={handleMarkAsComplete}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar como Concluída
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GoalCard;
