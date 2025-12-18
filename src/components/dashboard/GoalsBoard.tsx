'use client';
import { useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import GoalForm from './GoalForm';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import GoalCard from './GoalCard';
import AchievementCard from './AchievementCard';
import AchievementPhotosForm from './AchievementPhotosForm';
import { Separator } from '@/components/ui/separator';
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
import Confetti from '@/components/ui/Confetti';
import { useSound } from '@/hooks/use-sound';
import { UserProfile } from './ProfileCard';
import { sendPushNotification } from '@/lib/client-utils';


export interface Meta {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
  completed: boolean;
  proofImageUrls?: string[];
}

const GoalsBoard = () => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const { play } = useSound();
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isPhotosDialogOpen, setIsPhotosDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Meta | null>(null);
  const [goalForPhotos, setGoalForPhotos] = useState<Meta | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);


  const goalsQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'metas'), orderBy('title')) : null),
    [firestore, orgId]
  );

  const profilesQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'perfis')) : null),
    [firestore, orgId]
  );

  const { data: goals, isLoading } = useCollection<Meta>(goalsQuery);
  const { data: profiles, isLoading: isLoadingProfiles } = useCollection<UserProfile>(profilesQuery);

  const handleSaveGoal = (goalData: Omit<Meta, 'id'>) => {
    if (!firestore) return;
    if (editingGoal) {
      const goalRef = doc(firestore, 'organizations', orgId, 'metas', editingGoal.id);
      updateDoc(goalRef, goalData);
    } else {
      const goalsRef = collection(firestore, 'organizations', orgId, 'metas');
      addDocumentNonBlocking(goalsRef, goalData);
    }
    handleGoalDialogChange(false);
  };

  const handleDeleteGoal = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'organizations', orgId, 'metas', id));
  };

  const handleUpdateGoalValue = async (id: string, newCurrentValue: number) => {
    if (!firestore) return;
    const goalRef = doc(firestore, 'organizations', orgId, 'metas', id);
    const goal = goals?.find(g => g.id === id);
    if (goal) {
      const wasCompleted = goal.completed;
      const isNowCompleted = newCurrentValue >= goal.targetValue;
      if (!wasCompleted && isNowCompleted) {
        setShowConfetti(true);
        const goalSound = profiles?.find(p => p.sounds?.goalCompleted)?.sounds?.goalCompleted;
        if (goalSound) {
          play(goalSound);
        }
        const notificationsRef = collection(firestore, 'organizations', orgId, 'notificacoes');
        const notificationMessage = `A meta "${goal.title}" foi alcançada!`;
        const notificationTitle = '🏆 Meta Alcançada!';
        addDocumentNonBlocking(notificationsRef, {
          message: notificationMessage,
          createdAt: Timestamp.now(),
          read: false,
          type: 'goal_completed'
        });

        // Send push notification
        sendPushNotification(notificationTitle, notificationMessage, '/metas');
      }
      await updateDoc(goalRef, { currentValue: newCurrentValue, completed: isNowCompleted });
    }
  };

  const handleEdit = (goal: Meta) => {
    setEditingGoal(goal);
    setIsGoalDialogOpen(true);
  };

  const handleOpenNew = () => {
    setEditingGoal(null);
    setIsGoalDialogOpen(true);
  }

  const handleGoalDialogChange = (open: boolean) => {
    if (!open) {
      setEditingGoal(null);
    }
    setIsGoalDialogOpen(open);
  }

  const handlePhotosDialogChange = (open: boolean) => {
    if (!open) {
      setGoalForPhotos(null);
    }
    setIsPhotosDialogOpen(open);
  }

  const handleAddPhotos = (achievement: Meta) => {
    setGoalForPhotos(achievement);
    setIsPhotosDialogOpen(true);
  }

  const handleSavePhotos = (imageUrls: string[]) => {
    if (!firestore || !goalForPhotos || !orgId) return;
    const goalRef = doc(firestore, 'organizations', orgId, 'metas', goalForPhotos.id);
    updateDoc(goalRef, { proofImageUrls: imageUrls });
    handlePhotosDialogChange(false);
  }

  const activeGoals = goals?.filter(g => !g.completed) || [];
  const achievements = goals?.filter(g => g.completed) || [];

  if (isLoading || isLoadingProfiles) {
    return <div>Carregando metas...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Painel de Metas</h2>
        <Dialog open={isGoalDialogOpen} onOpenChange={handleGoalDialogChange}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg p-0 flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{editingGoal ? 'Editar Meta' : 'Adicionar Nova Meta'}</DialogTitle>
              <DialogDescription>
                {editingGoal ? 'Ajuste os detalhes da sua meta.' : 'Defina um objetivo, seu valor alvo e acompanhe seu progresso.'}
              </DialogDescription>
            </DialogHeader>
            <GoalForm
              onSave={handleSaveGoal}
              onClose={() => handleGoalDialogChange(false)}
              existingGoal={editingGoal}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Metas Atuais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {activeGoals.length > 0 ? (
            activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onUpdateValue={handleUpdateGoalValue}
                onDelete={() => setItemToDelete(goal.id)}
                onEdit={() => handleEdit(goal)}
              />
            ))
          ) : (
            <p className="text-muted-foreground col-span-full">Nenhuma meta ativa no momento. Que tal adicionar uma?</p>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Award className="text-yellow-400" />
          Conquistas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {achievements.length > 0 ? (
            achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                onAddPhotos={() => handleAddPhotos(achievement)}
              />
            ))
          ) : (
            <p className="text-muted-foreground col-span-full">Nenhuma conquista registrada ainda. Continue progredindo!</p>
          )}
        </div>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita e excluirá permanentemente esta meta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (itemToDelete) {
                handleDeleteGoal(itemToDelete);
              }
              setItemToDelete(null);
            }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isPhotosDialogOpen} onOpenChange={handlePhotosDialogChange}>
        <DialogContent className="sm:max-w-2xl p-0 flex flex-col">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Fotos da Conquista: {goalForPhotos?.title}</DialogTitle>
            <DialogDescription>
              Adicione até 3 fotos para celebrar esta meta alcançada. Uma para cada sócio!
            </DialogDescription>
          </DialogHeader>
          <AchievementPhotosForm
            onSave={handleSavePhotos}
            onClose={() => handlePhotosDialogChange(false)}
            existingImageUrls={goalForPhotos?.proofImageUrls || []}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalsBoard;
