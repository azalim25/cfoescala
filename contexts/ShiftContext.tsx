import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Shift } from '../types';
import { supabase } from '../supabase';

interface ShiftContextType {
    shifts: Shift[];
    addShifts: (newShifts: Shift[]) => Promise<void>;
    clearShifts: () => void;
    isLoading: boolean;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchShifts = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('shifts')
                .select('*');

            if (error) throw error;

            if (data) {
                const formattedShifts: Shift[] = data.map(s => ({
                    id: s.id,
                    date: s.date,
                    type: s.type as any,
                    startTime: s.start_time,
                    endTime: s.end_time,
                    location: s.location,
                    militaryId: s.military_id,
                    status: s.status as any
                }));
                setShifts(formattedShifts);
            }
        } catch (error) {
            console.error('Error fetching shifts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    const addShifts = async (newShifts: Shift[]) => {
        try {
            // 1. Identify dates to clear
            const datesToOverwrite = Array.from(new Set(newShifts.map(s => s.date)));

            // 2. Delete existing shifts for these dates
            if (datesToOverwrite.length > 0) {
                const { error: deleteError } = await supabase
                    .from('shifts')
                    .delete()
                    .in('date', datesToOverwrite);

                if (deleteError) throw deleteError;
            }

            // 3. Prepare new shifts for insertion (omit id to let DB generate UUID)
            const dbShifts = newShifts.map(s => ({
                military_id: s.militaryId,
                date: s.date,
                type: s.type,
                start_time: s.startTime,
                end_time: s.endTime,
                location: s.location,
                status: s.status
            }));

            // 4. Insert new shifts
            const { error: insertError } = await supabase
                .from('shifts')
                .insert(dbShifts);

            if (insertError) throw insertError;

            // 5. Refresh local state
            await fetchShifts();

        } catch (error) {
            console.error('Error saving shifts:', error);
            alert('Erro ao salvar escala. Verifique o console.');
        }
    };

    const clearShifts = async () => {
        // Optionally implement full wipe if needed, currently just clears local
        setShifts([]);
    };

    return (
        <ShiftContext.Provider value={{ shifts, addShifts, clearShifts, isLoading }}>
            {children}
        </ShiftContext.Provider>
    );
};

export const useShift = () => {
    const context = useContext(ShiftContext);
    if (context === undefined) {
        throw new Error('useShift must be used within a ShiftProvider');
    }
    return context;
};
