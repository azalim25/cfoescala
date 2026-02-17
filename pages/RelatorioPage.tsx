import React, { useState, useMemo, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useShift } from '../contexts/ShiftContext';
import { useMilitary } from '../contexts/MilitaryContext';
import { Shift, Military } from '../types';
import { supabase } from '../supabase';
import { safeParseISO } from '../utils/dateUtils';
import { STAGE_LOCATIONS } from '../constants';

const RelatorioPage: React.FC = () => {
    const { shifts } = useShift();
    const { militaries } = useMilitary();
    const [extraStages, setExtraStages] = useState<any[]>([]);
    const [isLoadingStages, setIsLoadingStages] = useState(true);

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const fetchStages = async () => {
        try {
            setIsLoadingStages(true);
            const { data, error } = await supabase.from('stages').select('*');
            if (error) throw error;
            if (data) setExtraStages(data);
        } catch (error) {
            console.error('Error fetching extra stages:', error);
        } finally {
            setIsLoadingStages(false);
        }
    };

    useEffect(() => {
        fetchStages();
    }, []);

    const allRelevantShifts = useMemo(() => {
        // 1. Base shifts from context
        const combined: Shift[] = [...shifts.map(s => ({ ...s, location: s.location || '' }))];

        // 2. Extra stages logic: merge or update location
        extraStages.forEach(es => {
            const cs = {
                id: es.id,
                date: es.date,
                type: 'Estágio' as any,
                militaryId: es.military_id,
                location: es.location || '',
                startTime: es.start_time || '08:00',
                endTime: es.end_time || '20:00',
                status: 'Confirmado' as any
            };

            const existingIndex = combined.findIndex(bs =>
                bs.militaryId === cs.militaryId &&
                bs.date === cs.date &&
                bs.type === 'Estágio'
            );

            if (existingIndex !== -1) {
                // If it exists but has no location, update it
                if (!combined[existingIndex].location && cs.location) {
                    combined[existingIndex].location = cs.location;
                }
            } else {
                combined.push(cs as any);
            }
        });

        // 3. Filter by month/year using safeParseISO
        return combined.filter((s: Shift) => {
            const d = safeParseISO(s.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        }).sort((a, b) => a.date.localeCompare(b.date));
    }, [shifts, extraStages, selectedMonth, selectedYear]);

    const formatMilitaryName = (mil: Military | undefined) => {
        if (!mil) return "Militar não encontrado";

        const fullName = mil.fullName || mil.name;
        const warName = mil.name.toUpperCase();

        const words = fullName.split(' ');
        return (
            <span>
                {words.map((word, idx) => {
                    const cleanWord = word.replace(/[.,]/g, '').toUpperCase();
                    const isWarName = cleanWord === warName;

                    return (
                        <React.Fragment key={idx}>
                            {isWarName ? <strong>{word}</strong> : word}
                            {idx < words.length - 1 ? ' ' : ''}
                        </React.Fragment>
                    );
                })}
            </span>
        );
    };

    const renderShiftTable = (title: string, type: string | string[], filterByLocation?: string) => {
        const typeArray = Array.isArray(type) ? type : [type];
        const isStage = typeArray.includes("Estágio");

        const filteredShifts = allRelevantShifts.filter((s: Shift) => {
            const matchesType = typeArray.includes(s.type);

            const normalize = (v: string | undefined | null) =>
                (v || '').toLowerCase().replace(/º/g, '°').replace(/\s+/g, '');

            const matchesLocation = filterByLocation
                ? normalize(s.location).includes(normalize(filterByLocation))
                : true;
            return matchesType && matchesLocation;
        });

        if (filteredShifts.length === 0) return null;

        const groupedByDate: Record<string, Shift[]> = {};
        filteredShifts.forEach(s => {
            if (!groupedByDate[s.date]) groupedByDate[s.date] = [];
            groupedByDate[s.date].push(s);
        });

        const sortedDates = Object.keys(groupedByDate).sort();

        return (
            <div className={`mb-12 overflow-hidden bg-white dark:bg-slate-900 rounded-xl ${isStage ? 'border-2 border-slate-300 dark:border-slate-700' : 'border border-slate-200 dark:border-slate-800'} shadow-sm`}>
                {!isStage && (
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm tracking-wider">{title}</h3>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className={`w-full text-left border-collapse ${isStage ? 'table-fixed' : ''}`}>
                        <thead>
                            {isStage && (
                                <tr>
                                    <th colSpan={5} className="p-3 bg-slate-50 dark:bg-slate-800 text-center font-bold text-slate-800 dark:text-white border-b-2 border-slate-300 dark:border-slate-700 uppercase tracking-widest text-base">
                                        {title}
                                    </th>
                                </tr>
                            )}
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                <th className={`p-3 border-b border-r ${isStage ? 'border-slate-300 dark:border-slate-700 w-[120px]' : 'border-slate-200 dark:border-slate-800 w-[140px]'}`}>Data</th>
                                <th className={`p-3 border-b border-r ${isStage ? 'border-slate-300 dark:border-slate-700 w-[140px]' : 'border-slate-200 dark:border-slate-800'}`}>Dia da Semana</th>
                                <th className={`p-3 border-b border-r ${isStage ? 'border-slate-300 dark:border-slate-700 w-[120px]' : 'border-slate-200 dark:border-slate-800'}`}>Nº BM</th>
                                <th className={`p-3 border-b border-r ${isStage ? 'border-slate-300 dark:border-slate-700' : 'border-slate-200 dark:border-slate-800'}`}>
                                    {isStage ? 'Cadete - CFO II' : 'Nome Completo'}
                                </th>
                                <th className={`p-3 border-b ${isStage ? 'border-slate-300 dark:border-slate-700 w-[160px]' : 'border-slate-200 dark:border-slate-800'}`}>Telefone</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {sortedDates.map(dateStr => {
                                const shiftsOnDate = groupedByDate[dateStr];
                                return shiftsOnDate.map((s, idx) => {
                                    const mil = militaries.find(m => m.id === s.militaryId);
                                    const dateObj = safeParseISO(s.date);

                                    const fullDate = dateObj.toLocaleDateString('pt-BR');
                                    const dayOfWeekFull = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                                    const formattedDayOfWeek = dayOfWeekFull.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');

                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            {idx === 0 && (
                                                <>
                                                    <td rowSpan={shiftsOnDate.length} className={`p-3 text-sm font-bold text-slate-700 dark:text-slate-300 border-r ${isStage ? 'border-slate-300 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 text-center'}`}>
                                                        {fullDate}
                                                    </td>
                                                    <td rowSpan={shiftsOnDate.length} className={`p-3 text-xs text-slate-600 font-bold border-r ${isStage ? 'border-slate-300 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800'}`}>
                                                        {formattedDayOfWeek}
                                                    </td>
                                                </>
                                            )}
                                            <td className={`p-3 text-xs font-bold text-slate-600 dark:text-slate-400 border-r ${isStage ? 'border-slate-300 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800'}`}>
                                                {mil?.firefighterNumber || '-'}
                                            </td>
                                            <td className={`p-3 text-sm text-slate-800 dark:text-slate-100 border-r ${isStage ? 'border-slate-300 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800'}`}>
                                                {formatMilitaryName(mil)}
                                            </td>
                                            <td className="p-3 text-xs text-slate-600 font-medium">
                                                {mil?.contact || '-'}
                                            </td>
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <MainLayout activePage="relatorio">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
                            <span className="material-symbols-outlined text-3xl">description</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 uppercase tracking-tight">Relatório Mensal de Escalas</h2>
                            <p className="text-xs text-slate-500 font-medium">Visualização resumida por serviço</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-700 dark:hover:bg-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">print</span>
                            Imprimir
                        </button>
                    </div>
                </div>

                <div className="space-y-12">
                    <div className="space-y-6">
                        {renderShiftTable("Comandante da Guarda", "Comandante da Guarda")}
                        {renderShiftTable("Faxina", "Faxina")}
                        {renderShiftTable("Sobreaviso", "Sobreaviso")}
                        {renderShiftTable("Manutenção", "Manutenção")}
                    </div>

                    <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-8 print:hidden">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                                Tabelas de Estágio
                            </h2>
                            {isLoadingStages && (
                                <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    Carregando estágios...
                                </div>
                            )}
                        </div>

                        {renderShiftTable(STAGE_LOCATIONS[0], "Estágio", STAGE_LOCATIONS[0].split(' - ')[0])}
                        {renderShiftTable(STAGE_LOCATIONS[1], "Estágio", STAGE_LOCATIONS[1].split(' - ')[0])}
                        {renderShiftTable(STAGE_LOCATIONS[2], "Estágio", STAGE_LOCATIONS[2].split(' - ')[0])}
                    </div>
                </div>
            </MainLayout.Content>
        </MainLayout>
    );
};

export default RelatorioPage;
