'use client';

// This file is for client-side utilities that can be safely used in components.

/**
 * Sends a push notification by calling the server-side API route.
 * This is a "fire and forget" operation from the client's perspective.
 * @param title The title of the push notification.
 * @param message The body/message of the push notification.
 * @param link An optional link to open when the notification is clicked.
 */
export const sendPushNotification = (title: string, message: string, link: string = '/') => {
    // We don't await this or handle its response on the client.
    // The API route will handle logging any errors that occur during the process.
    fetch('/api/send-push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, message, link }),
    }).catch(error => {
        // Log a network error if the fetch itself fails.
        // This won't catch API-level errors (like 4xx or 5xx), which are handled server-side.
        console.error("Failed to send push notification request:", error);
    });
};
