import React, { useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { SHIFT_TYPE_COLORS } from '../constants';
import { safeParseISO } from '../utils/dateUtils';
import { Shift } from '../types';

const BarraFixaPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { shifts } = useShift();

    // Filter shifts of type 'Barra'
    const barraShifts = useMemo(() => {
        return shifts
            .filter(s => s.type === 'Barra')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [shifts]);

    // Group by date and then by time
    const groupedShifts = useMemo(() => {
        const groups: Record<string, Record<string, Shift[]>> = {};
        barraShifts.forEach(s => {
            if (!groups[s.date]) groups[s.date] = {};
            if (!groups[s.date][s.startTime]) groups[s.date][s.startTime] = [];
            groups[s.date][s.startTime].push(s);
        });

        // Sort each time slot by military seniority
        Object.keys(groups).forEach(date => {
            Object.keys(groups[date]).forEach(time => {
                groups[date][time].sort((a, b) => {
                    const milA = militaries.find(m => m.id === a.militaryId);
                    const milB = militaries.find(m => m.id === b.militaryId);
                    const antA = milA?.antiguidade ?? 999999;
                    const antB = milB?.antiguidade ?? 999999;
                    if (antA !== antB) return antA - antB;
                    return (milA?.name || "").localeCompare(milB?.name || "");
                });
            });
        });

        return groups;
    }, [barraShifts, militaries]);

    const sortedDates = useMemo(() => {
        return Object.keys(groupedShifts).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    }, [groupedShifts]);

    return (
        <MainLayout activePage="barra-fixa">
            <MainLayout.Content>
                {/* Header Section */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center text-pink-600 dark:text-pink-400">
                            <span className="material-symbols-outlined text-2xl">fitness_center</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 capitalize">Barra Fixa</h2>
                            <p className="text-xs text-slate-500 font-medium text-wrap max-sm:max-w-40 sm:max-w-full">Escala de treinamento físico (Barra)</p>
                        </div>
                    </div>
                </div>

                {/* Shifts List grouped by day */}
                <div className="space-y-6">
                    {sortedDates.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">event_busy</span>
                            <p className="text-slate-500 italic">Nenhuma escala de barra registrada.</p>
                        </div>
                    ) : (
                        sortedDates.map(date => {
                            const dateObj = safeParseISO(date);
                            const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                            const dayNum = dateObj.getDate().toString().padStart(2, '0');
                            const month = dateObj.toLocaleDateString('pt-BR', { month: 'long' });

                            return (
                                <div key={date} className="space-y-6 bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-1.5 h-6 bg-pink-500 rounded-full"></div>
                                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                            {dayOfWeek}, {dayNum} de {month}
                                        </h3>
                                    </div>

                                    <div className="space-y-8 pl-2">
                                        {Object.keys(groupedShifts[date]).sort().map(time => (
                                            <div key={time} className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center justify-center px-3 py-1 bg-pink-500 text-white text-[11px] font-black rounded-lg shadow-sm shadow-pink-200 dark:shadow-none">
                                                        {time}
                                                    </span>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-pink-200 to-transparent dark:from-pink-900/50"></div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {groupedShifts[date][time].map(s => {
                                                        const military = militaries.find(m => m.id === s.militaryId);

                                                        return (
                                                            <div
                                                                key={s.id}
                                                                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                                                            >
                                                                <div className="flex items-center gap-4 relative z-10">
                                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                                                        <span className="material-symbols-outlined">person</span>
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                                                                            {military?.rank} {military?.name}
                                                                        </h4>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                                                BM: {military?.firefighterNumber}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute top-0 right-0 w-1 h-full bg-pink-500/50 group-hover:bg-pink-500 transition-colors"></div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </MainLayout.Content>
        </MainLayout>
    );
};

export default BarraFixaPage;
