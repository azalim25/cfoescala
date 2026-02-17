import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { supabase } from '../supabase';
import { SHIFT_TYPE_COLORS } from '../constants';
import { safeParseISO } from '../utils/dateUtils';

interface ExtraHourRecord {
    id: string;
    military_id: string;
    hours: number;
    minutes: number;
    category: string;
    date: string;
}

const RankingPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { shifts } = useShift();
    const [extraHours, setExtraHours] = useState<ExtraHourRecord[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

    const months = [
        { value: '01', label: 'Janeiro' },
        { value: '02', label: 'Fevereiro' },
        { value: '03', label: 'Março' },
        { value: '04', label: 'Abril' },
        { value: '05', label: 'Maio' },
        { value: '06', label: 'Junho' },
        { value: '07', label: 'Julho' },
        { value: '08', label: 'Agosto' },
        { value: '09', label: 'Setembro' },
        { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' },
        { value: '12', label: 'Dezembro' }
    ];

    const toggleMonth = (monthIndex: number) => {
        setSelectedMonths(prev =>
            prev.includes(monthIndex)
                ? prev.filter(m => m !== monthIndex)
                : [...prev, monthIndex].sort((a, b) => a - b)
        );
    };

    const clearFilters = () => setSelectedMonths([]);

    const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>([]);
    const [selectedExtraCategories, setSelectedExtraCategories] = useState<string[]>([]);

    const allShiftTypes = useMemo(() =>
        Object.keys(SHIFT_TYPE_COLORS).filter(type => !['Escala Geral', 'Escala Diversa'].includes(type)),
        []);
    const allExtraCategories = [
        'CFO I - Sentinela',
        'CFO I - Acumulado',
        'CFO II - Registro de Horas'
    ];

    useEffect(() => {
        setSelectedShiftTypes(allShiftTypes);
        setSelectedExtraCategories(allExtraCategories);
    }, [allShiftTypes]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [extraRes, stageRes] = await Promise.all([
                supabase.from('extra_hours').select('*'),
                supabase.from('stages').select('*')
            ]);
            if (extraRes.data) setExtraHours(extraRes.data);
            if (stageRes.data) setStages(stageRes.data);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const rankingData = useMemo(() => {
        const filteredShifts = selectedMonths.length === 0
            ? shifts
            : shifts.filter(s => {
                const shiftMonth = safeParseISO(s.date).getMonth();
                return selectedMonths.includes(shiftMonth);
            });

        const filteredExtraHours = selectedMonths.length === 0
            ? extraHours
            : extraHours.filter(e => {
                const extraMonth = safeParseISO(e.date || '').getMonth();
                return selectedMonths.includes(extraMonth);
            });

        const filteredStages = selectedMonths.length === 0
            ? stages
            : stages.filter(st => {
                const stageMonth = safeParseISO(st.date).getMonth();
                return selectedMonths.includes(stageMonth);
            });

        return militaries.map(mil => {
            let totalHours = 0;
            const separateCounts: Record<string, number> = {
                'Sobreaviso': 0,
                'Faxina': 0,
                'Manutenção': 0,
                'Barra': 0
            };

            const milShifts = filteredShifts.filter(s => s.militaryId === mil.id);
            milShifts.forEach(s => {
                if (!selectedShiftTypes.includes(s.type)) return;

                const date = safeParseISO(s.date);
                const dayOfWeek = date.getDay();

                if (s.duration) {
                    totalHours += s.duration;
                } else if (s.type === 'Comandante da Guarda') {
                    if (dayOfWeek >= 1 && dayOfWeek <= 5) totalHours += 11;
                    else totalHours += 24;
                } else if (s.type === 'Estágio') {
                    if (dayOfWeek === 6) totalHours += 24;
                    else if (dayOfWeek === 0) totalHours += 12;
                } else if (['Sobreaviso', 'Faxina', 'Manutenção', 'Barra'].includes(s.type)) {
                    separateCounts[s.type] = (separateCounts[s.type] || 0) + 1;
                }
            });

            const milExtra = filteredExtraHours.filter(e => e.military_id === mil.id);
            milExtra.forEach(e => {
                if (selectedExtraCategories.includes(e.category)) {
                    totalHours += e.hours + (e.minutes / 60);
                }
            });

            // Add standalone stages hours if not already counted via shifts
            if (selectedShiftTypes.includes('Estágio')) {
                const milStages = filteredStages.filter(st =>
                    st.military_id === mil.id &&
                    !filteredShifts.some(sh => sh.militaryId === st.military_id && sh.date === st.date && sh.type === 'Estágio')
                );
                milStages.forEach(st => {
                    if (st.start_time && st.end_time) {
                        const [h1, m1] = st.start_time.split(':').map(Number);
                        const [h2, m2] = st.end_time.split(':').map(Number);
                        let totalMinutes = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
                        if (totalMinutes <= 0) totalMinutes += 24 * 60;
                        totalHours += totalMinutes / 60;
                    } else {
                        const date = safeParseISO(st.date);
                        const dayOfWeek = date.getDay();
                        if (dayOfWeek === 6) totalHours += 24;
                        else if (dayOfWeek === 0) totalHours += 12;
                        else totalHours += 12;
                    }
                });
            }

            return {
                ...mil,
                totalHours,
                separateCounts
            };
        }).sort((a, b) => b.totalHours - a.totalHours);
    }, [militaries, shifts, extraHours, stages, selectedShiftTypes, selectedExtraCategories, selectedMonths]);

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
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Ranking de Horas</h1>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium uppercase tracking-wider">Classificação do efetivo por horas trabalhadas e acumuladas.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meses:</span>
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {selectedMonths.length === 0 ? (
                                        <span className="text-[10px] font-black text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">TODOS</span>
                                    ) : (
                                        selectedMonths.map(m => (
                                            <span key={m} className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800 whitespace-nowrap">
                                                {months[m].label.substring(0, 3).toUpperCase()}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="relative group">
                                <button className="h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-slate-500 text-sm">filter_list</span>
                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Filtrar Mês</span>
                                </button>

                                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <div className="grid grid-cols-2 gap-2">
                                        {months.map((m, idx) => (
                                            <button
                                                key={m.value}
                                                onClick={() => toggleMonth(idx)}
                                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedMonths.includes(idx)
                                                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-700'
                                                    }`}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedMonths.length > 0 && (
                                        <button
                                            onClick={clearFilters}
                                            className="w-full mt-4 py-2 text-[10px] font-black text-rose-500 uppercase border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-100 transition-colors"
                                        >
                                            Limpar Filtros
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipos de Escala</label>
                            <div className="flex flex-wrap gap-2">
                                {allShiftTypes.map(type => {
                                    const isSelected = selectedShiftTypes.includes(type);
                                    const colors = SHIFT_TYPE_COLORS[type] || SHIFT_TYPE_COLORS['Escala Geral'];
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => toggleShiftType(type)}
                                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all border ${isSelected
                                                ? `${colors.bg} ${colors.text} ${colors.border} ring-1 ring-offset-1 ring-primary/20`
                                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 grayscale opacity-60'}`}
                                        >
                                            {type}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Horas Extras</label>
                            <div className="flex flex-wrap gap-2">
                                {allExtraCategories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => toggleExtraCategory(cat)}
                                        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all border ${selectedExtraCategories.includes(cat)
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-offset-1 ring-emerald-500/20'
                                            : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 opacity-60'}`}
                                    >
                                        <span className="material-symbols-outlined text-[10px] mr-1 align-middle">more_time</span>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:hidden grid grid-cols-1 mb-6 text-center">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[10px] text-slate-500 uppercase font-black block mb-1">Média p/ Mil</span>
                        <span className="text-xl font-black text-slate-800 dark:text-white">
                            {(rankingData.length > 0 ? rankingData.reduce((acc, curr) => acc + curr.totalHours, 0) / rankingData.length : 0).toFixed(1)}h
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 w-16 text-center">#</th>
                                    <th className="px-6 py-4">Militar</th>
                                    <th className="px-4 py-4 text-center">Sobreaviso</th>
                                    <th className="px-4 py-4 text-center">Faxina</th>
                                    <th className="px-4 py-4 text-center">Manutenção</th>
                                    <th className="px-4 py-4 text-center">Barra</th>
                                    <th className="px-6 py-4 text-right">Média p/ Militar</th>
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
                                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{mil.rank} {mil.warName}</h3>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{mil.battalion} • {mil.firefighterNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {mil.separateCounts['Sobreaviso'] > 0 && (
                                                <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-bold border border-amber-100">
                                                    {mil.separateCounts['Sobreaviso']}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {mil.separateCounts['Faxina'] > 0 && (
                                                <span className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs font-bold border border-cyan-100">
                                                    {mil.separateCounts['Faxina']}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {mil.separateCounts['Manutenção'] > 0 && (
                                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold border border-emerald-100">
                                                    {mil.separateCounts['Manutenção']}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {mil.separateCounts['Barra'] > 0 && (
                                                <span className="px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs font-bold border border-pink-100">
                                                    {mil.separateCounts['Barra']}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex flex-col items-end">
                                                <span className="text-lg font-black text-primary font-mono tabular-nums">
                                                    {mil.totalHours.toFixed(1)}h
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {rankingData.map((mil, index) => (
                            <div key={mil.id} className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                                            <span className="material-symbols-outlined text-xl">person</span>
                                        </div>
                                        <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border shadow-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                            index === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                                index === 2 ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                    'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                                            }`}>
                                            {index + 1}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{mil.rank} {mil.warName.split(' ')[0]}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {mil.separateCounts['Sobreaviso'] > 0 && (
                                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1 rounded">S:{mil.separateCounts['Sobreaviso']}</span>
                                            )}
                                            {mil.separateCounts['Faxina'] > 0 && (
                                                <span className="text-[9px] font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 px-1 rounded">F:{mil.separateCounts['Faxina']}</span>
                                            )}
                                            {mil.separateCounts['Manutenção'] > 0 && (
                                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1 rounded">M:{mil.separateCounts['Manutenção']}</span>
                                            )}
                                            {mil.separateCounts['Barra'] > 0 && (
                                                <span className="text-[9px] font-bold text-pink-600 bg-pink-50 dark:bg-pink-900/20 px-1 rounded">B:{mil.separateCounts['Barra']}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-base font-black text-primary font-mono leading-none">
                                        {mil.totalHours.toFixed(1)}h
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </MainLayout.Content>
            <MainLayout.Sidebar>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sticky top-20">
                    <h2 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-sm mb-4">Resumo</h2>
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Média por Militar</span>
                            <span className="text-2xl font-black text-slate-800 dark:text-white">
                                {(rankingData.length > 0 ? rankingData.reduce((acc, curr) => acc + curr.totalHours, 0) / rankingData.length : 0).toFixed(1)}h
                            </span>
                        </div>
                    </div>
                </div>
            </MainLayout.Sidebar>
        </MainLayout >
    );
};

export default RankingPage;
