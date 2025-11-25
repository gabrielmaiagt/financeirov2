'use client';
import { Task, TaskStatus } from './TasksBoard';
import TaskCard from './TaskCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserProfile } from './ProfileCard';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useMemo } from 'react';

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  profilesByName: { [key: string]: UserProfile };
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onHideTask: (taskId: string) => void;
}

const TaskColumn = ({ status, tasks, profilesByName, onStatusChange, onDeleteTask, onEditTask, onHideTask }: TaskColumnProps) => {
  const taskIds = useMemo(() => tasks.map(task => task.id), [tasks]);
  const { setNodeRef } = useDroppable({ id: status });
  
  return (
    <Card className="border-neutral-800 bg-transparent h-full">
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          <span>{status}</span>
          <span className="text-sm font-normal text-neutral-500 bg-neutral-800 rounded-full px-2 py-1">
            {tasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="flex flex-col gap-4 min-h-[300px]">
        <SortableContext id={status} items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
            <TaskCard 
                key={task.id} 
                task={task}
                profile={profilesByName[task.assignee]}
                onStatusChange={(newStatus) => onStatusChange(task.id, newStatus)}
                onDelete={() => onDeleteTask(task.id)}
                onEdit={() => onEditTask(task)}
                onHide={() => onHideTask(task.id)}
            />
            ))}
        </SortableContext>
      </CardContent>
    </Card>
  );
};

export default TaskColumn;
