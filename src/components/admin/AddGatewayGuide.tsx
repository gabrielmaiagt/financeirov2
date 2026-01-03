import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AddGatewayGuide() {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Como Adicionar Novos Gateways de Pagamento</CardTitle>
                <CardDescription>Guia padronizado para integração de novos processadores de pagamento.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-6 text-sm">
                        <section>
                            <h3 className="text-lg font-semibold mb-2">1. Coleta de Informações</h3>
                            <p className="text-muted-foreground mb-2">Antes de iniciar, tenha em mãos:</p>
                            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                <li><strong>Nome do Gateway:</strong> (ex: "Stripe", "Hotmart")</li>
                                <li><strong>URL do Webhook:</strong> O endpoint que será criado (ex: <code>/api/webhooks/stripe</code>).</li>
                                <li><strong>Chave de Assinatura (Secret):</strong> Para validar a autenticidade das requisições.</li>
                                <li><strong>Documentação da API:</strong> Link para a referência oficial do payload de webhooks.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold mb-2">2. Estrutura do Payload</h3>
                            <p className="text-muted-foreground mb-2">Entenda o JSON enviado pelo gateway. Exemplo típico:</p>
                            <pre className="bg-neutral-900 p-4 rounded-md overflow-x-auto text-xs font-mono text-green-400">
                                {`{
  "event_type": "transaction.created",
  "data": {
    "id": "trans_12345",
    "amount": 100.00,
    "status": "paid",
    "customer": {
      "email": "cliente@exemplo.com",
      "name": "João Silva"
    },
    "metadata": {
      "utm_source": "facebook"
    }
  }
}`}
                            </pre>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold mb-2">3. Criando o Handler (Rota da API)</h3>
                            <p className="text-muted-foreground mb-2">
                                Crie um novo arquivo em <code>src/app/api/webhooks/[nome_gateway]/route.ts</code>.
                            </p>
                            <p className="text-muted-foreground mb-2">O arquivo deve seguir este padrão:</p>
                            <pre className="bg-neutral-900 p-4 rounded-md overflow-x-auto text-xs font-mono text-blue-400">
                                {`import { NextResponse } from 'next/server';
import { addVendaNoFirestore } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        
        // 1. Validação de Segurança (Opcional mas recomendado)
        // verifySignature(request);

        // 2. Normalização dos Dados
        const venda = {
            id: payload.data.id,
            valor: payload.data.amount,
            status: payload.data.status === 'paid' ? 'approved' : 'pending',
            cliente_email: payload.data.customer.email,
            cliente_nome: payload.data.customer.name,
            gateway: 'NOVO_GATEWAY',
            created_at: new Date().toISOString(),
            utm_source: payload.data.metadata?.utm_source || 'direct'
        };

        // 3. Salvar no Banco de Dados
        await addVendaNoFirestore(venda);

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}`}
                            </pre>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold mb-2">4. Testes e Validação</h3>
                            <p className="text-muted-foreground mb-2">
                                Utilize ferramentas como Postman ou o comando <code>curl</code> para testar localmente antes de ir para produção.
                            </p>
                            <pre className="bg-neutral-900 p-4 rounded-md overflow-x-auto text-xs font-mono text-yellow-400">
                                {`curl -X POST http://localhost:3000/api/webhooks/novo-gateway \\
-H "Content-Type: application/json" \\
-d '{"event_type":"test", "data": {"id":"123", "amount":50}}'`}
                            </pre>
                        </section>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
