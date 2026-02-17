import React, { useMemo, useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { Holiday } from '../types';
import { STAGE_LOCATIONS } from '../constants';

interface StageAssignment {
    id: string;
    military_id: string;
    date: string;
    location: string;
    duration?: number;
    start_time?: string;
    end_time?: string;
}

interface ExtraRecord {
    id: string;
    military_id: string;
    category: string;
    hours: number;
}

interface DetailedStat {
    cfo1: number;
    cfo2: number;
    total: number;
}

const StageQuantityPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { shifts, holidays } = useShift();
    const { isModerator } = useAuth();
    const [stages, setStages] = useState<StageAssignment[]>([]);
    const [extraRecords, setExtraRecords] = useState<ExtraRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<{
        militaryId: string;
        location: string;
        duration: number;
        quantity: number;
    } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        militaryId: '',
        date: new Date().toISOString().split('T')[0],
        location: STAGE_LOCATIONS[0],
        duration: 12,
        startTime: '08:00',
        endTime: '20:00'
    });

    const fetchStages = async () => {
        setIsLoading(true);
        const { data: stagesData, error: stagesError } = await supabase
            .from('stages')
            .select('*');

        const { data: extraData, error: extraError } = await supabase
            .from('extra_hours')
            .select('id, military_id, category, hours')
            .filter('category', 'like', 'CFO I - Estágio - %');

        if (!stagesError && stagesData) {
            setStages(stagesData);
        }
        if (!extraError && extraData) {
            setExtraRecords(extraData as ExtraRecord[]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchStages();
    }, []);

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
            duration: formData.duration,
            start_time: formData.startTime,
            end_time: formData.endTime
        });

        if (error) {
            console.error('Error adding stage:', error);
            const { error: error2 } = await supabase.from('stages').insert({
                military_id: formData.militaryId,
                date: formData.date,
                location: formData.location
            });

            if (error2) {
                alert('Erro ao adicionar estágio');
            } else {
                finishAdd();
            }
        } else {
            finishAdd();
        }
    };

    const finishAdd = () => {
        setIsAdding(false);
        fetchStages();
        setFormData({
            ...formData,
            militaryId: '',
            startTime: '08:00',
            endTime: '20:00',
            location: STAGE_LOCATIONS[0],
            duration: 12
        });
    };

    const getDuration = (dateStr: string, providedDuration?: number) => {
        if (providedDuration) return providedDuration;

        const d = new Date(dateStr + 'T12:00:00');
        const day = d.getDay();

        if (day === 6) return 24; // Saturday
        if (day === 0) return 12; // Sunday
        return 12;
    };

    // Aggregate data
    const stageStats = useMemo(() => {
        const stats: Record<string, Record<string, { p12: DetailedStat; p24: DetailedStat }>> = {};
        const emptyStat = () => ({ cfo1: 0, cfo2: 0, total: 0 });

        // Initialize with official locations only
        militaries.forEach(m => {
            stats[m.id] = {};
            STAGE_LOCATIONS.forEach(loc => {
                const baseLoc = loc.split(' - ')[0]; // e.g. "1° BBM" or "1°BBM"
                stats[m.id][baseLoc] = { p12: emptyStat(), p24: emptyStat() };
            });
        });

        const findBaseLocKey = (locationName: string | null | undefined) => {
            if (!locationName) return null;
            const normalized = locationName.toLowerCase().replace(/º/g, '°').replace(/\s+/g, '');
            for (const loc of STAGE_LOCATIONS) {
                const baseRaw = loc.split(' - ')[0];
                const baseNorm = baseRaw.toLowerCase().replace(/º/g, '°').replace(/\s+/g, '');
                if (normalized.includes(baseNorm)) return baseRaw;
            }
            return null;
        };

        // 1. Process shifts of type 'Estágio' (CFO II)
        shifts.forEach(s => {
            if (s.type === 'Estágio' && s.location && stats[s.militaryId]) {
                const baseLoc = findBaseLocKey(s.location);
                if (baseLoc && stats[s.militaryId][baseLoc]) {
                    const duration = getDuration(s.date, s.duration);
                    if (duration === 24) stats[s.militaryId][baseLoc].p24.cfo2++;
                    else stats[s.militaryId][baseLoc].p12.cfo2++;
                }
            }
        });

        // 2. Process stages from 'stages' table (CFO II) - DEDUPLICATED
        stages.forEach(s => {
            if (stats[s.military_id]) {
                const isAlreadyInShifts = shifts.some(sh =>
                    sh.militaryId === s.military_id &&
                    sh.date === s.date &&
                    sh.type === 'Estágio'
                );

                if (!isAlreadyInShifts) {
                    const baseLoc = findBaseLocKey(s.location);
                    if (baseLoc && stats[s.military_id][baseLoc]) {
                        const duration = getDuration(s.date, s.duration);
                        if (duration === 24) stats[s.military_id][baseLoc].p24.cfo2++;
                        else stats[s.military_id][baseLoc].p12.cfo2++;
                    }
                }
            }
        });

        // 3. Process extra_hours manual records (CFO I)
        extraRecords.forEach(r => {
            if (stats[r.military_id]) {
                const parts = r.category.split(' - ');
                if (parts.length >= 4) {
                    const baseLoc = findBaseLocKey(parts[2]);
                    const dur = parseInt(parts[3]) || 12;
                    if (baseLoc && stats[r.military_id][baseLoc]) {
                        if (dur === 24) stats[r.military_id][baseLoc].p24.cfo1 += r.hours;
                        else stats[r.military_id][baseLoc].p12.cfo1 += r.hours;
                    }
                }
            }
        });

        // Calculate Totals
        Object.values(stats).forEach(milStats => {
            Object.values(milStats).forEach(locStats => {
                locStats.p12.total = locStats.p12.cfo1 + locStats.p12.cfo2;
                locStats.p24.total = locStats.p24.cfo1 + locStats.p24.cfo2;
            });
        });

        return stats;
    }, [militaries, shifts, stages, extraRecords]);

    const handleEditCFO1 = (militaryId: string, baseLoc: string, duration: number) => {
        if (!isModerator) return;
        const stats = stageStats[militaryId]?.[baseLoc];
        const currentQty = duration === 24 ? stats?.p24.cfo1 : stats?.p12.cfo1;
        setEditingData({ militaryId, location: baseLoc, duration, quantity: currentQty || 0 });
        setIsEditModalOpen(true);
    };

    const handleSaveCFO1 = async () => {
        if (!editingData) return;
        setIsSaving(true);
        const category = `CFO I - Estágio - ${editingData.location} - ${editingData.duration}h`;
        const existing = extraRecords.find(r => r.military_id === editingData.militaryId && r.category === category);

        try {
            if (existing) {
                if (editingData.quantity === 0) {
                    await supabase.from('extra_hours').delete().eq('id', existing.id);
                } else {
                    await supabase.from('extra_hours').update({ hours: editingData.quantity }).eq('id', existing.id);
                }
            } else if (editingData.quantity > 0) {
                await supabase.from('extra_hours').insert({
                    military_id: editingData.militaryId,
                    category: category,
                    hours: editingData.quantity,
                    minutes: 0,
                    description: 'Qtde manual Estágio',
                    date: new Date().toISOString().split('T')[0]
                });
            }
            fetchStages();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Error saving CFO I:', error);
            alert('Erro ao salvar quantidade.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStage = async (id: string) => {
        if (!confirm('Deseja excluir este registro?')) return;
        const { error } = await supabase.from('stages').delete().eq('id', id);
        if (error) {
            alert('Erro ao excluir registro');
        } else {
            fetchStages();
        }
    };

    const sortedMilitaries = useMemo(() => {
        return [...militaries].sort((a, b) => {
            const aAnt = a.antiguidade || 999999;
            const bAnt = b.antiguidade || 999999;
            if (aAnt !== bAnt) return aAnt - bAnt;
            return a.name.localeCompare(b.name);
        });
    }, [militaries]);

    return (
        <MainLayout activePage="stage-quantity">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">analytics</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 capitalize">Estágio - Quantidade</h2>
                            <p className="text-xs text-slate-500 font-medium">Consolidado de horas por batalhão</p>
                        </div>
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

                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-wrap items-center gap-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legenda:</h3>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">CFO I</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">CFO II</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-900 dark:bg-white"></div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm">
                                <tr className="bg-slate-100 dark:bg-slate-800/80">
                                    <th rowSpan={2} className="px-6 py-4 text-[12px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 min-w-[200px]">Militar</th>
                                    {STAGE_LOCATIONS.map(loc => (
                                        <th key={loc} colSpan={2} className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-l border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/50">
                                            {loc.split(' - ')[0]}
                                        </th>
                                    ))}
                                    <th rowSpan={2} className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-l border-slate-200 dark:border-slate-800 text-center bg-slate-100/50 dark:bg-slate-700/50">Total</th>
                                </tr>
                                <tr className="bg-slate-50 dark:bg-slate-900/50">
                                    {STAGE_LOCATIONS.map(loc => (
                                        <React.Fragment key={loc}>
                                            <th className="px-2 py-2 text-[10px] font-bold text-slate-400 uppercase border-b border-l border-slate-200 dark:border-slate-700 text-center min-w-[60px]">P12</th>
                                            <th className="px-2 py-2 text-[10px] font-bold text-slate-400 uppercase border-b border-l border-slate-200 dark:border-slate-700 text-center min-w-[60px]">P24</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center">
                                            <div className="flex justify-center flex-col items-center gap-2">
                                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-sm text-slate-400 italic">Carregando dados...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : sortedMilitaries.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm italic">Nenhum militar encontrado na lista de contatos.</td>
                                    </tr>
                                ) : (
                                    sortedMilitaries.map(mil => {
                                        const stats = stageStats[mil.id] || {};
                                        let rowTotal = 0;

                                        return (
                                            <tr key={mil.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-base whitespace-nowrap">{mil.rank} {mil.name}</span>
                                                        <span className="text-[10px] text-slate-500">{mil.firefighterNumber}</span>
                                                    </div>
                                                </td>
                                                {STAGE_LOCATIONS.map(loc => {
                                                    const baseLoc = loc.split(' - ')[0];
                                                    const locStats = stats[baseLoc] || {
                                                        p12: { cfo1: 0, cfo2: 0, total: 0 },
                                                        p24: { cfo1: 0, cfo2: 0, total: 0 }
                                                    };
                                                    rowTotal += locStats.p12.total + locStats.p24.total;

                                                    const renderCellContent = (stat: DetailedStat, duration: number) => (
                                                        <button
                                                            onClick={() => handleEditCFO1(mil.id, baseLoc, duration)}
                                                            disabled={!isModerator}
                                                            className={`flex items-center gap-1.5 justify-center w-full min-h-[48px] px-1 transition-all ${isModerator ? 'hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg cursor-pointer' : 'cursor-default'}`}
                                                        >
                                                            <div className="flex flex-col items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs sm:text-sm font-black ${stat.cfo1 > 0 ? 'text-emerald-500' : 'text-slate-200 dark:text-slate-800'}`}>
                                                                        {stat.cfo1}
                                                                    </span>
                                                                    <span className={`text-xs sm:text-sm font-black ${stat.cfo2 > 0 ? 'text-blue-500' : 'text-slate-200 dark:text-slate-800'}`}>
                                                                        {stat.cfo2}
                                                                    </span>
                                                                </div>
                                                                <span className={`text-sm sm:text-base font-black mt-0.5 ${stat.total > 0 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-200 dark:text-slate-800'}`}>
                                                                    {stat.total}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );

                                                    return (
                                                        <React.Fragment key={baseLoc}>
                                                            <td className="px-1 py-2 border-l border-slate-50 dark:border-slate-800 text-center">
                                                                {renderCellContent(locStats.p12, 12)}
                                                            </td>
                                                            <td className="px-1 py-2 border-l border-slate-50 dark:border-slate-800 text-center bg-slate-50/10 dark:bg-slate-800/10">
                                                                {renderCellContent(locStats.p24, 24)}
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                                <td className="px-6 py-4 border-l border-slate-50 dark:border-slate-800 text-center bg-slate-100/20 dark:bg-slate-800/40">
                                                    <span className={`inline-flex items-center justify-center px-2 py-1 ${rowTotal > 0 ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'} rounded-md text-xs font-bold min-w-[28px]`}>
                                                        {rowTotal}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isModerator && (
                    <div className="mt-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-xl">history</span>
                                Registros Recentes (Modo Edição)
                            </h3>
                        </div>
                        <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {stages.length === 0 ? (
                                <p className="text-center text-slate-400 text-sm italic py-8">Nenhum registro manual encontrado.</p>
                            ) : (
                                <div className="space-y-2">
                                    {[...stages].sort((a, b) => b.date.localeCompare(a.date)).map(s => {
                                        const m = militaries.find(mil => mil.id === s.military_id);
                                        const duration = getDuration(s.date, s.duration);
                                        return (
                                            <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg group hover:ring-1 hover:ring-primary/20 transition-all border border-transparent dark:border-slate-700/50">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black shrink-0">
                                                        P{duration}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{m?.rank} {m?.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">
                                                            {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {s.location.split(' - ')[0]}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteStage(s.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all sm:opacity-0 group-hover:opacity-100"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {isAdding && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">add_location_alt</span>
                                    Novo Registro de Estágio
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
                                        {sortedMilitaries.map(m => (
                                            <option key={m.id} value={m.id}>{m.rank} {m.name}</option>
                                        ))}
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
                                            {STAGE_LOCATIONS.map(loc => (
                                                <option key={loc} value={loc}>{loc.split(' - ')[0]}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Duração</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, duration: 12 })}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border ${formData.duration === 12 ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                        >
                                            12 Horas (P12)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, duration: 24 })}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border ${formData.duration === 24 ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                        >
                                            24 Horas (P24)
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full bg-primary py-3.5 rounded-xl text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Confirmar Registro
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit CFO I Modal */}
                {isEditModalOpen && editingData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                                    <span className="material-symbols-outlined text-primary">edit</span>
                                    Editar CFO I (Manual)
                                </h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                                    <span className="material-symbols-outlined text-slate-400">close</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="text-center space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Militar</p>
                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">
                                        {militaries.find(m => m.id === editingData.militaryId)?.name}
                                    </p>
                                    <p className="text-[10px] font-bold text-primary uppercase">
                                        {editingData.location} • P{editingData.duration}
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-4">
                                        <button
                                            onClick={() => setEditingData(prev => prev ? ({ ...prev, quantity: Math.max(0, prev.quantity - 1) }) : null)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all font-bold text-xl"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={editingData.quantity}
                                            onChange={(e) => setEditingData(prev => prev ? ({ ...prev, quantity: parseInt(e.target.value) || 0 }) : null)}
                                            className="w-20 h-12 text-center text-xl font-bold bg-slate-50 dark:bg-slate-800 border-2 border-primary/20 rounded-xl focus:border-primary outline-none dark:text-white"
                                        />
                                        <button
                                            onClick={() => setEditingData(prev => prev ? ({ ...prev, quantity: prev.quantity + 1 }) : null)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all font-bold text-xl"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-4 space-y-2">
                                    <button
                                        onClick={handleSaveCFO1}
                                        disabled={isSaving}
                                        className="w-full h-11 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? 'Salvando...' : 'Salvar Alteração'}
                                    </button>
                                    <button
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="w-full h-10 text-slate-500 text-xs font-bold uppercase transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </MainLayout.Content>
        </MainLayout>
    );
};

export default StageQuantityPage;
