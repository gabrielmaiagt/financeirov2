// public/firebase-messaging-sw.js

// Scripts para inicializar o Firebase e o Messaging (versão modular)
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

// As credenciais são públicas e seguras para serem expostas no lado do cliente.
const firebaseConfig = {
  apiKey: "AIzaSyBSNeb5NQRxbqRffdxT0UzEgq7ysggB12s",
  authDomain: "studio-6692153313-b653e.firebaseapp.com",
  projectId: "studio-6692153313-b653e",
  messagingSenderId: "549989476303",
  appId: "1:549989476303:web:39abb8c2d1cdf27b4954ba"
};

// Inicializa o app Firebase
firebase.initializeApp(firebaseConfig);

// Recupera uma instância do Firebase Messaging para que possa lidar com as mensagens em segundo plano.
const messaging = firebase.messaging();

console.log('🔔 Firebase Messaging Service Worker initialized and ready for background messages!');

// Handler para mensagens em background (quando o app está fechado ou em background)
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Background message received:', payload);

  // Se o payload já possui a propriedade 'notification', o SDK do Firebase (e o navegador)
  // geralmente já exibem a notificação automaticamente.
  // Para evitar duplicação, só exibimos manualmente se NÃO houver 'notification' (ou seja, mensagem apenas de dados).
  if (payload.notification) {
    console.log('[Service Worker] Notification handled automatically by Firebase SDK.');
    return;
  }

  const notificationTitle = payload.data?.title || 'Nova notificação';
  const notificationOptions = {
    body: payload.data?.body || 'Você tem uma nova mensagem',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: payload.messageId || 'notification',
    requireInteraction: true,
    data: {
      url: payload.fcmOptions?.link || payload.data?.link || '/',
      ...payload.data
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler para quando o usuário clica na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received:', event.notification);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  // Abre a URL quando o usuário clica na notificação
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já existe uma janela/aba aberta, foca nela
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => client.navigate(urlToOpen));
          }
        }
        // Caso contrário, abre uma nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
