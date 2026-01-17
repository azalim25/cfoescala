import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { supabase } from '../supabase';
import { SHIFT_TYPE_COLORS } from '../constants';

interface ExtraHourRecord {
    id: string;
    military_id: string;
    hours: number;
    minutes: number;
    category: string;
}

const RankingPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { shifts } = useShift();
    const [extraHours, setExtraHours] = useState<ExtraHourRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>([]);
    const [selectedExtraHighCategories, setSelectedExtraCategories] = useState<string[]>([]);

    const allShiftTypes = useMemo(() => Object.keys(SHIFT_TYPE_COLORS), []);
    const allExtraCategories = [
        'CFO I - Sentinela',
        'CFO I - Acumulado',
        'CFO II - Registro de Horas'
    ];

    useEffect(() => {
        // Initialize filters with all selected
        setSelectedShiftTypes(allShiftTypes);
        setSelectedExtraCategories(allExtraCategories);
    }, [allShiftTypes]);

    useEffect(() => {
        const fetchExtraHours = async () => {
            setIsLoading(true);
            const { data } = await supabase.from('extra_hours').select('*');
            if (data) setExtraHours(data);
            setIsLoading(false);
        };
        fetchExtraHours();
    }, []);

    const calculateShiftDuration = (start: string, end: string) => {
        if (!start || !end) return 0;
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
        if (diff <= 0) diff += 24;
        return diff;
    };

    const rankingData = useMemo(() => {
        return militaries.map(mil => {
            let totalHours = 0;

            // 1. Calculate Shift Hours
            const milShifts = shifts.filter(s => s.militaryId === mil.id);
            milShifts.forEach(s => {
                if (selectedShiftTypes.includes(s.type)) {
                    totalHours += calculateShiftDuration(s.startTime, s.endTime);
                }
            });

            // 2. Calculate Extra Hours
            const milExtra = extraHours.filter(e => e.military_id === mil.id);
            milExtra.forEach(e => {
                if (selectedExtraHighCategories.includes(e.category)) {
                    totalHours += e.hours + (e.minutes / 60);
                }
            });

            return {
                ...mil,
                totalHours
            };
        }).sort((a, b) => b.totalHours - a.totalHours);
    }, [militaries, shifts, extraHours, selectedShiftTypes, selectedExtraHighCategories]);

    const toggleShiftType = (type: string) => {
        setSelectedShiftTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const toggleExtraCategory = (cat: string) => {
        setSelectedExtraCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    return (
        <MainLayout activePage="ranking">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ranking de Horas</h1>
                    <p className="text-sm text-slate-500">Classificação do efetivo por horas trabalhadas e acumuladas.</p>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Filter: Shift Types */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipos de Escala</label>
                            <div className="flex flex-wrap gap-2">
                                {/* "Select All" Logic could be added, but manual toggles are fine for now */}
                                {allShiftTypes.map(type => {
                                    const isSelected = selectedShiftTypes.includes(type);
                                    const colors = SHIFT_TYPE_COLORS[type] || SHIFT_TYPE_COLORS['Escala Geral'];
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => toggleShiftType(type)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected
                                                ? `${colors.bg} ${colors.text} ${colors.border} ring-1 ring-offset-1 ring-primary/20`
                                                : 'bg-slate-50 text-slate-400 border-slate-200 grayscale opacity-60'}`}
                                        >
                                            {type}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Filter: Extra Hours */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Horas Extras</label>
                            <div className="flex flex-wrap gap-2">
                                {allExtraCategories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => toggleExtraCategory(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedExtraHighCategories.includes(cat)
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-offset-1 ring-emerald-500/20'
                                            : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'}`}
                                    >
                                        <span className="material-symbols-outlined text-[10px] mr-1 align-middle">more_time</span>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center">#</th>
                                <th className="px-6 py-4">Militar</th>
                                <th className="px-6 py-4 text-right">Total de Horas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {rankingData.map((mil, index) => (
                                <tr key={mil.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                index === 1 ? 'bg-slate-100 text-slate-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-800' :
                                                        'text-slate-500'
                                            }`}>
                                            {index + 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                                                <span className="material-symbols-outlined">person</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{mil.rank} {mil.name}</h3>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">{mil.battalion} • {mil.firefighterNumber}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex flex-col items-end">
                                            <span className="text-lg font-black text-primary font-mono tabular-nums">
                                                {Math.floor(mil.totalHours)}h {(mil.totalHours % 1 * 60).toFixed(0).padStart(2, '0')}m
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {mil.totalHours.toFixed(1)}h
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </MainLayout.Content>
            <MainLayout.Sidebar>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sticky top-20">
                    <h2 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-sm mb-4">Resumo</h2>
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Total Geral de Horas</span>
                            <span className="text-2xl font-black text-slate-800 dark:text-white">
                                {rankingData.reduce((acc, curr) => acc + curr.totalHours, 0).toFixed(0)}h
                            </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Média por Militar</span>
                            <span className="text-2xl font-black text-slate-800 dark:text-white">
                                {(rankingData.length > 0 ? rankingData.reduce((acc, curr) => acc + curr.totalHours, 0) / rankingData.length : 0).toFixed(1)}h
                            </span>
                        </div>
                    </div>
                </div>
            </MainLayout.Sidebar>
        </MainLayout>
    );
};

export default RankingPage;
