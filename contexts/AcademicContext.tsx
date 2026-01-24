import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';
import { Discipline, Instructor, AcademicSchedule } from '../types';

interface AcademicContextType {
    disciplines: Discipline[];
    instructors: Instructor[];
    schedule: AcademicSchedule[];
    isLoading: boolean;
    fetchAcademicData: () => Promise<void>;
    addDiscipline: (discipline: Omit<Discipline, 'id'>) => Promise<void>;
    updateDiscipline: (id: string, updates: Partial<Discipline>) => Promise<void>;
    removeDiscipline: (id: string) => Promise<void>;
    addInstructor: (instructor: Omit<Instructor, 'id'>) => Promise<void>;
    updateInstructor: (id: string, updates: Partial<Instructor>) => Promise<void>;
    removeInstructor: (id: string) => Promise<void>;
    addScheduleEntry: (entry: Omit<AcademicSchedule, 'id'>) => Promise<void>;
    updateScheduleEntry: (id: string, updates: Partial<AcademicSchedule>) => Promise<void>;
    removeScheduleEntry: (id: string) => Promise<void>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [schedule, setSchedule] = useState<AcademicSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAcademicData = async () => {
        try {
            setIsLoading(true);
            const [discRes, instRes, schRes] = await Promise.all([
                supabase.from('disciplines').select('*').order('name'),
                supabase.from('instructors').select('*').order('name'),
                supabase.from('academic_schedule').select('*').order('date')
            ]);

            if (discRes.data) {
                setDisciplines(discRes.data.map(d => ({
                    id: d.id,
                    name: d.name,
                    totalHours: d.total_hours,
                    category: d.category
                })));
            }

            if (instRes.data) {
                setInstructors(instRes.data.map(i => ({
                    id: i.id,
                    name: i.name,
                    rank: i.rank
                })));
            }

            if (schRes.data) {
                setSchedule(schRes.data.map(s => ({
                    id: s.id,
                    date: s.date,
                    startTime: s.start_time,
                    endTime: s.end_time,
                    disciplineId: s.discipline_id,
                    instructorId: s.instructor_id,
                    location: s.location,
                    description: s.description
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
            total_hours: discipline.totalHours,
            category: discipline.category
        });
        if (!error) await fetchAcademicData();
    };

    const updateDiscipline = async (id: string, updates: Partial<Discipline>) => {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.totalHours !== undefined) dbUpdates.total_hours = updates.totalHours;
        if (updates.category !== undefined) dbUpdates.category = updates.category;

        const { error } = await supabase.from('disciplines').update(dbUpdates).eq('id', id);
        if (!error) await fetchAcademicData();
    };

    const removeDiscipline = async (id: string) => {
        const { error } = await supabase.from('disciplines').delete().eq('id', id);
        if (!error) await fetchAcademicData();
    };

    const addInstructor = async (instructor: Omit<Instructor, 'id'>) => {
        const { error } = await supabase.from('instructors').insert({
            name: instructor.name,
            rank: instructor.rank
        });
        if (!error) await fetchAcademicData();
    };

    const updateInstructor = async (id: string, updates: Partial<Instructor>) => {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.rank !== undefined) dbUpdates.rank = updates.rank;

        const { error } = await supabase.from('instructors').update(dbUpdates).eq('id', id);
        if (!error) await fetchAcademicData();
    };

    const removeInstructor = async (id: string) => {
        const { error } = await supabase.from('instructors').delete().eq('id', id);
        if (!error) await fetchAcademicData();
    };

    const addScheduleEntry = async (entry: Omit<AcademicSchedule, 'id'>) => {
        const { error } = await supabase.from('academic_schedule').insert({
            date: entry.date,
            start_time: entry.startTime,
            end_time: entry.endTime,
            discipline_id: entry.disciplineId,
            instructor_id: entry.instructorId,
            location: entry.location,
            description: entry.description
        });
        if (!error) await fetchAcademicData();
    };

    const updateScheduleEntry = async (id: string, updates: Partial<AcademicSchedule>) => {
        const dbUpdates: any = {};
        if (updates.date !== undefined) dbUpdates.date = updates.date;
        if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
        if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
        if (updates.disciplineId !== undefined) dbUpdates.discipline_id = updates.disciplineId;
        if (updates.instructorId !== undefined) dbUpdates.instructor_id = updates.instructorId;
        if (updates.location !== undefined) dbUpdates.location = updates.location;
        if (updates.description !== undefined) dbUpdates.description = updates.description;

        const { error } = await supabase.from('academic_schedule').update(dbUpdates).eq('id', id);
        if (!error) await fetchAcademicData();
    };

    const removeScheduleEntry = async (id: string) => {
        const { error } = await supabase.from('academic_schedule').delete().eq('id', id);
        if (!error) await fetchAcademicData();
    };

    return (
        <AcademicContext.Provider value={{
            disciplines, instructors, schedule, isLoading, fetchAcademicData,
            addDiscipline, updateDiscipline, removeDiscipline,
            addInstructor, updateInstructor, removeInstructor,
            addScheduleEntry, updateScheduleEntry, removeScheduleEntry
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
