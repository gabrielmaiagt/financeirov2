# Documentação do Webhook da Paradise

Webhooks (Postbacks)
Quando o status de uma transação muda, enviamos uma notificação POST para a sua URL de webhook. Seu servidor deve responder com um status HTTP 200 OK para confirmar o recebimento.

Eventos de Webhook
O campo status no payload do webhook indicará o novo estado da transação. Os valores possíveis são:

pending: A transação foi criada e aguarda pagamento.
approved: O pagamento foi confirmado com sucesso.
failed: O pagamento foi recusado, cancelado ou expirou.
refunded: O valor da transação foi devolvido ao cliente.
Exemplo de Payload (Pagamento Aprovado)
{
  "transaction_id": "469",
  "external_id": "a9dc785ae27c286341b4dcb9a3c",
  "status": "approved",
  "amount": 690,
  "payment_method": "pix",
  "customer": {
    "name": "client joao",
    "email": "email@gmail.com",
    "document": "01111111111",
    "phone": "numero"
  },
  "raw_status": "COMPLETED",
  "webhook_type": "transaction",
  "timestamp": "2025-09-09 09:17:56",
  "tracking": {
    "utm_source": "Teste"
    "utm_campaign": "Teste"
    "utm_medium": "Teste"   
    "utm_content": "Teste"
    "utm_term": "Teste"
    "src": "Teste"
    "sck": "Teste"
                
  }
}
