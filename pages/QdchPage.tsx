import React, { useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useAcademic } from '../contexts/AcademicContext';
import { Discipline, AcademicSchedule } from '../types';

const QdchPage: React.FC = () => {
    const { disciplines, schedule, isLoading } = useAcademic();

    const calculateHours = (start: string, end: string) => {
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        return totalMinutes / 60;
    };

    const stats = useMemo(() => {
        return disciplines.map(disc => {
            const completedMinutes = schedule
                .filter(s => s.disciplineId === disc.id)
                .reduce((acc, s) => {
                    const [h1, m1] = s.startTime.split(':').map(Number);
                    const [h2, m2] = s.endTime.split(':').map(Number);
                    return acc + ((h2 * 60 + m2) - (h1 * 60 + m1));
                }, 0);

            const completedHours = completedMinutes / 60;
            const remainingHours = Math.max(0, disc.totalHours - completedHours);
            const percentage = disc.totalHours > 0 ? (completedHours / disc.totalHours) * 100 : 0;

            return {
                ...disc,
                completedHours,
                remainingHours,
                percentage
            };
        });
    }, [disciplines, schedule]);

    const totalPrevista = disciplines.reduce((acc, d) => acc + d.totalHours, 0);
    const totalCumprida = stats.reduce((acc, s) => acc + s.completedHours, 0);
    const totalPercentage = totalPrevista > 0 ? (totalCumprida / totalPrevista) * 100 : 0;

    return (
        <MainLayout activePage="qdch">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">monitoring</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 uppercase">QDCH - Quadro de Distribuição de Carga Horária</h2>
                            <p className="text-xs text-slate-500 font-medium">Acompanhamento de Execução do Curso</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">C.H. Total Prevista</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white">{totalPrevista}h</h3>
                        <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-400 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">C.H. Total Cumprida</p>
                        <h3 className="text-2xl font-black text-primary">{totalCumprida.toFixed(1)}h</h3>
                        <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${totalPercentage}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Progresso Geral</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white">{totalPercentage.toFixed(1)}%</h3>
                        <div className="mt-4 flex items-center gap-1">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className={`h-2 flex-1 rounded-sm ${i < totalPercentage / 10 ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">Disciplina</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center">Prevista</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center">Cumprida</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center">Restante</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">Progresso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {stats.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{s.name}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold">{s.category || 'Geral'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{s.totalHours}h</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-black text-primary">{s.completedHours.toFixed(1)}h</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-slate-500">{s.remainingHours.toFixed(1)}h</span>
                                        </td>
                                        <td className="px-6 py-4 min-w-[200px]">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${s.percentage >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                                                        style={{ width: `${Math.min(100, s.percentage)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 w-10 text-right">{s.percentage.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </MainLayout.Content>
        </MainLayout>
    );
};

export default QdchPage;
