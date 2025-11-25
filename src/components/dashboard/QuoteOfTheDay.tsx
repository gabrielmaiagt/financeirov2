'use client';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { FraseDoDia } from './QuoteCard';

const QuoteOfTheDay = () => {
  const firestore = useFirestore();
  const [quote, setQuote] = useState<FraseDoDia | null>(null);

  const quotesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'frases')) : null),
    [firestore]
  );
  const { data: quotes, isLoading } = useCollection<FraseDoDia>(quotesQuery);

  useEffect(() => {
    // This logic now runs only on the client, after initial hydration
    if (quotes && quotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setQuote(quotes[randomIndex]);
    }
  }, [quotes]); // It will run when quotes are loaded

  // On server and initial client render, show a skeleton or return null
  if (isLoading || !quote) {
    return (
        <div className="hidden lg:flex flex-col items-end justify-center text-right w-48 h-12">
            <Skeleton className="w-full h-4 mb-1" />
            <Skeleton className="w-1/2 h-3" />
        </div>
    );
  }

  return (
    <div className="hidden lg:flex flex-col items-end justify-center text-right">
      <p className="text-sm italic text-muted-foreground">"{quote.text}"</p>
      {quote.author && <span className="text-xs font-semibold text-primary/80">- {quote.author}</span>}
    </div>
  );
};

export default QuoteOfTheDay;
