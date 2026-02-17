import React, { useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { safeParseISO } from '../utils/dateUtils';

const ComandanteGuardaPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { shifts, holidays } = useShift();

    // Days of the week in Portuguese
    const daysOfWeek = [
        'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'
    ];

    // Helper function to get day of week index (0 = Monday, 6 = Sunday)
    const getDayIndex = (dateStr: string) => {
        const d = safeParseISO(dateStr);
        const day = d.getDay(); // 0 = Sunday, 1 = Monday...
        return day === 0 ? 6 : day - 1; // Map to 0=Mon, 6=Sun
    };

    // Calculate shift counts per person and per day of week
    const shiftStats = useMemo(() => {
        const stats: Record<string, {
            weeklyCounts: number[];
            weekdayTotal: number;
            weekendHolidayTotal: number;
        }> = {};

        // Initialize stats for each military
        militaries.forEach(m => {
            stats[m.id] = {
                weeklyCounts: [0, 0, 0, 0, 0, 0, 0],
                weekdayTotal: 0,
                weekendHolidayTotal: 0
            };
        });

        // Fill stats from shifts of type 'Comandante da Guarda'
        shifts.forEach(s => {
            if (s.type === 'Comandante da Guarda' && stats[s.militaryId]) {
                const dayIdx = getDayIndex(s.date);
                stats[s.militaryId].weeklyCounts[dayIdx]++;

                const isHoliday = holidays.some(h => h.date === s.date);
                const isWeekend = dayIdx === 5 || dayIdx === 6; // Sat or Sun

                if (isHoliday || isWeekend) {
                    stats[s.militaryId].weekendHolidayTotal++;
                } else {
                    stats[s.militaryId].weekdayTotal++;
                }
            }
        });

        return stats;
    }, [militaries, shifts, holidays]);

    // Sort military by rank/name for the table
    const sortedMilitaries = useMemo(() => {
        return [...militaries].sort((a, b) => {
            const aAnt = a.antiguidade || 999999;
            const bAnt = b.antiguidade || 999999;
            if (aAnt !== bAnt) return aAnt - bAnt;
            return a.warName.localeCompare(b.warName);
        });
    }, [militaries]);

    return (
        <MainLayout activePage="comandante-guarda">
            <MainLayout.Content>
                {/* Header Section */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">military_tech</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 capitalize">Comandante da Guarda</h2>
                            <p className="text-xs text-slate-500 font-medium text-wrap max-sm:max-w-40 sm:max-w-full">Relação de serviços por dia da semana</p>
                        </div>
                    </div>
                </div>

                {/* Shisfts Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm">
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 min-w-[200px]">Militar</th>
                                    {daysOfWeek.map(day => (
                                        <th key={day} className="px-4 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-center">
                                            {day}
                                        </th>
                                    ))}
                                    <th className="px-4 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-center bg-blue-50/50 dark:bg-blue-900/20">Dias Semana</th>
                                    <th className="px-4 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-center bg-rose-50/50 dark:bg-rose-900/20">FDS / Feriado</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-center bg-slate-100/50 dark:bg-slate-700/50 font-black">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedMilitaries.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm italic">Nenhum militar encontrado na lista de contatos.</td>
                                    </tr>
                                ) : (
                                    sortedMilitaries.map(mil => {
                                        const stats = shiftStats[mil.id] || { weeklyCounts: [0, 0, 0, 0, 0, 0, 0], weekdayTotal: 0, weekendHolidayTotal: 0 };
                                        const counts = stats.weeklyCounts;
                                        const total = counts.reduce((acc, curr) => acc + curr, 0);

                                        return (
                                            <tr key={mil.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm whitespace-nowrap">{mil.rank} {mil.warName}</span>
                                                        <span className="text-[10px] text-slate-500">{mil.firefighterNumber}</span>
                                                    </div>
                                                </td>
                                                {counts.map((count, idx) => (
                                                    <td key={idx} className="px-4 py-4 border-b border-slate-50 dark:border-slate-800 text-center">
                                                        {count > 0 ? (
                                                            <span className="inline-flex items-center justify-center w-7 h-7 bg-primary/10 text-primary rounded-full text-xs font-bold">
                                                                {count}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 dark:text-slate-700 font-medium text-xs">-</span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-4 border-b border-slate-50 dark:border-slate-800 text-center bg-blue-50/20 dark:bg-blue-900/10">
                                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">{stats.weekdayTotal}</span>
                                                </td>
                                                <td className="px-4 py-4 border-b border-slate-50 dark:border-slate-800 text-center bg-rose-50/20 dark:bg-rose-900/10">
                                                    <span className="text-xs font-black text-rose-600 dark:text-rose-400">{stats.weekendHolidayTotal}</span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 text-center bg-slate-50/30 dark:bg-slate-800/20">
                                                    <span className={`inline-flex items-center justify-center px-2 py-1 ${total > 0 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'} rounded-md text-xs font-black min-w-[28px]`}>
                                                        {total}
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
            </MainLayout.Content>
        </MainLayout>
    );
};

export default ComandanteGuardaPage;
