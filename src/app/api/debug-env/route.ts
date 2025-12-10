import { NextResponse } from 'next/server';

export async function GET() {
    const envKeys = Object.keys(process.env).filter(key => key.startsWith('FIREBASE_'));
    const envStatus = envKeys.reduce((acc, key) => {
        acc[key] = !!process.env[key] ? 'Present' : 'Missing';
        return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
        envStatus,
        NODE_ENV: process.env.NODE_ENV,
    });
}
