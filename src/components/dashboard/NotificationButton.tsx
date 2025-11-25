'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { requestNotificationPermission } from '@/firebase/notifications';
import { useToast } from '@/hooks/use-toast';

const NotificationButton = () => {
    const { toast } = useToast();
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | 'loading'>('loading');

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        } else {
            setPermission('unsupported');
        }
    }, []);

    const handleRequestPermission = async () => {
        const success = await requestNotificationPermission();
        if (success) {
            toast({
                title: "Sucesso!",
                description: "As notificações foram ativadas neste dispositivo.",
            });
        } else {
             toast({
                variant: "destructive",
                title: "Falha ao Ativar Notificações",
                description: "Você precisa permitir as notificações nas configurações do seu navegador ou o serviço pode estar indisponível.",
            });
        }
        // After the request, update the state to reflect the new permission status
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    };

    if (permission === 'loading') {
        return <Button variant="outline" disabled>Verificando...</Button>;
    }
    
    if (permission === 'unsupported') {
        return <Button variant="outline" disabled title="Notificações não suportadas neste navegador"><BellOff className="mr-2 h-4 w-4" /> Não Suportado</Button>;
    }

    if (permission === 'granted') {
        return <Button variant="outline" disabled><Bell className="mr-2 h-4 w-4" /> Notificações Ativas</Button>;
    }
    
    return (
        <Button variant="outline" onClick={handleRequestPermission}>
            <Bell className="mr-2 h-4 w-4" /> Ativar Notificações
        </Button>
    );
};

export default NotificationButton;
