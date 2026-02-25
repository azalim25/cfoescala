import React, { useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useAcademic } from '../contexts/AcademicContext';
import { safeParseISO } from '../utils/dateUtils';
import { AcademicSchedule } from '../types';

const ExamsPage: React.FC = () => {
    const { schedule, disciplines, isLoading } = useAcademic();

    const mergedExams = useMemo(() => {
        // Filter only exams
        const exams = schedule.filter(s => s.description === 'PROVA');

        // Group by date
        const groupedByDate: Record<string, AcademicSchedule[]> = {};
        exams.forEach(exam => {
            if (!groupedByDate[exam.date]) {
                groupedByDate[exam.date] = [];
            }
            groupedByDate[exam.date].push(exam);
        });

        const result: (AcademicSchedule & { displayDate: Date })[] = [];

        Object.keys(groupedByDate).forEach(date => {
            const dayExams = groupedByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));

            if (dayExams.length === 0) return;

            let currentMerged: AcademicSchedule & { displayDate: Date } = {
                ...dayExams[0],
                displayDate: safeParseISO(dayExams[0].date)
            };

            for (let i = 1; i < dayExams.length; i++) {
                const next = dayExams[i];
                // If they are for the same discipline, merge them
                // We consider them part of the same exam if they are on the same day and have the same disciplineId
                if (next.disciplineId === currentMerged.disciplineId) {
                    currentMerged.endTime = next.endTime;
                    // Join description if they are different (e.g. "PROVA" and "PROVA PRÁTICA" - though filtering is usually just "PROVA")
                } else {
                    result.push(currentMerged);
                    currentMerged = {
                        ...next,
                        displayDate: safeParseISO(next.date)
                    };
                }
            }
            result.push(currentMerged);
        });

        // Sort final list by date
        return result.sort((a, b) => a.date.localeCompare(b.date));
    }, [schedule]);

    const upcomingExams = useMemo(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });

        return mergedExams.filter(e => {
            if (e.date > today) return true;
            if (e.date === today) {
                return e.endTime.slice(0, 5) > currentTime;
            }
            return false;
        });
    }, [mergedExams]);

    const pastExams = useMemo(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });

        return mergedExams.filter(e => {
            if (e.date < today) return true;
            if (e.date === today) {
                return e.endTime.slice(0, 5) <= currentTime;
            }
            return false;
        }).reverse();
    }, [mergedExams]);

    if (isLoading) {
        return (
            <MainLayout activePage="provas">
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout activePage="provas">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400">
                            <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Cronograma de Provas</h1>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium tracking-wide">Acompanhe as avaliações teóricas e práticas marcadas.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Próximas Provas */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Próximas Avaliações</h2>
                        </div>

                        {upcomingExams.length === 0 ? (
                            <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-3">event_busy</span>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma prova agendada para os próximos dias</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {upcomingExams.map(exam => {
                                    const discipline = disciplines.find(d => d.id === exam.disciplineId);
                                    return (
                                        <div key={exam.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-pink-300 dark:hover:border-pink-900 transition-all p-5 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3">
                                                <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${exam.examType === 'Prática' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                    {exam.examType || 'Teórica'}
                                                </span>
                                            </div>

                                            <div className="flex flex-col h-full">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="text-center bg-slate-50 dark:bg-slate-800 rounded-lg p-2 min-w-[50px] border border-slate-100 dark:border-slate-700">
                                                        <span className="block text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{exam.displayDate.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                                        <span className="block text-xl font-black text-slate-800 dark:text-white leading-none tracking-tighter">{exam.displayDate.getDate()}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">
                                                            {exam.displayDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
                                                        </p>
                                                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                            {exam.startTime.slice(0, 5)} - {exam.endTime.slice(0, 5)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <h3 className="font-bold text-slate-800 dark:text-white leading-tight mb-4 flex-grow group-hover:text-pink-600 transition-colors">
                                                    {discipline?.name || 'Avaliação'}
                                                </h3>

                                                <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4 mt-auto">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-slate-300 text-sm">location_on</span>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[120px]">{exam.location || 'ABM'}</span>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Provas Realizadas */}
                    {pastExams.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4 px-1 opacity-50">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Avaliações Realizadas</h2>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {pastExams.map(exam => {
                                        const discipline = disciplines.find(d => d.id === exam.disciplineId);
                                        return (
                                            <div key={exam.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center opacity-50 grayscale scale-90">
                                                        <span className="block text-[8px] font-black text-slate-400 uppercase">{exam.displayDate.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                                        <span className="block text-lg font-black text-slate-600">{exam.displayDate.getDate()}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{discipline?.name || 'Avaliação'}</h4>
                                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                                                            {exam.examType || 'Teórica'} • {exam.displayDate.getFullYear()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </MainLayout.Content>

            <MainLayout.Sidebar>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sticky top-20">
                    <h3 className="font-bold text-slate-800 dark:text-white uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">info</span>
                        Resumo
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-pink-50 dark:bg-pink-900/10 rounded-xl border border-pink-100 dark:border-pink-900/30">
                            <p className="text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest mb-1">Total Agendadas</p>
                            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{upcomingExams.length}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Realizadas</p>
                            <p className="text-3xl font-black text-slate-700 dark:text-slate-300 tracking-tighter">{pastExams.length}</p>
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                            As avaliações são registradas pelo comando no QTM e sincronizadas automaticamente nesta página.
                        </p>
                    </div>
                </div>
            </MainLayout.Sidebar>
        </MainLayout>
    );
};

export default ExamsPage;
