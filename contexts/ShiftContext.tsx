import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Shift } from '../types';
import { supabase } from '../supabase';

interface ShiftContextType {
    shifts: Shift[];
    addShifts: (newShifts: Shift[]) => Promise<void>;
    createShift: (shift: Omit<Shift, 'id'>) => Promise<void>;
    updateShift: (id: string, updates: Partial<Shift>) => Promise<void>;
    removeShift: (id: string) => Promise<void>;
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
            const datesToOverwrite = Array.from(new Set(newShifts.map(s => s.date)));
            if (datesToOverwrite.length > 0) {
                const { error: deleteError } = await supabase
                    .from('shifts')
                    .delete()
                    .in('date', datesToOverwrite);

                if (deleteError) throw deleteError;
            }

            // 3. Prepare new shifts
            const dbShifts = newShifts.map(s => ({
                military_id: s.militaryId,
                date: s.date,
                type: s.type,
                start_time: s.startTime,
                end_time: s.endTime,
                location: s.location,
                status: s.status
            }));

            // 4. Insert
            const { error: insertError } = await supabase
                .from('shifts')
                .insert(dbShifts);

            if (insertError) throw insertError;

            await fetchShifts();

        } catch (error) {
            console.error('Error saving shifts:', error);
            alert('Erro ao salvar escala. Verifique o console.');
        }
    };

    const createShift = async (shift: Omit<Shift, 'id'>) => {
        try {
            const dbShift = {
                military_id: shift.militaryId,
                date: shift.date,
                type: shift.type,
                start_time: shift.startTime,
                end_time: shift.endTime,
                location: shift.location,
                status: shift.status
            };

            const { error } = await supabase.from('shifts').insert(dbShift);
            if (error) throw error;
            await fetchShifts();
        } catch (error) {
            console.error('Error creating shift:', error);
            alert('Erro ao adicionar serviço.');
        }
    };

    // I need to add `createShift` to the Context Interface if I use it.
    // Wait, I can just overload `addShifts` or add an argument `overwrite: boolean`.
    // Let's just create `updateShift` and `removeShift` as requested, and `addSingleShift`.

    // Simpler: I'll expose `addShifts` (overwrite) and `appendShift` (single, no overwrite).

    // Let's map the interface to:
    // addShifts (bulk overwrite)
    // updateShift
    // removeShift
    // appendShift (new)

    // ... Implementation continued below in replacement ...

    // Actually, to minimize interface churn, I will rename the new function to `createShift` 
    // and add it to the interface.

    // Wait, the prompt instruction was just updateShift and removeShift.
    // But for "Add" on dashboard, I need a non-destructive add.

    // Let's add `createShift` to the interface.

    const updateShift = async (id: string, updates: Partial<Shift>) => {
        try {
            const dbUpdates: { [key: string]: any } = {};
            if (updates.militaryId !== undefined) dbUpdates.military_id = updates.militaryId;
            if (updates.date !== undefined) dbUpdates.date = updates.date;
            if (updates.type !== undefined) dbUpdates.type = updates.type;
            if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
            if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
            if (updates.location !== undefined) dbUpdates.location = updates.location;
            if (updates.status !== undefined) dbUpdates.status = updates.status;

            const { error } = await supabase
                .from('shifts')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
            await fetchShifts();
        } catch (error) {
            console.error('Error updating shift:', error);
            alert('Erro ao atualizar serviço.');
        }
    };

    const removeShift = async (id: string) => {
        try {
            const { error } = await supabase
                .from('shifts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchShifts();
        } catch (error) {
            console.error('Error removing shift:', error);
            alert('Erro ao remover serviço.');
        }
    };

    const clearShifts = async () => {
        // Optionally implement full wipe if needed, currently just clears local
        setShifts([]);
    };

    return (
        <ShiftContext.Provider value={{ shifts, addShifts, clearShifts, isLoading, updateShift, removeShift, createShift }}>
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
