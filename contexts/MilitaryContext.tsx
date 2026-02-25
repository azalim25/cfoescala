import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Military } from '../types';
import { supabase } from '../supabase';

interface MilitaryContextType {
    militaries: Military[];
    addMilitary: (military: Omit<Military, 'id'>) => void;
    updateMilitary: (military: Military) => void;
    deleteMilitary: (id: string) => void;
}

const MilitaryContext = createContext<MilitaryContextType | undefined>(undefined);

export const MilitaryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [militaries, setMilitaries] = useState<Military[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMilitaries();
    }, []);

    const fetchMilitaries = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('militaries')
                .select('*')
                .order('antiguidade', { ascending: true, nullsFirst: false })
                .order('name', { ascending: true });

            if (error) {
                console.error('Erro ao buscar militares:', error);
            } else if (data) {
                const mappedData: Military[] = data.map(m => ({
                    id: m.id,
                    name: m.name,
                    fullName: m.full_name || '',
                    rank: m.rank,
                    firefighterNumber: m.firefighter_number,
                    contact: m.contact || '',
                    battalion: m.battalion || '',
                    antiguidade: m.antiguidade || undefined
                }));
                setMilitaries(mappedData);
            }
        } catch (error) {
            console.error('Erro inesperado ao buscar militares:', error);
        } finally {
            setLoading(false);
        }
    };

    const addMilitary = async (military: Omit<Military, 'id'>) => {
        const { data, error } = await supabase
            .from('militaries')
            .insert([{
                name: military.name,
                full_name: military.fullName,
                rank: military.rank,
                firefighter_number: military.firefighterNumber,
                contact: military.contact,
                battalion: military.battalion,
                antiguidade: military.antiguidade
            }])
            .select();

        if (error) {
            console.error('Erro ao adicionar militar:', error);
            alert('Erro ao adicionar militar: ' + error.message);
        } else if (data) {
            fetchMilitaries();
        }
    };

    const updateMilitary = async (military: Military) => {
        const { error } = await supabase
            .from('militaries')
            .update({
                name: military.name,
                full_name: military.fullName,
                rank: military.rank,
                firefighter_number: military.firefighterNumber,
                contact: military.contact,
                battalion: military.battalion,
                antiguidade: military.antiguidade
            })
            .eq('id', military.id);

        if (error) {
            console.error('Erro ao atualizar militar:', error);
        } else {
            fetchMilitaries();
        }
    };

    const deleteMilitary = async (id: string) => {
        const { error } = await supabase
            .from('militaries')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar militar:', error);
        } else {
            setMilitaries((prev) => prev.filter((m) => m.id !== id));
        }
    };

    return (
        <MilitaryContext.Provider value={{ militaries, addMilitary, updateMilitary, deleteMilitary }}>
            {children}
        </MilitaryContext.Provider>
    );
};

export const useMilitary = () => {
    const context = useContext(MilitaryContext);
    if (context === undefined) {
        throw new Error('useMilitary must be used within a MilitaryProvider');
    }
    return context;
};
