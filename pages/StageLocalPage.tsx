import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useShift } from '../contexts/ShiftContext';
import { safeParseISO } from '../utils/dateUtils';
import { Holiday } from '../types';
import { STAGE_LOCATIONS } from '../constants';

interface StageAssignment {
    id: string;
    military_id: string;
    date: string;
    location: string;
    start_time?: string;
    end_time?: string;
}

const StageLocalPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { isModerator } = useAuth();
    const { holidays, shifts } = useShift();
    const [stages, setStages] = useState<StageAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    const [formData, setFormData] = useState({
        militaryId: '',
        date: new Date().toISOString().split('T')[0],
        location: STAGE_LOCATIONS[0],
        startTime: '08:00',
        endTime: '20:00'
    });

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const fetchStages = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('stages')
            .select('*')
            .order('date', { ascending: true });

        if (!error && data) {
            setStages(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchStages();
    }, []);

    const handlePrevMonth = () => {
        setCurrentMonth(prev => {
            if (prev === 0) {
                setCurrentYear(y => y - 1);
                return 11;
            }
            return prev - 1;
        });
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => {
            if (prev === 11) {
                setCurrentYear(y => y + 1);
                return 0;
            }
            return prev + 1;
        });
    };

    const handleAddStage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.militaryId || !formData.date || !formData.location) {
            alert('Preencha todos os campos');
            return;
        }

        const { error } = await supabase.from('stages').insert({
            military_id: formData.militaryId,
            date: formData.date,
            location: formData.location,
            start_time: formData.startTime,
            end_time: formData.endTime
        });

        if (error) {
            alert('Erro ao adicionar estágio');
        } else {
            setIsAdding(false);
            fetchStages();
            setFormData({
                ...formData,
                militaryId: '',
                startTime: '08:00',
                endTime: '20:00'
            });
        }
    };

    // List of locations to display (excluding Pel ABM)
    const activeLocations = useMemo(() =>
        STAGE_LOCATIONS.filter(loc => !loc.toLowerCase().includes('pel abm')),
        []);

    // Aggregate stages from both 'stages' table AND 'shifts' table (type: 'Estágio')
    const allStages = useMemo(() => {
        const combined = [...stages];

        const normalize = (val: string | null | undefined) =>
            (val || '').toLowerCase().replace(/[º°]/g, ' ').replace(/\s+/g, ' ').trim();

        const officialPrefixes = activeLocations.map(loc => normalize(loc.split(' - ')[0]));
        const extraKeywords = activeLocations.map(loc => {
            const parts = loc.split(' - ');
            return parts.length > 1 ? normalize(parts[1]) : '';
        }).filter(Boolean);

        shifts.forEach(s => {
            if (s.type === 'Estágio' && s.location) {
                const normLoc = normalize(s.location);
                const isOfficial = officialPrefixes.some(prefix => normLoc.includes(prefix)) ||
                    extraKeywords.some(keyword => normLoc.includes(keyword));

                if (isOfficial) {
                    const alreadyExists = stages.some(st => st.military_id === s.militaryId && st.date === s.date);
                    if (!alreadyExists) {
                        combined.push({
                            id: s.id,
                            military_id: s.militaryId,
                            date: s.date,
                            location: s.location,
                            start_time: s.startTime,
                            end_time: s.endTime
                        });
                    }
                }
            }
        });

        return combined.filter(s => {
            const d = safeParseISO(s.date);
            const matchesMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            const normLoc = normalize(s.location);
            const isOfficial = officialPrefixes.some(prefix => normLoc.includes(prefix)) ||
                extraKeywords.some(keyword => normLoc.includes(keyword));
            return matchesMonth && isOfficial;
        });
    }, [stages, shifts, currentMonth, currentYear, activeLocations]);

    const currentMonthLabel = `${months[currentMonth]} de ${currentYear}`;

    const handleDeleteStage = async (id: string) => {
        if (!confirm('Deseja excluir este estágio?')) return;

        // Check if it's from shifts or stages
        const fromStages = stages.some(s => s.id === id);

        if (fromStages) {
            const { error } = await supabase.from('stages').delete().eq('id', id);
            if (error) {
                alert('Erro ao excluir');
            } else {
                fetchStages();
            }
        } else {
            alert('Este registro vem da escala geral (Calendário) e deve ser removido por lá.');
        }
    };

    return (
        <MainLayout activePage="stage">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">location_city</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 capitalize">Estágios de {currentMonthLabel}</h2>
                            <p className="text-xs text-slate-500 font-medium">Distribuição mensal por batalhão</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2">
                            <button onClick={handlePrevMonth} className="p-1 px-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <button onClick={handleNextMonth} className="p-1 px-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                        {isModerator && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">add_location_alt</span>
                                Adicionar Estágio
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeLocations.map(loc => {
                        const locPrefix = loc.split(' - ')[0];
                        const normPrefix = locPrefix.toLowerCase().replace(/[º°]/g, ' ').replace(/\s+/g, ' ').trim();
                        const locSubtitle = loc.includes(' - ') ? loc.split(' - ')[1].toLowerCase().replace(/\s+/g, ' ').trim() : '';

                        const locStages = allStages.filter(s => {
                            const ns = (s.location || '').toLowerCase().replace(/[º°]/g, ' ').replace(/\s+/g, ' ').trim();
                            return ns.includes(normPrefix) || (locSubtitle && ns.includes(locSubtitle));
                        });
                        return (
                            <div key={loc} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 text-center">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm uppercase tracking-wider">
                                        {loc}
                                    </h3>
                                </div>
                                <div className="p-4 flex-grow space-y-3">
                                    {isLoading ? (
                                        <div className="flex justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : locStages.length === 0 ? (
                                        <p className="text-slate-400 text-sm italic text-center py-8">Nenhum militar alocado</p>
                                    ) : (
                                        locStages.sort((a, b) => a.date.localeCompare(b.date)).map(s => {
                                            const military = militaries.find(m => m.id === s.military_id);
                                            const dateObj = safeParseISO(s.date);
                                            const isFromShifts = !stages.some(st => st.id === s.id);

                                            return (
                                                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg group hover:ring-1 hover:ring-primary/30 transition-all border border-transparent dark:border-slate-700/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-800 dark:text-slate-100 font-bold text-sm">
                                                            {military ? `${military.rank} ${military.name}` : 'Militar desconhecido'}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1 font-medium">
                                                                <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                                                {dateObj.toLocaleDateString('pt-BR')} ({dateObj.toLocaleDateString('pt-BR', { weekday: 'short' })})
                                                            </span>
                                                            {isFromShifts && (
                                                                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded text-[8px] font-bold uppercase tracking-tighter">
                                                                    Escala
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isModerator && !isFromShifts && (
                                                        <button
                                                            onClick={() => handleDeleteStage(s.id)}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all sm:opacity-0 group-hover:opacity-100"
                                                            title="Excluir"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isAdding && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">add_location_alt</span>
                                    Novo Estágio
                                </h3>
                                <button onClick={() => setIsAdding(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleAddStage} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Militar</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                                        value={formData.militaryId}
                                        onChange={e => setFormData({ ...formData, militaryId: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecione um militar...</option>
                                        {[...militaries]
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map(m => (
                                                <option key={m.id} value={m.id}>{m.rank} {m.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Data</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Batalhão</label>
                                        <select
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            required
                                        >
                                            {activeLocations.map(loc => (
                                                <option key={loc} value={loc}>{loc.split(' - ')[0]}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {holidays.some((h: Holiday) => h.date === formData.date) && (
                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="material-symbols-outlined text-primary text-xl">event_upcoming</span>
                                            <span className="text-xs font-black text-primary uppercase tracking-widest">Horário Especial (Feriado)</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                                                <input
                                                    type="time"
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-bold"
                                                    value={formData.startTime}
                                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Término</label>
                                                <input
                                                    type="time"
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-bold"
                                                    value={formData.endTime}
                                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full bg-primary py-3.5 rounded-xl text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Confirmar Alocação
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </MainLayout.Content>
        </MainLayout>
    );
};

export default StageLocalPage;
