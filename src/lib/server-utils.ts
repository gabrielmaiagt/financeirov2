
// This file is for server-side utilities
// We don't add 'use client' here so it can be used in API routes
import { Timestamp } from 'firebase-admin/firestore';

// Função para logar erros no Firestore
export async function logError(firestore: any, error: any, context: string, details?: any) {
  try {
    const errorLog = {
      timestamp: Timestamp.now(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: context,
      details: details || {},
    };
    await firestore.collection('errorLogs').add(errorLog);
    console.error(`[${context}] Error logged to Firestore:`, error.message);
  } catch (logErr) {
    console.error(`[${context}] Failed to log error to Firestore:`, logErr);
    console.error(`[${context}] Original error:`, error.message);
  }
}

export const sendPushNotification = (title: string, message: string, link: string = '/', baseUrl?: string) => {
    if (!baseUrl) {
        console.error("sendPushNotification failed: baseUrl is required to make the API call.");
        return;
    }
    // Construct the full URL for the API route
    const url = new URL('/api/send-push', baseUrl);

    try {
        // We don't await this, just fire and forget.
        // The webhook needs to respond quickly.
        fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, message, link }),
        });
    } catch (error) {
        console.error("Failed to trigger send-push API:", error);
    }
};
