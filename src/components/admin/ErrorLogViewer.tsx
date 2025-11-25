'use client';

import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ServerCrash, Smartphone } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import TimeAgo from './TimeAgo';

export interface ErrorLog {
  id: string;
  timestamp: Timestamp;
  message: string;
  stack?: string;
  context: string;
  details?: any;
}

const ErrorLogViewer = () => {
  const firestore = useFirestore();

  const errorLogsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'errorLogs'), orderBy('timestamp', 'desc')) : null),
    [firestore]
  );

  const { data: errorLogs, isLoading } = useCollection<ErrorLog>(errorLogsQuery);

  const getContextBadge = (context: string) => {
    if (context.includes('api')) {
      return (
        <Badge variant="destructive" className="whitespace-nowrap">
          <ServerCrash className="w-3 h-3 mr-1" /> Backend
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="whitespace-nowrap">
        <Smartphone className="w-3 h-3 mr-1" /> Frontend
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log de Erros do Sistema</CardTitle>
        <CardDescription>
          Visualize os erros que ocorreram no sistema para ajudar na depuração.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg max-h-[500px] overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center items-center h-24 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            </div>
          )}
          {!isLoading && (!errorLogs || errorLogs.length === 0) && (
            <div className="flex justify-center items-center h-24 text-center text-muted-foreground">
              Nenhum erro registrado. Tudo certo por aqui!
            </div>
          )}
          {!isLoading && errorLogs && (
            <Accordion type="multiple" className="divide-y divide-border">
              {errorLogs.map((log) => (
                <AccordionItem value={log.id} key={log.id} className="border-b-0">
                  <AccordionTrigger className="grid grid-cols-[150px_120px_1fr] items-center text-left p-4 hover:bg-muted/50 hover:no-underline">
                      <TimeAgo timestamp={log.timestamp} />
                      <span>{getContextBadge(log.context)}</span>
                      <span className="font-mono text-sm truncate">{log.message}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-4 pt-0 bg-muted/20">
                      <div className="p-4 bg-neutral-900 rounded-md">
                        <h4 className="font-semibold mb-2">Detalhes do Erro</h4>
                        <p className="text-sm font-semibold mb-2">Mensagem: <span className="font-mono text-sm">{log.message}</span></p>
                        {log.stack && (
                          <>
                            <p className="text-xs font-semibold text-muted-foreground">Stack Trace:</p>
                            <pre className="mt-1 text-xs whitespace-pre-wrap bg-black p-2 rounded-md font-mono">
                              <code>{log.stack}</code>
                            </pre>
                          </>
                        )}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <>
                            <p className="text-xs font-semibold text-muted-foreground mt-4">Detalhes Adicionais:</p>
                            <pre className="mt-1 text-xs whitespace-pre-wrap bg-black p-2 rounded-md font-mono">
                              <code>{JSON.stringify(log.details, null, 2)}</code>
                            </pre>
                          </>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorLogViewer;
