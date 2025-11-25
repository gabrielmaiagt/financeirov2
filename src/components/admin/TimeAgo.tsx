'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

interface TimeAgoProps {
  timestamp: Timestamp;
}

const TimeAgo = ({ timestamp }: TimeAgoProps) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    // This effect runs only on the client, after hydration
    if (timestamp) {
        const date = timestamp.toDate();
        setTimeAgo(formatDistanceToNow(date, { addSuffix: true, locale: ptBR }));

        // Optional: set an interval to update the time ago string
        const interval = setInterval(() => {
             setTimeAgo(formatDistanceToNow(date, { addSuffix: true, locale: ptBR }));
        }, 60000); // update every minute

        return () => clearInterval(interval);
    }
  }, [timestamp]);

  // Render a placeholder or nothing on the server and initial client render
  if (!timeAgo) {
    return <span className="text-sm text-muted-foreground">agora mesmo</span>;
  }

  return <span className="text-sm text-muted-foreground">{timeAgo}</span>;
};

export default TimeAgo;
