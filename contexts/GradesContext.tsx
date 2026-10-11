import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';
import { Grade } from '../types';
import { fetchAllRows } from '../utils/supabaseUtils';
import { useAuth } from './AuthContext';

interface GradesContextType {
    grades: Grade[];
    isLoading: boolean;
    fetchGrades: () => Promise<void>;
    setGrade: (militaryId: string, disciplineId: string, score: number | null) => Promise<void>;
}

const GradesContext = createContext<GradesContextType | undefined>(undefined);

export const GradesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { session, loading: authLoading } = useAuth();
    const [grades, setGrades] = useState<Grade[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchGrades = async () => {
        try {
            setIsLoading(true);
            const data = await fetchAllRows('grades', '*');
            setGrades(data.map(g => ({
                id: g.id,
                militaryId: g.military_id,
                disciplineId: g.discipline_id,
                score: g.score,
                updatedAt: g.updated_at,
            })));
        } catch (error) {
            console.error('Erro ao buscar notas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // A leitura de notas agora exige sessão autenticada (RLS). Esperar o
        // AuthContext terminar de restaurar a sessão evita buscar antes do
        // token estar pronto (o que voltaria uma lista vazia) e refaz a
        // busca sempre que o usuário logado mudar.
        if (!authLoading) {
            fetchGrades();
        }
    }, [authLoading, session?.user?.id]);

    const setGrade = async (militaryId: string, disciplineId: string, score: number | null) => {
        const { error } = await supabase
            .from('grades')
            .upsert(
                { military_id: militaryId, discipline_id: disciplineId, score, updated_at: new Date().toISOString() },
                { onConflict: 'military_id,discipline_id' }
            );

        if (error) {
            console.error('Erro ao salvar nota:', error);
            alert('Erro ao salvar nota: ' + error.message);
        } else {
            await fetchGrades();
        }
    };

    return (
        <GradesContext.Provider value={{ grades, isLoading, fetchGrades, setGrade }}>
            {children}
        </GradesContext.Provider>
    );
};

export const useGrades = () => {
    const context = useContext(GradesContext);
    if (context === undefined) {
        throw new Error('useGrades must be used within a GradesProvider');
    }
    return context;
};
