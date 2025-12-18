
// This file is for server-side utilities
// We don't add 'use client' here so it can be used in API routes
import { Timestamp, collection, addDoc } from 'firebase/firestore';

// Função para logar erros no Firestore
export async function logError(firestore: any, error: any, context: string, details?: any, orgId?: string) {
  try {
    const errorLog = {
      timestamp: Timestamp.now(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: context,
      details: details || {},
    };

    // Scoped logging if orgId is provided
    if (orgId) {
      await addDoc(collection(firestore, 'organizations', orgId, 'error_logs'), errorLog);
    } else {
      await addDoc(collection(firestore, 'errorLogs'), errorLog);
    }

    console.error(`[${context}] Error logged to Firestore:`, error.message);
  } catch (logErr) {
    console.error(`[${context}] Failed to log error to Firestore:`, logErr);
    console.error(`[${context}] Original error:`, error.message);
  }
}

export const sendPushNotification = async (title: string, message: string, link: string = '/', baseUrl?: string, orgId?: string) => {
  if (!baseUrl) {
    console.error("❌ sendPushNotification failed: baseUrl is required to make the API call.");
    return;
  }

  const url = new URL('/api/send-push', baseUrl);

  console.log(`📲 Sending push notification request to: ${url.toString()}`);
  console.log(`   Title: ${title}`);
  console.log(`   Message: ${message}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, message, link, orgId }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Push notification sent successfully:`, data);
    } else {
      const errorText = await response.text();
      console.error(`❌ Push notification failed with status ${response.status}:`, errorText);
    }
  } catch (error) {
    console.error("❌ Failed to trigger send-push API:", error);
  }
};
