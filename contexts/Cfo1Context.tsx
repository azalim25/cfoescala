import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';
import { Cfo1ActivityTemplate, Cfo1ScheduleCard } from '../types';

interface Cfo1ContextType {
    activityTemplates: Cfo1ActivityTemplate[];
    scheduleCards: Cfo1ScheduleCard[];
    isLoading: boolean;
    fetchCfo1Data: () => Promise<void>;
    addActivityTemplate: (template: Omit<Cfo1ActivityTemplate, 'id'>) => Promise<void>;
    updateActivityTemplate: (id: string, updates: Partial<Cfo1ActivityTemplate>) => Promise<void>;
    removeActivityTemplate: (id: string) => Promise<void>;
    addScheduleCard: (card: Omit<Cfo1ScheduleCard, 'id'>) => Promise<void>;
    updateScheduleCard: (id: string, updates: Partial<Cfo1ScheduleCard>) => Promise<void>;
    removeScheduleCard: (id: string) => Promise<void>;
}

const Cfo1Context = createContext<Cfo1ContextType | undefined>(undefined);

export const Cfo1Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activityTemplates, setActivityTemplates] = useState<Cfo1ActivityTemplate[]>([]);
    const [scheduleCards, setScheduleCards] = useState<Cfo1ScheduleCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCfo1Data = async () => {
        try {
            setIsLoading(true);
            const [templatesRes, cardsRes] = await Promise.all([
                supabase.from('cfo1_activity_templates').select('*').order('created_at'),
                supabase.from('cfo1_schedule_cards').select('*').order('start_time')
            ]);

            if (templatesRes.data) {
                setActivityTemplates(templatesRes.data.map(t => ({
                    id: t.id,
                    name: t.name,
                    defaultDurationMinutes: t.default_duration_minutes,
                    defaultDescription: t.default_description || ''
                })));
            }

            if (cardsRes.data) {
                setScheduleCards(cardsRes.data.map(c => ({
                    id: c.id,
                    cardType: c.card_type,
                    activityTemplateId: c.activity_template_id,
                    militaryId: c.military_id,
                    title: c.title,
                    durationMinutes: c.duration_minutes,
                    description: c.description || '',
                    date: c.date,
                    startTime: c.start_time?.slice(0, 5),
                    linkedActivityCardId: c.linked_activity_card_id
                })));
            }
        } catch (error) {
            console.error('Erro ao buscar dados do CFO I:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCfo1Data();
    }, []);

    const addActivityTemplate = async (template: Omit<Cfo1ActivityTemplate, 'id'>) => {
        const { error } = await supabase.from('cfo1_activity_templates').insert({
            name: template.name,
            default_duration_minutes: template.defaultDurationMinutes,
            default_description: template.defaultDescription || null
        });

        if (error) {
            console.error('Erro ao criar atividade:', error);
            alert('Erro ao criar atividade: ' + error.message);
        } else {
            await fetchCfo1Data();
        }
    };

    const updateActivityTemplate = async (id: string, updates: Partial<Cfo1ActivityTemplate>) => {
        const dbUpdates: { [key: string]: any } = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.defaultDurationMinutes !== undefined) dbUpdates.default_duration_minutes = updates.defaultDurationMinutes;
        if (updates.defaultDescription !== undefined) dbUpdates.default_description = updates.defaultDescription;

        const { error } = await supabase.from('cfo1_activity_templates').update(dbUpdates).eq('id', id);

        if (error) {
            console.error('Erro ao atualizar atividade:', error);
            alert('Erro ao atualizar atividade: ' + error.message);
        } else {
            await fetchCfo1Data();
        }
    };

    const removeActivityTemplate = async (id: string) => {
        const { error } = await supabase.from('cfo1_activity_templates').delete().eq('id', id);

        if (error) {
            console.error('Erro ao remover atividade:', error);
            alert('Erro ao remover atividade: ' + error.message);
        } else {
            await fetchCfo1Data();
        }
    };

    const addScheduleCard = async (card: Omit<Cfo1ScheduleCard, 'id'>) => {
        const { error } = await supabase.from('cfo1_schedule_cards').insert({
            card_type: card.cardType,
            activity_template_id: card.activityTemplateId || null,
            military_id: card.militaryId || null,
            title: card.title || null,
            duration_minutes: card.durationMinutes,
            description: card.description || null,
            date: card.date,
            start_time: card.startTime,
            linked_activity_card_id: card.linkedActivityCardId || null
        });

        if (error) {
            console.error('Erro ao encaixar card:', error);
            alert('Erro ao encaixar card: ' + error.message);
        } else {
            await fetchCfo1Data();
        }
    };

    const updateScheduleCard = async (id: string, updates: Partial<Cfo1ScheduleCard>) => {
        const dbUpdates: { [key: string]: any } = { updated_at: new Date().toISOString() };
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.durationMinutes !== undefined) dbUpdates.duration_minutes = updates.durationMinutes;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.date !== undefined) dbUpdates.date = updates.date;
        if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
        if (updates.linkedActivityCardId !== undefined) dbUpdates.linked_activity_card_id = updates.linkedActivityCardId;

        const { error } = await supabase.from('cfo1_schedule_cards').update(dbUpdates).eq('id', id);

        if (error) {
            console.error('Erro ao atualizar card:', error);
            alert('Erro ao atualizar card: ' + error.message);
        } else {
            await fetchCfo1Data();
        }
    };

    const removeScheduleCard = async (id: string) => {
        const { error } = await supabase.from('cfo1_schedule_cards').delete().eq('id', id);

        if (error) {
            console.error('Erro ao remover card:', error);
            alert('Erro ao remover card: ' + error.message);
        } else {
            await fetchCfo1Data();
        }
    };

    return (
        <Cfo1Context.Provider value={{
            activityTemplates,
            scheduleCards,
            isLoading,
            fetchCfo1Data,
            addActivityTemplate,
            updateActivityTemplate,
            removeActivityTemplate,
            addScheduleCard,
            updateScheduleCard,
            removeScheduleCard
        }}>
            {children}
        </Cfo1Context.Provider>
    );
};

export const useCfo1 = () => {
    const context = useContext(Cfo1Context);
    if (context === undefined) {
        throw new Error('useCfo1 must be used within a Cfo1Provider');
    }
    return context;
};
