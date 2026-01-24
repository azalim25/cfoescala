import React, { useState } from 'react';
import MainLayout from '../components/MainLayout';
import { useAcademic } from '../contexts/AcademicContext';
import { useAuth } from '../contexts/AuthContext';
import { AcademicSchedule, Discipline, Instructor } from '../types';
import { safeParseISO } from '../utils/dateUtils';

const QtmPage: React.FC = () => {
    const { schedule, disciplines, instructors, addScheduleEntry, updateScheduleEntry, removeScheduleEntry } = useAcademic();
    const { isModerator } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<AcademicSchedule | null>(null);

    const [formData, setFormData] = useState<Omit<AcademicSchedule, 'id'>>({
        date: '',
        startTime: '08:00',
        endTime: '09:40',
        disciplineId: null,
        instructorId: null,
        location: 'ABM',
        description: ''
    });

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentYear(currentYear - 1);
            setCurrentMonth(11);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentYear(currentYear + 1);
            setCurrentMonth(0);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleOpenAddModal = (day: number) => {
        const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        setEditingEntry(null);
        setFormData({
            date: dateStr,
            startTime: '08:00',
            endTime: '09:40',
            disciplineId: disciplines[0]?.id || null,
            instructorId: instructors[0]?.id || null,
            location: 'ABM',
            description: ''
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (entry: AcademicSchedule) => {
        setEditingEntry(entry);
        setFormData({
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            disciplineId: entry.disciplineId,
            instructorId: entry.instructorId,
            location: entry.location || 'ABM',
            description: entry.description || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveEntry = async () => {
        try {
            if (editingEntry) {
                await updateScheduleEntry(editingEntry.id, formData);
            } else {
                await addScheduleEntry(formData);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Erro ao salvar atividade.');
        }
    };

    const handleDeleteEntry = async () => {
        if (editingEntry && confirm('Deseja remover esta atividade?')) {
            await removeScheduleEntry(editingEntry.id);
            setIsModalOpen(false);
        }
    };

    return (
        <MainLayout activePage="qtm">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">event_note</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 uppercase">QTM - Quadro de Trabalho Mensal</h2>
                            <p className="text-xs text-slate-500 font-medium">Janeiro 2026 - Planejamento Acadêmico</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            <span className="px-4 py-2 text-sm font-bold uppercase min-w-[140px] text-center">
                                {months[currentMonth]} {currentYear}
                            </span>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-6">
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r last:border-r-0 border-slate-200 dark:border-slate-800">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {[...Array(getFirstDayOfMonth(currentYear, currentMonth))].map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[120px] border-r border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10"></div>
                        ))}
                        {[...Array(getDaysInMonth(currentYear, currentMonth))].map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const dayActivities = schedule.filter(s => s.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
                            const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

                            return (
                                <div
                                    key={day}
                                    className={`min-h-[120px] p-2 border-r border-b border-slate-100 dark:border-slate-800 transition-all relative ${isToday ? 'bg-primary/5' : 'bg-white dark:bg-slate-900'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-xs font-bold ${isToday ? 'bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-400'}`}>{day}</span>
                                        {isModerator && (
                                            <button
                                                onClick={() => handleOpenAddModal(day)}
                                                className="w-5 h-5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-primary transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-xs">add</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {dayActivities.map(act => {
                                            const discipline = disciplines.find(d => d.id === act.disciplineId);
                                            const instructor = instructors.find(i => i.id === act.instructorId);
                                            return (
                                                <button
                                                    key={act.id}
                                                    onClick={() => isModerator && handleOpenEditModal(act)}
                                                    className="w-full text-left p-1 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 hover:opacity-80 transition-opacity"
                                                >
                                                    <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 mb-0.5">{act.startTime} - {act.endTime}</div>
                                                    <div className="text-[9px] font-bold text-slate-700 dark:text-slate-200 truncate">{discipline?.name || act.description}</div>
                                                    <div className="text-[7px] text-slate-500 truncate">{instructor?.rank} {instructor?.name}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </MainLayout.Content>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">edit_calendar</span>
                                {editingEntry ? 'Editar Atividade' : 'Nova Atividade'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Disciplina</label>
                                <select
                                    value={formData.disciplineId || ''}
                                    onChange={e => setFormData({ ...formData, disciplineId: e.target.value || null })}
                                    className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                >
                                    <option value="">Selecione...</option>
                                    {disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Professor</label>
                                <select
                                    value={formData.instructorId || ''}
                                    onChange={e => setFormData({ ...formData, instructorId: e.target.value || null })}
                                    className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                >
                                    <option value="">Selecione...</option>
                                    {instructors.map(i => <option key={i.id} value={i.id}>{i.rank} {i.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Início</label>
                                    <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Fim</label>
                                    <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Local/Descrição</label>
                                <input type="text" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Ex: Sala 01, ABM" className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                            {editingEntry && (
                                <button onClick={handleDeleteEntry} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm">Excluir</button>
                            )}
                            <button onClick={handleSaveEntry} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-lg shadow-primary/20">Salvar Atividade</button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default QtmPage;
