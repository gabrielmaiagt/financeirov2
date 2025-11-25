'use client';

import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitPullRequestArrow, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import TimeAgo from './TimeAgo';

export interface WebhookRequest {
  id: string;
  receivedAt: Timestamp;
  source: string;
  headers: any;
  body: any;
  processingStatus: 'success' | 'ignored' | 'error' | 'pending';
}

const WebhookRequestViewer = () => {
  const firestore = useFirestore();

  const webhookRequestsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'webhookRequests'), orderBy('receivedAt', 'desc')) : null),
    [firestore]
  );

  const { data: webhookRequests, isLoading } = useCollection<WebhookRequest>(webhookRequestsQuery);

  const getStatusBadge = (status: WebhookRequest['processingStatus']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Sucesso</Badge>;
      case 'ignored':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Ignorado</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspektor de Webhooks</CardTitle>
        <CardDescription>
          Visualize todas as requisições de webhooks recebidas pelo sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg max-h-[500px] overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center items-center h-24 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            </div>
          )}
          {!isLoading && (!webhookRequests || webhookRequests.length === 0) && (
            <div className="flex justify-center items-center h-24 text-center text-muted-foreground">
              Nenhuma requisição de webhook registrada.
            </div>
          )}
          {!isLoading && webhookRequests && (
            <Accordion type="multiple" className="divide-y divide-border">
              {webhookRequests.map((req) => (
                <AccordionItem value={req.id} key={req.id} className="border-b-0">
                  <AccordionTrigger className="grid grid-cols-[150px_120px_100px_1fr] items-center text-left p-4 hover:bg-muted/50 hover:no-underline">
                      <TimeAgo timestamp={req.receivedAt} />
                      <Badge variant="outline" className="whitespace-nowrap w-fit">
                          <GitPullRequestArrow className="w-3 h-3 mr-1" /> {req.source}
                      </Badge>
                      <span>{getStatusBadge(req.processingStatus)}</span>
                      <span className="font-mono text-sm truncate">
                        {req.body?.event || req.body?.status || `Requisição de ${req.source}`}
                      </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-4 pt-0 bg-muted/20">
                      <div className="p-4 bg-neutral-900 rounded-md space-y-4">
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground">Headers</h4>
                            <pre className="mt-1 text-xs whitespace-pre-wrap bg-black p-2 rounded-md font-mono">
                                <code>{JSON.stringify(req.headers, null, 2)}</code>
                            </pre>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground">Body</h4>
                            <pre className="mt-1 text-xs whitespace-pre-wrap bg-black p-2 rounded-md font-mono">
                                <code>{JSON.stringify(req.body, null, 2)}</code>
                            </pre>
                        </div>
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

export default WebhookRequestViewer;
