'use client';

import { useState, useMemo, useCallback } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, query, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { useOrgCollection } from '@/hooks/useFirestoreOrg';
import { useMemoFirebase } from '@/firebase/provider';
import TaskColumn from './TaskColumn';
import { Button } from '@/components/ui/button';
import { PlusCircle, Archive, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TaskForm from './TaskForm';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from '../ui/separator';
import { UserProfile } from './ProfileCard';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, Active, DragStartEvent, UniqueIdentifier, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { useSound } from '@/hooks/use-sound';
import TaskLeaderboard from './TaskLeaderboard';
import { sendPushNotification } from '@/lib/client-utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';


import { useOrganization } from '@/contexts/OrganizationContext';

export type Urgency = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type TaskStatus = 'A Fazer' | 'Em Progresso' | 'Concluído';
export type Assignee = 'Cabral' | 'Biel' | 'Soares' | 'Geral';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee: Assignee;
  urgency: Urgency;
  status: TaskStatus;
  dueDate?: string;
  order: number;
  oculta?: boolean;
  value?: number;
}

const columnOrder: TaskStatus[] = ['A Fazer', 'Em Progresso', 'Concluído'];
const assignees: Assignee[] = ['Cabral', 'Biel', 'Soares', 'Geral'];

const HiddenTasksModal = ({ open, onOpenChange, tasks, onRestore, profilesByName }: { open: boolean, onOpenChange: (open: boolean) => void, tasks: Task[], onRestore: (taskId: string) => void, profilesByName: { [key: string]: UserProfile } }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tarefas Realizadas (Ocultas)</DialogTitle>
          <DialogDescription>
            Esta é a lista de tarefas que já foram concluídas e ocultadas do painel principal.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {tasks.length > 0 ? tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-900">
                <div>
                  <p className="font-semibold">{task.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Responsável: {task.assignee}</span>
                    <span>•</span>
                    <span>Urgência: {task.urgency}</span>
                    {task.dueDate && <><span>•</span><span>Prazo: {task.dueDate}</span></>}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onRestore(task.id)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </Button>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma tarefa oculta encontrada.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};


const TasksBoard = () => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const { play } = useSound();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  const tasksCollection = useOrgCollection('tarefas');
  const profilesCollection = useOrgCollection('perfis');

  const tasksQuery = useMemoFirebase(
    () => (tasksCollection ? query(tasksCollection) : null),
    [tasksCollection]
  );

  const profilesQuery = useMemoFirebase(
    () => (profilesCollection ? query(profilesCollection) : null),
    [profilesCollection]
  );

  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  const { data: profiles, isLoading: isLoadingProfiles } = useCollection<UserProfile>(profilesQuery);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { tasksByColumn, hiddenTasks } = useMemo(() => {
    const grouped: { [key in Assignee]?: { [key in TaskStatus]?: Task[] } } = {};
    const hidden: Task[] = [];

    if (tasks) {
      tasks.forEach(task => {
        if (task.status === 'Concluído' && task.oculta) {
          hidden.push(task);
          return;
        }

        if (!grouped[task.assignee]) {
          grouped[task.assignee] = {};
        }
        if (!grouped[task.assignee]![task.status]) {
          grouped[task.assignee]![task.status] = [];
        }
        grouped[task.assignee]![task.status]!.push(task);
      });

      for (const assignee in grouped) {
        for (const status in grouped[assignee as Assignee]) {
          grouped[assignee as Assignee]![status as TaskStatus]!.sort((a, b) => a.order - b.order);
        }
      }
    }
    return { tasksByColumn: grouped, hiddenTasks: hidden.sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || '')) };
  }, [tasks]);

  const profilesByName = useMemo(() => {
    if (!profiles) return {};
    return profiles.reduce((acc, profile) => {
      if (profile.name) {
        acc[profile.name] = profile;
      }
      return acc;
    }, {} as { [key: string]: UserProfile });
  }, [profiles]);

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'status' | 'order' | 'oculta'>) => {
    if (!firestore) return;

    if (editingTask) {
      const taskRef = doc(firestore, 'tarefas', editingTask.id);
      updateDoc(taskRef, { ...editingTask, ...taskData });
    } else {
      if (!tasksCollection) return;
      const tasksInColumn = tasks?.filter(t => t.status === 'A Fazer' && t.assignee === taskData.assignee) || [];
      const maxOrder = tasksInColumn.reduce((max, t) => Math.max(max, t.order), -1);
      addDocumentNonBlocking(tasksCollection, { ...taskData, status: 'A Fazer', order: maxOrder + 1, oculta: false });
    }

    setIsFormOpen(false);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (!firestore || !tasks || !orgId) return;

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    if (newStatus === 'Concluído') {
      const taskSound = profiles?.find(p => p.name === taskToMove.assignee && p.sounds?.taskCompleted)?.sounds?.taskCompleted;
      if (taskSound) {
        play(taskSound);
      }
      const notificationsRef = collection(firestore, 'organizations', orgId, 'notificacoes');
      const notificationMessage = `A tarefa "${taskToMove.title}" foi concluída!`;
      const notificationTitle = '✅ Tarefa Concluída!';
      addDocumentNonBlocking(notificationsRef, {
        message: notificationMessage,
        createdAt: Timestamp.now(),
        read: false,
        type: 'task_completed'
      });

      // Send push notification
      sendPushNotification(notificationTitle, notificationMessage, '/tarefas');
    }

    const tasksInNewColumn = tasks.filter(t => t.status === newStatus && t.assignee === taskToMove.assignee);
    const maxOrder = tasksInNewColumn.reduce((max, t) => Math.max(max, t.order || 0), -1);

    const taskRef = doc(firestore, 'tarefas', taskId);
    updateDoc(taskRef, { status: newStatus, order: maxOrder + 1 });
  };

  const handleDeleteTask = (taskId: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'tarefas', taskId));
  };

  const handleHideTask = async (taskId: string) => {
    if (!firestore) return;
    const taskRef = doc(firestore, 'tarefas', taskId);
    await updateDoc(taskRef, { oculta: true });
  }

  const handleRestoreTask = async (taskId: string) => {
    if (!firestore) return;
    const taskRef = doc(firestore, 'tarefas', taskId);
    await updateDoc(taskRef, { oculta: false });
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleOpenNew = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingTask(null);
    }
    setIsFormOpen(open);
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks?.find(t => t.id === active.id);
    if (task) {
      setActiveDragTask(task);
    }
  };

  const findContainer = (id: UniqueIdentifier): TaskStatus | null => {
    if (id === null) return null;
    if (columnOrder.includes(id as TaskStatus)) {
      return id as TaskStatus;
    }
    return tasks?.find(t => t.id === id)?.status ?? null;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;

    if (!over || !firestore) {
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Item dropped on itself, do nothing
    if (activeId === overId) {
      return;
    }

    const activeTask = tasks?.find(t => t.id === activeId);
    if (!activeTask) return;

    const sourceContainer = activeTask.status;
    const destContainer = findContainer(overId) ?? sourceContainer;

    // Scenario 1: Moving to a different column (status change)
    if (sourceContainer !== destContainer) {
      handleStatusChange(activeId.toString(), destContainer);
      return;
    }

    // Scenario 2: Reordering within the same column
    const itemsInColumn = (tasksByColumn[activeTask.assignee]?.[sourceContainer] || []);
    const oldIndex = itemsInColumn.findIndex(t => t.id === activeId);
    const newIndex = itemsInColumn.findIndex(t => t.id === overId);

    if (oldIndex === -1 || newIndex === -1) {
      return; // Should not happen if logic is correct
    }

    const reorderedItems = arrayMove(itemsInColumn, oldIndex, newIndex);

    const batch = writeBatch(firestore);
    reorderedItems.forEach((task, index) => {
      const taskRef = doc(firestore, 'tarefas', task.id);
      batch.update(taskRef, { order: index });
    });

    await batch.commit();
  };

  if (isLoadingTasks || isLoadingProfiles) {
    return <div>Carregando tarefas...</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Quadro de Tarefas</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsArchiveOpen(true)}>
              <Archive className="mr-2 h-4 w-4" /> Tarefas Realizadas
            </Button>
            <Button onClick={handleOpenNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Tarefa
            </Button>
          </div>
        </div>

        <TaskLeaderboard tasks={tasks || []} profiles={profiles || []} />

        <div className="flex flex-col gap-10">
          {assignees.map((assignee, index) => (
            <div key={assignee}>
              <h3 className="text-xl font-bold mb-4">{assignee === 'Geral' ? 'Tarefas Gerais' : assignee}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {columnOrder.map((status) => (
                  <TaskColumn
                    key={status}
                    status={status}
                    tasks={tasksByColumn[assignee]?.[status] || []}
                    profilesByName={profilesByName}
                    onStatusChange={handleStatusChange}
                    onDeleteTask={(taskId) => setItemToDelete(taskId)}
                    onEditTask={handleEdit}
                    onHideTask={handleHideTask}
                  />
                ))}
              </div>
              {index < assignees.length - 1 && <Separator className="mt-8" />}
            </div>
          ))}
        </div>

        <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita e excluirá permanentemente esta tarefa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (itemToDelete) {
                  handleDeleteTask(itemToDelete);
                }
                setItemToDelete(null);
              }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isFormOpen} onOpenChange={handleDialogChange}>
          <DialogContent className="sm:max-w-lg p-0 flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Ajuste os detalhes da sua tarefa.' : 'Preencha os detalhes da tarefa que você quer criar.'}
              </DialogDescription>
            </DialogHeader>
            <TaskForm onSave={handleSaveTask} onClose={() => handleDialogChange(false)} existingTask={editingTask} />
          </DialogContent>
        </Dialog>

        <HiddenTasksModal
          open={isArchiveOpen}
          onOpenChange={setIsArchiveOpen}
          tasks={hiddenTasks}
          onRestore={handleRestoreTask}
          profilesByName={profilesByName}
        />

      </div>
      <DragOverlay>
        {activeDragTask ? (
          <TaskCard
            task={activeDragTask}
            profile={profilesByName[activeDragTask.assignee]}
            onStatusChange={() => { }}
            onDelete={() => { }}
            onEdit={() => { }}
            onHide={() => { }}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TasksBoard;
