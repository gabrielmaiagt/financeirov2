'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoading) return;

        // Check if current route is public
        const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

        if (!isAuthenticated && !isPublicRoute) {
            // Redirect to login if not authenticated
            router.push('/login');
            return;
        }

        if (isAuthenticated && isPublicRoute) {
            // Redirect to home if already authenticated and on public route
            router.push('/');
            return;
        }

        if (requireAdmin && !isAdmin) {
            // Redirect to home if admin required but user is not admin
            router.push('/');
            return;
        }
    }, [isLoading, isAuthenticated, isAdmin, requireAdmin, pathname, router]);

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Don't render children until auth check is complete
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

    if (!isAuthenticated && !isPublicRoute) {
        return null;
    }

    if (requireAdmin && !isAdmin) {
        return null;
    }

    return <>{children}</>;
}
