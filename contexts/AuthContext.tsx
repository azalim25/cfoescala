
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthContextType {
    session: Session | null;
    isGuest: boolean;
    isModerator: boolean;
    hasCfo1Access: boolean;
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
    const [hasCfo1Access, setHasCfo1Access] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    const fetchUserRole = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('role, name, firefighter_number')
            .eq('id', userId)
            .single();

        if (data && !error) {
            const isModeratorUser = data.role === 'moderator' ||
                data.name?.toLowerCase().includes('azalim') ||
                data.name?.toLowerCase().includes('vilela') ||
                data.firefighter_number?.includes('1800572');
            setRole(isModeratorUser ? 'moderator' : (data.role || 'user'));
            setIsModerator(isModeratorUser);
        } else {
            setRole('visitor');
            setIsModerator(false);
        }

        // Acesso à sessão CFO I é validado no banco (RLS), não aqui — esta
        // chamada só reflete, para a navegação/UI, o que o servidor já decidiu.
        const { data: cfo1Access } = await supabase.rpc('has_cfo1_access');
        setHasCfo1Access(!!cfo1Access);
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
                    // Esperado: ProtectedRoute decide requireModerator/requireCfo1Access
                    // assim que loading vira false, então o papel/acesso do usuário
                    // precisa estar resolvido antes disso — sem isso, a checagem roda
                    // com os valores padrão (false) e redireciona quem tem acesso.
                    await fetchUserRole(session.user.id);
                }
            } catch (error) {
                console.error('Erro ao inicializar autenticação:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // IMPORTANTE: o callback do onAuthStateChange nunca pode dar await em
        // chamadas do Supabase (from/rpc/etc.) diretamente — o cliente usa um
        // lock interno para serializar o estado de auth, e aguardar aqui
        // trava esse lock e trava getSession()/initAuth() num deadlock. O
        // trabalho assíncrono é adiado com setTimeout para rodar só depois
        // que o callback (síncrono) já devolveu o controle.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                setTimeout(() => { fetchUserRole(session.user.id); }, 0);
            } else {
                setRole(null);
                setIsModerator(false);
                setHasCfo1Access(false);
            }
            // If we get a real session, we are definitely NOT a guest
            if (session) {
                setIsGuest(false);
                localStorage.removeItem('isGuest');
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
        <AuthContext.Provider value={{ session, isGuest, isModerator, hasCfo1Access, role, loginAsGuest, logout, loading }}>
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
