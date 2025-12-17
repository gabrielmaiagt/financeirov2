'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, signInWithCustomToken, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { useFirebase } from '@/firebase';

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
    firebaseUser: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'auth_session';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { auth } = useFirebase();

    // 1. Listen for Firebase Auth state changes
    useEffect(() => {
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setFirebaseUser(authUser);
            if (!authUser) {
                // If firebase disconnects, we should clear our app session too?
                // For now, let's keep them somewhat sync but rely on local storage for app user metadata
                // to avoid flickering if firebase token refresh happens.
            }
        });

        return () => unsubscribe();
    }, [auth]);

    // 2. Restore app session on mount
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

    const login = useCallback(async (email: string, password: string) => {
        // Clear previous session first
        if (auth) {
            await signOut(auth);
        }
        localStorage.removeItem(SESSION_KEY);
        setUser(null);

        try {
            // 1. Backend Login -> Get Custom Token
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error || 'Erro ao fazer login' };
            }

            // 2. Client Login -> SignInWithCustomToken
            if (auth && data.token) {
                try {
                    await signInWithCustomToken(auth, data.token);
                } catch (firebaseError: any) {
                    console.error("Firebase Auth Error:", firebaseError);
                    return { success: false, error: 'Falha na autenticação Firebase: ' + firebaseError.message };
                }
            } else {
                console.error("Auth instance missing or token missing");
                return { success: false, error: 'Erro de configuração de autenticação' };
            }

            // 3. Set App User Session
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
    }, [auth]);

    const logout = useCallback(async () => {
        if (auth) {
            await signOut(auth);
        }
        setUser(null);
        localStorage.removeItem(SESSION_KEY);
    }, [auth]);

    const updateUser = useCallback((updatedUser: AuthUser) => {
        setUser(updatedUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    }, []);

    const value: AuthContextType = {
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user && !!firebaseUser, // Strictly require both for authenticated access
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
