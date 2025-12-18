import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        projectId: process.env.FIREBASE_PROJECT_ID || 'missing',
        email: process.env.FIREBASE_CLIENT_EMAIL || 'missing',
        hasKey: !!process.env.FIREBASE_PRIVATE_KEY,
        nodeEnv: process.env.NODE_ENV
    });
}
