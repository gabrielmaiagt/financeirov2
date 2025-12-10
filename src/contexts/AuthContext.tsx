'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface AuthUser {
    id: string;
    email: string;
    username?: string;
    name: string;
    role: 'admin' | 'user';
    orgId: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (email: string, password: string, orgId: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'auth_session';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        const storedSession = localStorage.getItem(SESSION_KEY);
        if (storedSession) {
            try {
                const parsedUser = JSON.parse(storedSession);
                setUser(parsedUser);
            } catch (e) {
                localStorage.removeItem(SESSION_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string, orgId: string) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, orgId }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error || 'Erro ao fazer login' };
            }

            const authUser: AuthUser = {
                id: data.user.id,
                email: data.user.email,
                username: data.user.username,
                name: data.user.name,
                role: data.user.role,
                orgId: data.user.orgId,
            };

            setUser(authUser);
            localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(SESSION_KEY);
    }, []);

    const updateUser = useCallback((updatedUser: AuthUser) => {
        setUser(updatedUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export { AuthContext };
