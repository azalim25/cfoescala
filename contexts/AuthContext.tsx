
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthContextType {
    session: Session | null;
    isGuest: boolean;
    isModerator: boolean;
    role: string | null;
    loginAsGuest: () => void;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [isGuest, setIsGuest] = useState<boolean>(false);
    const [role, setRole] = useState<string | null>(null);
    const [isModerator, setIsModerator] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    const fetchUserRole = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (data && !error) {
            setRole(data.role);
            setIsModerator(data.role === 'moderator');
        } else {
            setRole('visitor');
            setIsModerator(false);
        }
    };

    useEffect(() => {
        // Check for guest identifier in local storage on load
        const guestStored = localStorage.getItem('isGuest') === 'true';
        setIsGuest(guestStored);

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                if (session?.user) {
                    await fetchUserRole(session.user.id);
                }
            } catch (error) {
                console.error('Erro ao inicializar autenticação:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                setSession(session);
                if (session?.user) {
                    await fetchUserRole(session.user.id);
                } else {
                    setRole(null);
                    setIsModerator(false);
                }
                // If we get a real session, we are definitely NOT a guest
                if (session) {
                    setIsGuest(false);
                    localStorage.removeItem('isGuest');
                }
            } catch (error) {
                console.error('Erro ao alterar estado de autenticação:', error);
            } finally {
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loginAsGuest = () => {
        setIsGuest(true);
        localStorage.setItem('isGuest', 'true');
    };

    const logout = async () => {
        if (isGuest) {
            setIsGuest(false);
            localStorage.removeItem('isGuest');
        } else {
            await supabase.auth.signOut();
        }
    };

    return (
        <AuthContext.Provider value={{ session, isGuest, isModerator, role, loginAsGuest, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
