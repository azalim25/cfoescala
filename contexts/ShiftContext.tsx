import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Shift, MilitaryPreference, Holiday } from '../types';
import { supabase } from '../supabase';

interface ShiftContextType {
    shifts: Shift[];
    preferences: MilitaryPreference[];
    holidays: Holiday[];
    addShifts: (newShifts: Shift[]) => Promise<void>;
    createShift: (shift: Omit<Shift, 'id'>) => Promise<void>;
    createShifts: (shifts: Omit<Shift, 'id'>[]) => Promise<void>;
    updateShift: (id: string, updates: Partial<Shift>) => Promise<void>;
    removeShift: (id: string) => Promise<void>;
    removeShifts: (ids: string[]) => Promise<void>;
    clearShifts: () => void;
    addPreference: (pref: Omit<MilitaryPreference, 'id'>) => Promise<void>;
    removePreference: (id: string) => Promise<void>;
    addHoliday: (holiday: Omit<Holiday, 'id'>) => Promise<void>;
    removeHoliday: (id: string) => Promise<void>;
    isLoading: boolean;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [preferences, setPreferences] = useState<MilitaryPreference[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHolidays = async () => {
        try {
            const { data, error } = await supabase.from('holidays').select('*');
            if (error) throw error;
            if (data) setHolidays(data);
        } catch (error) {
            console.error('Error fetching holidays:', error);
        }
    };

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
                    status: s.status as any,
                    duration: s.duration
                }));
                setShifts(formattedShifts);
            }
        } catch (error) {
            console.error('Error fetching shifts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPreferences = async () => {
        try {
            const { data, error } = await supabase
                .from('military_preferences')
                .select('*');

            if (error) throw error;

            if (data) {
                const formatted: MilitaryPreference[] = data.map(p => ({
                    id: p.id,
                    militaryId: p.military_id,
                    date: p.date,
                    type: p.type as any
                }));
                setPreferences(formatted);
            }
        } catch (error) {
            console.error('Error fetching preferences:', error);
        }
    };

    useEffect(() => {
        fetchShifts();
        fetchPreferences();
        fetchHolidays();
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
                status: s.status,
                duration: s.duration
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
                status: shift.status,
                duration: Math.round(shift.duration || 0)
            };

            console.log('Inserting shift:', dbShift);

            const { error } = await supabase.from('shifts').insert(dbShift);
            if (error) {
                console.error('Supabase error inserting shift:', error);
                throw error;
            }
            await fetchShifts();
        } catch (error) {
            console.error('Error creating shift:', error);
            alert(`Erro ao adicionar serviço: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
        }
    };

    const createShifts = async (newShifts: Omit<Shift, 'id'>[]) => {
        try {
            const dbShifts = newShifts.map(s => ({
                military_id: s.militaryId,
                date: s.date,
                type: s.type,
                start_time: s.startTime,
                end_time: s.endTime,
                location: s.location,
                status: s.status,
                duration: s.duration
            }));

            const { error } = await supabase.from('shifts').insert(dbShifts);
            if (error) throw error;
            await fetchShifts();
        } catch (error) {
            console.error('Error creating shifts bulk:', error);
            alert('Erro ao adicionar serviços em lote.');
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
            if (updates.duration !== undefined) dbUpdates.duration = updates.duration;

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

    const removeShifts = async (ids: string[]) => {
        try {
            const { error } = await supabase
                .from('shifts')
                .delete()
                .in('id', ids);

            if (error) throw error;
            await fetchShifts();
        } catch (error) {
            console.error('Error removing shifts:', error);
            alert('Erro ao remover serviços.');
        }
    };

    const clearShifts = async () => {
        // Optionally implement full wipe if needed, currently just clears local
        setShifts([]);
    };

    const addPreference = async (pref: Omit<MilitaryPreference, 'id'>) => {
        try {
            const { error } = await supabase
                .from('military_preferences')
                .insert([{
                    military_id: pref.militaryId,
                    date: pref.date,
                    type: pref.type
                }]);

            if (error) throw error;
            await fetchPreferences();
        } catch (error) {
            console.error('Error adding preference:', error);
            alert('Erro ao salvar preferência.');
        }
    };

    const removePreference = async (id: string) => {
        try {
            const { error } = await supabase
                .from('military_preferences')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchPreferences();
        } catch (error) {
            console.error('Error removing preference:', error);
            alert('Erro ao remover preferência.');
        }
    };

    const addHoliday = async (holiday: Omit<Holiday, 'id'>) => {
        try {
            const { error } = await supabase.from('holidays').insert([holiday]);
            if (error) throw error;
            await fetchHolidays();
        } catch (error) {
            console.error('Error adding holiday:', error);
        }
    };

    const removeHoliday = async (id: string) => {
        try {
            const { error } = await supabase.from('holidays').delete().eq('id', id);
            if (error) throw error;
            await fetchHolidays();
        } catch (error) {
            console.error('Error removing holiday:', error);
        }
    };

    return (
        <ShiftContext.Provider value={{
            shifts,
            preferences,
            holidays,
            addShifts,
            clearShifts,
            isLoading,
            updateShift,
            removeShift,
            removeShifts,
            createShift,
            createShifts,
            addPreference,
            removePreference,
            addHoliday,
            removeHoliday
        }}>
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
