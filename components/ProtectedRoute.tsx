
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Session } from '@supabase/supabase-js';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null | undefined>(undefined);

    useEffect(() => {
        // Timeout to prevent infinite loading if Supabase fails
        const timeout = setTimeout(() => {
            if (session === undefined) {
                console.warn("Supabase session check timed out, redirecting to auth.");
                setSession(null);
            }
        }, 5000);

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            clearTimeout(timeout);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            clearTimeout(timeout);
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [session]);

    if (session === undefined) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/auth" />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
