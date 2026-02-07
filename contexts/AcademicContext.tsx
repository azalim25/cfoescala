import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';
import { Discipline, AcademicSchedule, AcademicTimeSlot } from '../types';

interface AcademicContextType {
    disciplines: Discipline[];
    schedule: AcademicSchedule[];
    timeSlots: AcademicTimeSlot[];
    isLoading: boolean;
    fetchAcademicData: () => Promise<void>;
    addDiscipline: (discipline: Omit<Discipline, 'id'>) => Promise<void>;
    updateDiscipline: (id: string, updates: Partial<Discipline>) => Promise<void>;
    removeDiscipline: (id: string) => Promise<void>;
    addScheduleEntry: (entry: Omit<AcademicSchedule, 'id'>) => Promise<void>;
    addScheduleEntries: (entries: Omit<AcademicSchedule, 'id'>[]) => Promise<void>;
    updateScheduleEntry: (id: string, updates: Partial<AcademicSchedule>) => Promise<void>;
    removeScheduleEntry: (id: string) => Promise<void>;
    addTimeSlot: (slot: Omit<AcademicTimeSlot, 'id'>) => Promise<void>;
    updateTimeSlot: (id: string, updates: Partial<AcademicTimeSlot>) => Promise<void>;
    removeTimeSlot: (id: string) => Promise<void>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [schedule, setSchedule] = useState<AcademicSchedule[]>([]);
    const [timeSlots, setTimeSlots] = useState<AcademicTimeSlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAcademicData = async () => {
        try {
            setIsLoading(true);
            const [discRes, schRes, slotRes] = await Promise.all([
                supabase.from('disciplines').select('*').order('name'),
                supabase.from('academic_schedule').select('*').order('date'),
                supabase.from('academic_time_slots').select('*').order('start_time')
            ]);

            if (discRes.data) {
                setDisciplines(discRes.data.map(d => ({
                    id: d.id,
                    name: d.name,
                    totalHours: d.total_hours
                })));
            }

            if (schRes.data) {
                setSchedule(schRes.data.map(s => ({
                    id: s.id,
                    date: s.date,
                    startTime: s.start_time,
                    endTime: s.end_time,
                    disciplineId: s.discipline_id,
                    description: s.description,
                    examType: s.exam_type
                })));
            }

            if (slotRes.data) {
                setTimeSlots(slotRes.data.map(s => ({
                    id: s.id,
                    startTime: s.start_time,
                    endTime: s.end_time,
                    active: s.active
                })));
            }
        } catch (error) {
            console.error('Error fetching academic data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAcademicData();
    }, []);

    const addDiscipline = async (discipline: Omit<Discipline, 'id'>) => {
        const { error } = await supabase.from('disciplines').insert({
            name: discipline.name,
            total_hours: discipline.totalHours
        });
        if (!error) await fetchAcademicData();
    };

    const updateDiscipline = async (id: string, updates: Partial<Discipline>) => {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.totalHours !== undefined) dbUpdates.total_hours = updates.totalHours;

        const { error } = await supabase.from('disciplines').update(dbUpdates).eq('id', id);
        if (!error) await fetchAcademicData();
    };

    const removeDiscipline = async (id: string) => {
        const { error } = await supabase.from('disciplines').delete().eq('id', id);
        if (!error) await fetchAcademicData();
    };

    const addScheduleEntry = async (entry: Omit<AcademicSchedule, 'id'>) => {
        const { error } = await supabase.from('academic_schedule').insert({
            date: entry.date,
            start_time: entry.startTime,
            end_time: entry.endTime,
            discipline_id: entry.disciplineId,
            location: entry.location,
            description: entry.description,
            exam_type: entry.examType
        });
        if (!error) await fetchAcademicData();
    };

    const addScheduleEntries = async (entries: Omit<AcademicSchedule, 'id'>[]) => {
        const { error } = await supabase.from('academic_schedule').insert(
            entries.map(entry => ({
                date: entry.date,
                start_time: entry.startTime,
                end_time: entry.endTime,
                discipline_id: entry.disciplineId,
                location: entry.location,
                description: entry.description,
                exam_type: entry.examType
            }))
        );
        if (!error) await fetchAcademicData();
    };

    const updateScheduleEntry = async (id: string, updates: Partial<AcademicSchedule>) => {
        const dbUpdates: any = {};
        if (updates.date !== undefined) dbUpdates.date = updates.date;
        if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
        if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
        if (updates.disciplineId !== undefined) dbUpdates.discipline_id = updates.disciplineId;
        if (updates.location !== undefined) dbUpdates.location = updates.location;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.examType !== undefined) dbUpdates.exam_type = updates.examType;

        const { error } = await supabase.from('academic_schedule').update(dbUpdates).eq('id', id);
        if (!error) await fetchAcademicData();
    };

    const removeScheduleEntry = async (id: string) => {
        const { error } = await supabase.from('academic_schedule').delete().eq('id', id);
        if (!error) await fetchAcademicData();
    };

    const addTimeSlot = async (slot: Omit<AcademicTimeSlot, 'id'>) => {
        const { error } = await supabase.from('academic_time_slots').insert({
            start_time: slot.startTime,
            end_time: slot.endTime,
            active: slot.active
        });
        if (!error) await fetchAcademicData();
    };

    const updateTimeSlot = async (id: string, updates: Partial<AcademicTimeSlot>) => {
        const dbUpdates: any = {};
        if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
        if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
        if (updates.active !== undefined) dbUpdates.active = updates.active;

        const { error } = await supabase.from('academic_time_slots').update(dbUpdates).eq('id', id);
        if (!error) await fetchAcademicData();
    };

    const removeTimeSlot = async (id: string) => {
        const { error } = await supabase.from('academic_time_slots').delete().eq('id', id);
        if (!error) await fetchAcademicData();
    };

    return (
        <AcademicContext.Provider value={{
            disciplines, schedule, timeSlots, isLoading, fetchAcademicData,
            addDiscipline, updateDiscipline, removeDiscipline,
            addScheduleEntry, addScheduleEntries, updateScheduleEntry, removeScheduleEntry,
            addTimeSlot, updateTimeSlot, removeTimeSlot
        }}>
            {children}
        </AcademicContext.Provider>
    );
};

export const useAcademic = () => {
    const context = useContext(AcademicContext);
    if (context === undefined) {
        throw new Error('useAcademic must be used within an AcademicProvider');
    }
    return context;
};
