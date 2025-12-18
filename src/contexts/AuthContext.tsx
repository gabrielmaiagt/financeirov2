'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { useFirebase } from '@/firebase';

// This will now represent the Firebase User object directly, with custom claims.
export interface AuthUser extends User {
    // Custom claims or added properties
    orgId?: string;
    role?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { auth } = useFirebase();

    useEffect(() => {
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                // Check for custom claims
                const idTokenResult = await authUser.getIdTokenResult();
                const claims = idTokenResult.claims;

                const extendedUser = authUser as AuthUser;
                extendedUser.orgId = claims.orgId as string;
                extendedUser.role = claims.role as string;

                setUser(extendedUser);
                setIsAdmin(!!claims.admin);
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [auth]);

    const login = useCallback(async (email: string, password: string) => {
        if (!auth) {
            return { success: false, error: "Serviço de autenticação não disponível." };
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error: any) {
            let errorMessage = "Ocorreu um erro desconhecido.";
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = 'Email ou senha inválidos.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'O formato do email é inválido.';
                    break;
                default:
                    errorMessage = 'Falha no login. Por favor, tente novamente.';
                    break;
            }
            console.error('Login error:', error);
            return { success: false, error: errorMessage };
        }
    }, [auth]);

    const logout = useCallback(async () => {
        if (auth) {
            await signOut(auth);
        }
    }, [auth]);


    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
        login,
        logout,
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
