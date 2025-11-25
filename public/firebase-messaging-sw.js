// public/firebase-messaging-sw.js

// Scripts para inicializar o Firebase e o Messaging
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

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

// Este Service Worker agora apenas inicializa o Firebase.
// O SDK do Firebase Messaging detectará automaticamente as mensagens recebidas
// com um campo 'notification' e as exibirá.
// A lógica customizada `onBackgroundMessage` foi removida para evitar a duplicação.
console.log('Firebase Messaging Service Worker initialized.');
