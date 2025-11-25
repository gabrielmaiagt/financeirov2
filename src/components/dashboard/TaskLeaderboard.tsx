'use client';
import { useMemo } from 'react';
import { Task } from './TasksBoard';
import { UserProfile } from './ProfileCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { subDays } from 'date-fns';

interface TaskLeaderboardProps {
  tasks: Task[];
  profiles: UserProfile[];
}

const getInitials = (name?: string) => {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('');
};

const medals = ['🥇', '🥈', '🥉'];

const TaskLeaderboard = ({ tasks, profiles }: TaskLeaderboardProps) => {
  const leaderboardData = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    
    const completedTasksLast7Days = tasks.filter(task => {
        if(task.status !== 'Concluído') return false;
        // This is a naive check assuming dueDate is set when it's completed.
        // A better approach would be a `completedAt` timestamp.
        // For now, we'll use dueDate if it exists.
        const completionDate = task.dueDate ? new Date(task.dueDate) : new Date(); // Fallback
        return completionDate > sevenDaysAgo;
    });

    const scores = completedTasksLast7Days.reduce((acc, task) => {
        if(task.assignee !== 'Geral') {
            acc[task.assignee] = (acc[task.assignee] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const sortedScores = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([name, score]) => ({
        name,
        score,
        profile: profiles.find(p => p.name === name)
      }));

    return sortedScores;
  }, [tasks, profiles]);

  if(leaderboardData.length === 0) return null;

  return (
    <Card className="border-neutral-800 bg-transparent">
        <CardHeader>
            <CardTitle className="text-lg">🏆 Leaderboard - Tarefas Concluídas (Últimos 7 Dias)</CardTitle>
        </CardHeader>
        <CardContent>
            <ol className="space-y-4">
                {leaderboardData.map((entry, index) => (
                    <li key={entry.name} className="flex items-center gap-4 p-2 rounded-lg bg-neutral-900/50">
                        <span className="text-2xl font-bold w-8 text-center">{medals[index] || `${index + 1}.`}</span>
                        <Avatar className="w-10 h-10 border-2 border-primary/50">
                            <AvatarImage src={entry.profile?.photoUrl} alt={entry.name} />
                            <AvatarFallback>{getInitials(entry.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold flex-1">{entry.name}</span>
                        <span className="font-bold text-lg text-primary">{entry.score} {entry.score === 1 ? 'tarefa' : 'tarefas'}</span>
                    </li>
                ))}
            </ol>
        </CardContent>
    </Card>
  );
};

export default TaskLeaderboard;
