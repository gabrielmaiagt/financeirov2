'use client';
import { useState } from 'react';
import { Task, Urgency, TaskStatus } from './TasksBoard';
import { Card, CardHeader, CardTitle, CardFooter, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Calendar, AlertTriangle, GripVertical, FileText, EyeOff } from 'lucide-react';
import { UserProfile } from './ProfileCard';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


interface TaskCardProps {
  task: Task;
  profile?: UserProfile;
  onStatusChange: (newStatus: TaskStatus) => void;
  onDelete: () => void;
  onEdit: () => void;
  onHide: () => void;
}

const urgencyColors: Record<Urgency, string> = {
  Baixa: 'bg-green-500/20 text-green-400 border-green-500/30',
  Média: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Alta: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Crítica: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const getInitials = (name?: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('');
}

const allStatuses: TaskStatus[] = ['A Fazer', 'Em Progresso', 'Concluído'];

const TaskCard = ({ task, profile, onStatusChange, onDelete, onEdit, onHide }: TaskCardProps) => {
  const otherStatuses = allStatuses.filter(s => s !== task.status);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    position: 'relative' as const,
  };

  return (
    <Collapsible
        open={isDescriptionOpen}
        onOpenChange={setIsDescriptionOpen}
        asChild
    >
        <Card 
            ref={setNodeRef} 
            style={style} 
            className={cn("bg-neutral-900/50 border-neutral-800 touch-none", isDragging ? "shadow-lg shadow-primary/20 border-primary" : "hover:border-primary/50 transition-colors")}
        >
        <CardHeader className="p-4 flex-row justify-between items-start gap-2">
            <div className="flex-1 flex flex-col gap-2">
                <Badge className={`text-xs ${urgencyColors[task.urgency]}`}>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {task.urgency}
                </Badge>
                <CardTitle className="text-base font-semibold">{task.title}</CardTitle>
            </div>
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="cursor-grab w-8 h-8" {...attributes} {...listeners}>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-6 h-6">
                    <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Mover para</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                        {otherStatuses.map(status => (
                            <DropdownMenuItem key={status} onSelect={() => onStatusChange(status)}>
                            {status}
                            </DropdownMenuItem>
                        ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                    </DropdownMenuSub>
                    {task.status === 'Concluído' && (
                         <DropdownMenuItem onSelect={onHide}>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Ocultar Tarefa
                        </DropdownMenuItem>
                    )}
                    {task.description && (
                        <CollapsibleTrigger asChild>
                             <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                {isDescriptionOpen ? 'Ocultar Descrição' : 'Ver Descrição'}
                            </DropdownMenuItem>
                        </CollapsibleTrigger>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={onDelete}>Excluir</DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
        
        <CollapsibleContent asChild>
            <CardContent className="p-4 pt-0">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </CardContent>
        </CollapsibleContent>


        <CardFooter className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                {task.assignee !== 'Geral' && (
                    <Avatar className="w-6 h-6">
                        {profile?.photoUrl && <AvatarImage src={profile.photoUrl} alt={task.assignee} />}
                        <AvatarFallback className="text-xs">{getInitials(task.assignee)}</AvatarFallback>
                    </Avatar>
                )}
                <span className="text-xs text-neutral-400">{task.assignee}</span>
            </div>
            {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
                <Calendar className="w-3 h-3" />
                <span>{task.dueDate}</span>
            </div>
            )}
        </CardFooter>
        </Card>
    </Collapsible>
  );
};

export default TaskCard;
