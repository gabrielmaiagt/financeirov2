'use client';
import { useState, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

export interface Notification {
  id: string;
  message: string;
  createdAt: Timestamp;
  read: boolean;
  type: string;
}

// Client-side component to render relative time
const TimeAgo = ({ date }: { date: Date | undefined }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (date) {
      const update = () => setTimeAgo(formatDistanceToNow(date, { addSuffix: true, locale: ptBR }));
      update();
      const interval = setInterval(update, 60000); // update every minute
      return () => clearInterval(interval);
    }
  }, [date]);

  if (!date) return 'N/A';

  return timeAgo || 'agora mesmo';
};


const NotificationBell = () => {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  const notificationsQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'notificacoes'), orderBy('createdAt', 'desc')) : null),
    [firestore, orgId]
  );

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleMarkAllAsRead = async () => {
    if (!firestore || unreadCount === 0) return;
    const batch = writeBatch(firestore);
    notifications?.forEach(n => {
      if (!n.read) {
        const notifRef = doc(firestore, 'organizations', orgId, 'notificacoes', n.id);
        batch.update(notifRef, { read: true });
      }
    });
    await batch.commit();
  };

  useEffect(() => {
    // If the popover is opened and there are unread notifications, mark them as read after a short delay
    if (isOpen && unreadCount > 0) {
      const timer = setTimeout(() => {
        handleMarkAllAsRead();
      }, 2000); // 2-second delay
      return () => clearTimeout(timer);
    }
  }, [isOpen, unreadCount]);


  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h4 className="font-medium text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs">
              <CheckCheck className="w-4 h-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notif, index) => (
              <div key={notif.id}>
                <div className={cn(
                  "p-4 hover:bg-neutral-800/50",
                  !notif.read && "bg-blue-900/20"
                )}>
                  <p className="text-sm mb-1">{notif.message}</p>
                  <p className="text-xs text-muted-foreground">
                    <TimeAgo date={notif.createdAt?.toDate()} />
                  </p>
                </div>
                {index < notifications.length - 1 && <Separator />}
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
