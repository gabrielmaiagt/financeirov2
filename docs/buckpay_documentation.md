# Documentação do Webhook da Buckpay

#LZ  Webhooks

<aside>

**Webhook de venda pendente**

```jsx
{
  "event": "transaction.created",
  "data": {
    "id": "0cddda6a-5ecf-4bf1-b52d-ab0955b8cf26",
    "status": "pending",
    "payment_method": "pix",
    "total_amount": 5275,
    "net_amount": 4877,
    "offer": {
      "name": "Oferta 1",
      "discount_price": 2575,
      "quantity": 1
    },
    "buyer": {
      "name": "vitor",
      "email": "fulano@gmail.com",
      "phone": "5511123456789",
      "document": "12345678901"
    },
    "tracking": {
      "ref": null,
      "src": null,
      "sck": null,
      "utm": {
        "source": null,
        "medium": null,
        "campaign": null,
        "id": null,
        "term": null,
        "content": null
      }
    },
    "created_at": "2025-06-30T23:42:39.474Z"
  }
}
```

</aside>

<aside>

**Webhook de venda paga**

```jsx
{
  "event": "transaction.processed",
  "data": {
    "id": "0cddda6a-5ecf-4bf1-b52d-ab0955b8cf26",
    "status": "paid",
    "payment_method": "pix",
    "total_amount": 5275,
    "net_amount": 4877,
    "offer": {
      "name": "Oferta 1",
      "discount_price": 2575,
      "quantity": 1
    },
    "buyer": {
      "name": "vitor",
      "email": "fulano@gmail.com",
      "phone": "5511123456789",
      "document": "12345678901"
    },
    "tracking": {
      "ref": null,
      "src": null,
      "sck": null,
      "utm": {
        "source": null,
        "medium": null,
        "campaign": null,
        "id": null,
        "term": null,
        "content": null
      }
    },
    "created_at": "2025-06-30T23:42:39.474Z"
  }
}
```

</aside>
