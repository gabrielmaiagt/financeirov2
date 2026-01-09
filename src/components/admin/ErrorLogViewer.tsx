'use client';

import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ServerCrash, Smartphone, AlertCircle, Clock } from 'lucide-react';
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
  const { orgId } = useOrganization();

  const errorLogsQuery = useMemoFirebase(
    () => (firestore && orgId ? query(collection(firestore, 'organizations', orgId, 'error_logs'), orderBy('timestamp', 'desc')) : null),
    [firestore, orgId]
  );

  const { data: errorLogs, isLoading } = useCollection<ErrorLog>(errorLogsQuery);

  const getContextBadge = (context: string) => {
    if (context.includes('api')) {
      return (
        <Badge variant="destructive" className="whitespace-nowrap bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
          <ServerCrash className="w-3 h-3 mr-1.5" /> Backend
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="whitespace-nowrap bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
        <Smartphone className="w-3 h-3 mr-1.5" /> Frontend
      </Badge>
    );
  };

  return (
    <Card className="border-neutral-800 bg-neutral-950/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <CardTitle className="text-xl">Log de Erros do Sistema</CardTitle>
        </div>
        <CardDescription className="text-base">
          Visualize os erros que ocorreram no sistema para ajudar na depuração.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border border-neutral-800 rounded-lg max-h-[600px] overflow-y-auto bg-neutral-900/30">
          {isLoading && (
            <div className="flex justify-center items-center h-32 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
            </div>
          )}
          {!isLoading && (!errorLogs || errorLogs.length === 0) && (
            <div className="flex flex-col justify-center items-center h-32 text-center gap-2 py-8">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhum erro registrado. Tudo certo por aqui! ✨</p>
            </div>
          )}
          {!isLoading && errorLogs && errorLogs.length > 0 && (
            <Accordion type="multiple" className="divide-y divide-neutral-800">
              {errorLogs.map((log) => (
                <AccordionItem value={log.id} key={log.id} className="border-b-0">
                  <AccordionTrigger className="grid grid-cols-[auto_auto_1fr] gap-4 items-center text-left px-5 py-4 hover:bg-neutral-800/50 hover:no-underline transition-colors rounded-md mx-1">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <TimeAgo timestamp={log.timestamp} />
                    </div>
                    <div className="flex items-center">
                      {getContextBadge(log.context)}
                    </div>
                    <span className="font-mono text-sm truncate text-neutral-300">{log.message}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-5 pb-4 pt-2">
                      <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-base flex items-center gap-2 text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            Detalhes do Erro
                          </h4>
                          <div className="pl-6 space-y-2">
                            <p className="text-sm">
                              <span className="font-semibold text-muted-foreground">Mensagem:</span>{' '}
                              <span className="font-mono text-sm text-neutral-200">{log.message}</span>
                            </p>
                          </div>
                        </div>

                        {log.stack && (
                          <div className="space-y-2 pt-3 border-t border-neutral-800">
                            <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wide">Stack Trace</p>
                            <pre className="text-xs whitespace-pre-wrap bg-black/50 border border-neutral-800 p-4 rounded-md font-mono text-neutral-300 leading-relaxed overflow-x-auto">
                              <code>{log.stack}</code>
                            </pre>
                          </div>
                        )}

                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-neutral-800">
                            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Detalhes Adicionais</p>
                            <pre className="text-xs whitespace-pre-wrap bg-black/50 border border-neutral-800 p-4 rounded-md font-mono text-neutral-300 leading-relaxed overflow-x-auto">
                              <code>{JSON.stringify(log.details, null, 2)}</code>
                            </pre>
                          </div>
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
