
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthContextType {
    session: Session | null;
    isGuest: boolean;
    loginAsGuest: () => void;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [isGuest, setIsGuest] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for guest identifier in local storage on load
        const guestStored = localStorage.getItem('isGuest') === 'true';
        setIsGuest(guestStored);

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            // If we get a real session, we are definitely NOT a guest
            if (session) {
                setIsGuest(false);
                localStorage.removeItem('isGuest');
            }
            setLoading(false);
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
        <AuthContext.Provider value={{ session, isGuest, loginAsGuest, logout, loading }}>
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
